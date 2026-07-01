"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { ensureOrganizationSynced } from "@/actions/organizations";
import { generateAssetContent, generateAssetDraftContents } from "@/lib/ai/generate-asset";
import { isOpenAiConfigured } from "@/lib/ai/config";
import { getSocialAssetTemplate } from "@/lib/assets/social-templates";
import { writeAssetToCampaignKnowledge } from "@/lib/campaign-knowledge/asset-sync";
import { canApproveAssets } from "@/lib/auth/permissions";
import {
  createAsset,
  getAssetById,
  listAssets,
  updateAsset,
} from "@/lib/db/assets";
import {
  getCampaignByOrganizationId,
  getCampaignProfile,
  listGraphNodes,
} from "@/lib/db/campaigns";
import {
  complianceStatusForAssetType,
  createComplianceRecordForAsset,
  updateComplianceRecordForAsset,
} from "@/lib/db/compliance";
import { linkAssetToCampaignGraph } from "@/lib/db/graph";
import { getOrganizationIntegration } from "@/lib/db/integrations";
import {
  generateFromCanvaTemplate,
  generateFromHiggsfieldTemplate,
} from "@/lib/integrations/providers/template-generation";
import { isIntegrationsDemoMode } from "@/lib/integrations/token-crypto";
import { campaignDisplayName } from "@/lib/db/schema";
import { getMemberRoleForUser } from "@/lib/db/members";
import { getUserByClerkId } from "@/lib/db/users";
import type { AssetGenerationOutput } from "@/lib/ai/schemas/asset";
import {
  createAssetSchema,
  defaultChannelForAssetType,
  generateAssetRequestSchema,
  updateAssetSchema,
  type AssetType,
  type GenerateAssetRequest,
  type ListAssetsFilter,
  type M7AssetType,
} from "@/lib/validators/assets";

export type AssetActionResult =
  | { ok: true; assetId: string }
  | {
      ok: false;
      error: string;
      code?:
        | "missing_org"
        | "missing_campaign"
        | "missing_openai"
        | "unauthorized"
        | "forbidden"
        | "not_found"
        | "validation"
        | "integration_not_connected"
        | "generation_failed";
    };

type AssetActionCode = Exclude<
  Extract<AssetActionResult, { ok: false }>["code"],
  undefined
>;

type AssetContext =
  | {
      ok: false;
      error: string;
      code: AssetActionCode;
    }
  | {
      ok: true;
      campaign: NonNullable<
        Awaited<ReturnType<typeof getCampaignByOrganizationId>>
      >;
      profile: Awaited<ReturnType<typeof getCampaignProfile>>;
      userId: string | null;
      dbUserId: string | null;
      role: Awaited<ReturnType<typeof getMemberRoleForUser>>;
    };

async function requireAssetContext(): Promise<AssetContext> {
  const { userId, orgId } = await auth();

  if (!userId) {
    return { ok: false, error: "Sign in required", code: "unauthorized" };
  }

  if (!orgId) {
    return {
      ok: false,
      error: "Select or create a campaign organization to continue.",
      code: "missing_org",
    };
  }

  const sync = await ensureOrganizationSynced();
  if (!sync.ok || !sync.organizationId) {
    return {
      ok: false,
      error: "Could not sync your organization. Try again in a moment.",
      code: "missing_org",
    };
  }

  const campaign = await getCampaignByOrganizationId(sync.organizationId);
  if (!campaign) {
    return {
      ok: false,
      error: "Complete onboarding before using Asset Studio.",
      code: "missing_campaign",
    };
  }

  const profile = await getCampaignProfile(campaign.id);
  const dbUser = await getUserByClerkId(userId);
  const role = dbUser
    ? await getMemberRoleForUser(sync.organizationId, dbUser.id)
    : null;

  return {
    ok: true,
    campaign,
    profile,
    userId,
    dbUserId: dbUser?.id ?? null,
    role,
  };
}

