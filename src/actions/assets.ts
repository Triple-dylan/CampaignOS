"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { ensureOrganizationSynced } from "@/actions/organizations";
import { generateAssetContent } from "@/lib/ai/generate-asset";
import { isOpenAiConfigured } from "@/lib/ai/config";
import { getSocialAssetTemplate } from "@/lib/assets/social-templates";
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
import { campaignDisplayName } from "@/lib/db/schema";
import { getMemberRoleForUser } from "@/lib/db/members";
import { getUserByClerkId } from "@/lib/db/users";
import {
  createAssetSchema,
  contentDraftBriefSchema,
  defaultChannelForAssetType,
  generateAssetRequestSchema,
  saveContentDraftSchema,
  updateAssetSchema,
  type AssetType,
  type ContentDraftBrief,
  type ContentDraftPreview,
  type GenerateAssetRequest,
  type ListAssetsFilter,
  type M7AssetType,
  ASSET_TYPE_LABELS,
  type SaveContentDraftInput,
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
    });

    revalidatePath("/assets");
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
    });

    revalidatePath("/assets");
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

const CONTENT_DRAFT_VARIANTS = [
  {
    id: "direct",
    label: "Direct & urgent",
    hint: "Lead with a clear call to action and concise urgency.",
  },
  {
    id: "story",
    label: "Story-driven",
    hint: "Lead with a relatable community story and warm, optimistic tone.",
  },
  {
    id: "contrast",
    label: "Contrast & proof",
    hint: "Lead with contrast, proof points, or accountability against the status quo.",
  },
] as const;

export type ContentDraftVariantsResult =
  | {
      ok: true;
      drafts: ContentDraftPreview[];
      aiGenerated: boolean;
    }
  | {
      ok: false;
      error: string;
      code?: AssetActionCode;
    };

function scaffoldContentDraft(input: {
  brief: ContentDraftBrief;
  variant: (typeof CONTENT_DRAFT_VARIANTS)[number];
}): ContentDraftPreview {
  const label = ASSET_TYPE_LABELS[input.brief.assetType];
  const theme = input.brief.theme?.trim();
  const issue = input.brief.issue?.trim();
  const audience = input.brief.audience?.trim();
  const channel =
    input.brief.channel?.trim() ||
    defaultChannelForAssetType(input.brief.assetType);

  const title = [
    label,
    theme ? `— ${theme}` : "",
    ` (${input.variant.label})`,
  ]
    .join("")
    .slice(0, 200);

  const lines = [
    `${label} draft — ${input.variant.label}`,
    "",
    `Content need: ${input.brief.contentNeed}`,
    theme ? `Theme: ${theme}` : "",
    issue ? `Issue focus: ${issue}` : "Issue focus: [add issue]",
    audience ? `Audience: ${audience}` : "Audience: [describe audience]",
    `Channel: ${channel}`,
    "",
    `Angle: ${input.variant.hint}`,
    "",
    "Headline: [write a sharp, benefit-led headline]",
    "Body: [2-3 sentences in the campaign voice]",
    "Call to action: [what should the voter do next?]",
  ];

  return {
    id: input.variant.id,
    variantLabel: input.variant.label,
    title,
    content: lines.filter(Boolean).join("\n"),
    theme: theme || undefined,
    issue: issue || undefined,
    channel,
  };
}

export async function generateContentDraftVariants(
  input: ContentDraftBrief,
): Promise<ContentDraftVariantsResult> {
  const context = await requireAssetContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const parsed = contentDraftBriefSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid brief",
      code: "validation",
    };
  }

  const brief = parsed.data;
  const channel =
    brief.channel?.trim() || defaultChannelForAssetType(brief.assetType);

  if (!isOpenAiConfigured()) {
    return {
      ok: true,
      aiGenerated: false,
      drafts: CONTENT_DRAFT_VARIANTS.map((variant) =>
        scaffoldContentDraft({ brief, variant }),
      ),
    };
  }

  try {
    const drafts = await Promise.all(
      CONTENT_DRAFT_VARIANTS.map(async (variant) => {
        const generated = await generateAssetContent({
          campaign: context.campaign,
          profile: context.profile,
          campaignId: context.campaign.id,
          userId: context.dbUserId,
          request: {
            assetType: brief.assetType,
            theme: brief.theme,
            issue: brief.issue,
            channel,
            audience: brief.audience,
            contentNeed: brief.contentNeed,
            variationHint: variant.hint,
          },
        });

        return {
          id: variant.id,
          variantLabel: variant.label,
          title: generated.title,
          content: generated.content,
          theme: generated.theme ?? brief.theme,
          issue: generated.issue ?? brief.issue,
          channel: generated.channel ?? channel,
        } satisfies ContentDraftPreview;
      }),
    );

    return { ok: true, aiGenerated: true, drafts };
  } catch (error) {
    console.error("[generateContentDraftVariants]", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Draft generation failed. Please try again.",
      code: "generation_failed",
    };
  }
}

export async function saveContentDraft(
  input: SaveContentDraftInput,
): Promise<AssetActionResult> {
  const context = await requireAssetContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const parsed = saveContentDraftSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid draft",
      code: "validation",
    };
  }

  const channel =
    parsed.data.channel?.trim() ||
    defaultChannelForAssetType(parsed.data.assetType);

  const assetInput = createAssetSchema.parse({
    campaignId: context.campaign.id,
    assetType: parsed.data.assetType,
    title: parsed.data.title,
    contentText: parsed.data.contentText,
    theme: parsed.data.theme,
    issue: parsed.data.issue,
    channel,
    status: "draft",
    aiGenerated: parsed.data.aiGenerated ?? false,
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
      assetType: parsed.data.assetType,
      aiGenerated: parsed.data.aiGenerated ?? false,
      channel,
    });

    revalidatePath("/assets");
    revalidatePath("/dashboard");

    return { ok: true, assetId: result.asset.id };
  } catch (error) {
    console.error("[saveContentDraft]", error);
    return {
      ok: false,
      error: "Failed to save content draft. Please try again.",
    };
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

  // Expected production flow:
  // Canva: load the user's OAuth token, map campaign/profile fields to the
  // brand template dataset, create an autofill job, poll it, export the design,
  // then save the Canva design/export URLs on the CampaignOS asset.
  // Higgsfield: call the configured MCP generation tool with campaign context,
  // template dimensions, and prompt fields, then save returned image/video URLs.
  return {
    ok: false,
    error:
      "Template generation is not connected yet. Connect Canva or Higgsfield in Settings, then map template IDs and output storage.",
    code: "integration_not_connected",
  };
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

    revalidatePath("/assets");
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