async function finalizeNewAsset(input: {
  campaignId: string;
  candidateName: string;
  assetId: string;
  assetTitle: string;
  assetType: AssetType;
  aiGenerated: boolean;
  channel?: string | null;
  theme?: string | null;
  issue?: string | null;
  templateUsed?: string | null;
}) {
  await createComplianceRecordForAsset({
    campaignId: input.campaignId,
    relatedAssetId: input.assetId,
    contentType: input.assetType,
    aiGenerated: input.aiGenerated,
    distributionChannel: input.channel ?? undefined,
    reviewStatus: complianceStatusForAssetType(
      input.assetType,
      input.aiGenerated,
    ),
  });

  const existingNodes = await listGraphNodes(input.campaignId);
  await linkAssetToCampaignGraph({
    campaignId: input.campaignId,
    assetId: input.assetId,
    assetTitle: input.assetTitle,
    assetType: input.assetType,
    channel: input.channel,
    theme: input.theme,
    issue: input.issue,
    templateUsed: input.templateUsed,
    candidateName: input.candidateName,
    existingNodes,
  });
}

export async function getAssetsForCampaign(
  filters?: Omit<ListAssetsFilter, "campaignId">,
) {
  const context = await requireAssetContext();
  if (!context.ok) {
    return { ok: false as const, error: context.error, assets: [] };
  }

  const assets = await listAssets({
    campaignId: context.campaign.id,
    ...filters,
  });

  return {
    ok: true as const,
    assets,
    canApprove: context.role ? canApproveAssets(context.role) : false,
    openAiConfigured: isOpenAiConfigured(),
  };
}

export async function createAssetManual(input: {
  assetType: M7AssetType;
  title: string;
  contentText: string;
  description?: string;
  theme?: string;
  issue?: string;
  channel?: string;
}): Promise<AssetActionResult> {
  const context = await requireAssetContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const parsed = createAssetSchema.safeParse({
    campaignId: context.campaign.id,
    assetType: input.assetType,
    title: input.title,
    contentText: input.contentText,
    description: input.description,
    theme: input.theme,
    issue: input.issue,
    channel: input.channel ?? defaultChannelForAssetType(input.assetType),
    status: "draft",
    aiGenerated: false,
    createdBy: context.dbUserId,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid asset data",
      code: "validation",
    };
  }

  try {
    const result = await createAsset(parsed.data);
    if (!result.asset) {
      return {
        ok: false,
        error: "Database is not configured. Asset was not saved.",
        code: "missing_campaign",
      };
    }

    await finalizeNewAsset({
      campaignId: context.campaign.id,
      candidateName: campaignDisplayName(context.campaign),
      assetId: result.asset.id,
      assetTitle: result.asset.title,
      assetType: parsed.data.assetType,
      aiGenerated: false,
      channel: parsed.data.channel,
      theme: parsed.data.theme,
      issue: parsed.data.issue,
    });

    revalidatePath("/assets");
    revalidatePath("/brain");
    revalidatePath("/dashboard");

    return { ok: true, assetId: result.asset.id };
  } catch (error) {
    console.error("[createAssetManual]", error);
    return {
      ok: false,
      error: "Failed to create asset. Please try again.",
    };
  }
}

export async function generateAsset(
  request: GenerateAssetRequest,
): Promise<AssetActionResult> {
  const context = await requireAssetContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  if (!isOpenAiConfigured()) {
    return {
      ok: false,
      error:
        "OpenAI is not configured. Add OPENAI_API_KEY to generate assets with AI.",
      code: "missing_openai",
    };
  }

  const parsedRequest = generateAssetRequestSchema.safeParse(request);
  if (!parsedRequest.success) {
    return {
      ok: false,
      error: parsedRequest.error.issues[0]?.message ?? "Invalid request",
      code: "validation",
    };
  }

  try {
    const generated = await generateAssetContent({
      campaign: context.campaign,
      profile: context.profile,
      campaignId: context.campaign.id,
      userId: context.dbUserId,
      request: parsedRequest.data,
    });

    const assetType = parsedRequest.data.assetType;
    const channel =
      generated.channel ??
      parsedRequest.data.channel ??
      defaultChannelForAssetType(assetType);

    const assetInput = createAssetSchema.parse({
      campaignId: context.campaign.id,
      assetType,
      title: generated.title,
      contentText: generated.content,
      theme: generated.theme ?? parsedRequest.data.theme,
      issue: generated.issue ?? parsedRequest.data.issue,
      channel,
      status: "draft",
      aiGenerated: true,
      createdBy: context.dbUserId,
    });

    const result = await createAsset(assetInput);
    if (!result.asset) {
      return {
        ok: false,
        error: "Database is not configured. Asset was not saved.",
        code: "missing_campaign",
      };
    }

    await finalizeNewAsset({
      campaignId: context.campaign.id,
      candidateName: campaignDisplayName(context.campaign),
      assetId: result.asset.id,
      assetTitle: result.asset.title,
      assetType,
      aiGenerated: true,
      channel,
      theme: generated.theme ?? parsedRequest.data.theme,
      issue: generated.issue ?? parsedRequest.data.issue,
      templateUsed: parsedRequest.data.templateId ?? null,
    });

    revalidatePath("/assets");
    revalidatePath("/brain");
    revalidatePath("/dashboard");

    return { ok: true, assetId: result.asset.id };
  } catch (error) {
    console.error("[generateAsset]", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Asset generation failed. Please try again.",
      code: "generation_failed",
    };
  }
}

export type AssetDraftPreviewResult =
  | { ok: true; drafts: AssetGenerationOutput[] }
  | {
      ok: false;
      error: string;
      code?: "missing_openai" | "validation" | "generation_failed";
    };

export async function previewAssetDrafts(
  request: GenerateAssetRequest,
): Promise<AssetDraftPreviewResult> {
  const context = await requireAssetContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: "validation" };
  }

  if (!isOpenAiConfigured()) {
    return {
      ok: false,
      error:
        "OpenAI is not configured. Add OPENAI_API_KEY to generate assets with AI.",
      code: "missing_openai",
    };
  }

  const parsedRequest = generateAssetRequestSchema.safeParse(request);
  if (!parsedRequest.success) {
    return {
      ok: false,
      error: parsedRequest.error.issues[0]?.message ?? "Invalid request",
      code: "validation",
    };
  }

  try {
    const drafts = await generateAssetDraftContents({
      campaign: context.campaign,
      profile: context.profile,
      campaignId: context.campaign.id,
      userId: context.dbUserId,
      request: parsedRequest.data,
      draftCount: 3,
    });
    return { ok: true, drafts };
  } catch (error) {
    console.error("[previewAssetDrafts]", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Asset generation failed. Please try again.",
      code: "generation_failed",
    };
  }
}

export async function saveAssetFromDraft(input: {
  draft: AssetGenerationOutput;
  assetType: M7AssetType;
  channel?: string;
  templateId?: string;
}): Promise<AssetActionResult> {
  const context = await requireAssetContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const channel =
    input.draft.channel ??
    input.channel ??
    defaultChannelForAssetType(input.assetType);

  const assetInput = createAssetSchema.parse({
    campaignId: context.campaign.id,
    assetType: input.assetType,
    title: input.draft.title,
    contentText: input.draft.content,
    theme: input.draft.theme,
    issue: input.draft.issue,
    channel,
    status: "draft",
    aiGenerated: true,
    createdBy: context.dbUserId,
  });

  try {
    const result = await createAsset(assetInput);
    if (!result.asset) {
      return {
        ok: false,
        error: "Database is not configured. Asset was not saved.",
        code: "missing_campaign",
      };
    }

    await finalizeNewAsset({
      campaignId: context.campaign.id,
      candidateName: campaignDisplayName(context.campaign),
      assetId: result.asset.id,
      assetTitle: result.asset.title,
      assetType: input.assetType,
      aiGenerated: true,
      channel,
      theme: input.draft.theme,
      issue: input.draft.issue,
      templateUsed: input.templateId ?? null,
    });

    revalidatePath("/assets");
    revalidatePath("/brain");
    revalidatePath("/dashboard");

    return { ok: true, assetId: result.asset.id };
  } catch (error) {
    console.error("[saveAssetFromDraft]", error);
    return { ok: false, error: "Failed to save asset draft." };
  }
}

export async function generateAssetFromTemplate(input: {
  templateId: string;
  provider: "canva" | "higgsfield";
  theme?: string;
  issue?: string;
}): Promise<AssetActionResult> {
  const context = await requireAssetContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const template = getSocialAssetTemplate(input.templateId);
  if (!template) {
    return {
      ok: false,
      error: "Choose a valid social media template.",
      code: "validation",
    };
  }

  if (input.provider !== template.provider) {
    return {
      ok: false,
      error: `${template.label} is configured for ${template.provider}.`,
      code: "validation",
    };
  }

  const integration = await getOrganizationIntegration({
    organizationId: context.campaign.organization_id,
    provider: input.provider,
  });

  const connected =
    integration?.status === "connected" || isIntegrationsDemoMode();
  if (!connected) {
    return {
      ok: false,
      error: `Connect ${input.provider === "canva" ? "Canva" : "Higgsfield"} in Settings before rendering templates.`,
      code: "integration_not_connected",
    };
  }

  try {
    const candidateName = campaignDisplayName(context.campaign);
    const generated =
      input.provider === "canva"
        ? await generateFromCanvaTemplate({
            accessToken: integration?.accessToken,
            template,
            theme: input.theme,
            issue: input.issue,
            candidateName,
          })
        : await generateFromHiggsfieldTemplate({
            accessToken: integration?.accessToken,
            template,
            theme: input.theme,
            issue: input.issue,
            candidateName,
          });

    const title = input.theme?.trim()
      ? `${template.label}: ${input.theme}`
      : template.label;
    const contentText = [
      `Rendered ${template.platform} creative (${template.dimensions}).`,
      input.theme ? `Theme: ${input.theme}` : null,
      input.issue ? `Issue: ${input.issue}` : null,
      `Export: ${generated.fileUrl}`,
    ]
      .filter(Boolean)
      .join("\n");

    const assetInput = createAssetSchema.parse({
      campaignId: context.campaign.id,
      assetType: template.assetType,
      title,
      contentText,
      channel: template.channel,
      ...(input.theme ? { theme: input.theme } : {}),
      ...(input.issue ? { issue: input.issue } : {}),
      status: "draft",
      aiGenerated: true,
      fileUrl: generated.fileUrl,
      templateUsed: input.templateId,
      createdBy: context.dbUserId,
    });

    const result = await createAsset(assetInput);
    if (!result.asset) {
      return {
        ok: false,
        error: "Database is not configured.",
        code: "validation",
      };
    }

    await finalizeNewAsset({
      campaignId: context.campaign.id,
      candidateName,
      assetId: result.asset.id,
      assetTitle: result.asset.title,
      assetType: template.assetType,
      aiGenerated: true,
      channel: template.channel,
      theme: input.theme ?? null,
      issue: input.issue ?? null,
      templateUsed: input.templateId,
    });

    revalidatePath("/assets");
    revalidatePath("/brain");
    revalidatePath("/dashboard");

    return { ok: true, assetId: result.asset.id };
  } catch (error) {
    console.error("[generateAssetFromTemplate]", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Template generation failed.",
      code: "generation_failed",
    };
  }
}

export async function updateAssetContent(input: {
  assetId: string;
  title?: string;
  contentText?: string;
  description?: string | null;
  theme?: string | null;
  issue?: string | null;
}): Promise<AssetActionResult> {
  const context = await requireAssetContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const parsed = updateAssetSchema.safeParse({
    id: input.assetId,
    campaignId: context.campaign.id,
    title: input.title,
    contentText: input.contentText,
    description: input.description,
    theme: input.theme,
    issue: input.issue,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid asset data",
      code: "validation",
    };
  }

  const existing = await getAssetById(context.campaign.id, input.assetId);
  if (!existing) {
    return { ok: false, error: "Asset not found", code: "not_found" };
  }

  if (existing.status === "approved") {
    return {
      ok: false,
      error: "Approved assets cannot be edited. Reject to draft first.",
      code: "forbidden",
    };
  }

  try {
    const result = await updateAsset(parsed.data);
    if (!result.asset) {
      return {
        ok: false,
        error: "Database is not configured. Asset was not saved.",
      };
    }

    revalidatePath("/assets");
    return { ok: true, assetId: result.asset.id };
  } catch (error) {
    console.error("[updateAssetContent]", error);
    return { ok: false, error: "Failed to update asset." };
  }
}

export async function submitAssetForApproval(
  assetId: string,
): Promise<AssetActionResult> {
  const context = await requireAssetContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const existing = await getAssetById(context.campaign.id, assetId);
  if (!existing) {
    return { ok: false, error: "Asset not found", code: "not_found" };
  }

  if (existing.status !== "draft") {
    return {
      ok: false,
      error: "Only draft assets can be submitted for approval.",
      code: "validation",
    };
  }

  try {
    const result = await updateAsset({
      id: assetId,
      campaignId: context.campaign.id,
      status: "needs_review",
      complianceStatus: "pending",
    });

    if (!result.asset) {
      return { ok: false, error: "Failed to update asset status." };
    }

    await updateComplianceRecordForAsset({
      assetId,
      reviewStatus: "pending",
    });

    revalidatePath("/assets");
    return { ok: true, assetId };
  } catch (error) {
    console.error("[submitAssetForApproval]", error);
    return { ok: false, error: "Failed to submit asset for approval." };
  }
}

export async function approveAsset(
  assetId: string,
): Promise<AssetActionResult> {
  const context = await requireAssetContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  if (!context.role || !canApproveAssets(context.role)) {
    return {
      ok: false,
      error: "You do not have permission to approve assets.",
      code: "forbidden",
    };
  }

  const existing = await getAssetById(context.campaign.id, assetId);
  if (!existing) {
    return { ok: false, error: "Asset not found", code: "not_found" };
  }

  if (existing.status !== "needs_review") {
    return {
      ok: false,
      error: "Only assets pending approval can be approved.",
      code: "validation",
    };
  }

  const approvedAt = new Date().toISOString();

  try {
    const result = await updateAsset({
      id: assetId,
      campaignId: context.campaign.id,
      status: "approved",
      complianceStatus: "approved",
      approvedBy: context.dbUserId,
      approvedAt,
    });

    if (!result.asset) {
      return { ok: false, error: "Failed to approve asset." };
    }

    await updateComplianceRecordForAsset({
      assetId,
      reviewStatus: "approved",
      reviewedBy: context.dbUserId,
    });

    await writeAssetToCampaignKnowledge({
      organizationId: context.campaign.organization_id,
      campaignId: context.campaign.id,
      asset: result.asset,
      status: "approved",
    });

    revalidatePath("/assets");
    revalidatePath("/brain");
    return { ok: true, assetId };
  } catch (error) {
    console.error("[approveAsset]", error);
    return { ok: false, error: "Failed to approve asset." };
  }
}

export async function rejectAsset(assetId: string): Promise<AssetActionResult> {
  const context = await requireAssetContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  if (!context.role || !canApproveAssets(context.role)) {
    return {
      ok: false,
      error: "You do not have permission to reject assets.",
      code: "forbidden",
    };
  }

  const existing = await getAssetById(context.campaign.id, assetId);
  if (!existing) {
    return { ok: false, error: "Asset not found", code: "not_found" };
  }

  if (existing.status !== "needs_review") {
    return {
      ok: false,
      error: "Only assets pending approval can be rejected.",
      code: "validation",
    };
  }

  try {
    const result = await updateAsset({
      id: assetId,
      campaignId: context.campaign.id,
      status: "draft",
      complianceStatus: "rejected",
      approvedBy: null,
      approvedAt: null,
    });

    if (!result.asset) {
      return { ok: false, error: "Failed to reject asset." };
    }

    await updateComplianceRecordForAsset({
      assetId,
      reviewStatus: "rejected",
      reviewedBy: context.dbUserId,
    });

    revalidatePath("/assets");
    return { ok: true, assetId };
  } catch (error) {
    console.error("[rejectAsset]", error);
    return { ok: false, error: "Failed to reject asset." };
  }
}
