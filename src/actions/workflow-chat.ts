"use server";

import { revalidatePath } from "next/cache";
import { generateAssetContent } from "@/lib/ai/generate-asset";
import { getOpenAiModel, isOpenAiConfigured } from "@/lib/ai/config";
import { generateResearchBriefContent } from "@/lib/ai/generate-research-brief";
import { generateCampaignTimelineContent } from "@/lib/ai/generate-campaign-timeline";
import { requireCampaignContext } from "@/lib/auth/require-campaign-context";
import { createAsset } from "@/lib/db/assets";
import { listGraphNodes } from "@/lib/db/campaigns";
import { createResearchBrief } from "@/lib/db/research-briefs";
import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";
import { campaignDisplayName } from "@/lib/db/schema";
import { createComplianceRecordForAsset, complianceStatusForAssetType } from "@/lib/db/compliance";
import { linkAssetToCampaignGraph, linkResearchToCampaignGraph } from "@/lib/db/graph";
import { persistCampaignTimelineItems } from "@/lib/workflows/persist-campaign-timeline";
import type { CampaignWorkflowId } from "@/lib/workflows/registry";
import {
  buildEventResearchTopic,
  buildIncumbentResearchTopic,
  extractThemeAndIssue,
  inferAssetTypeFromText,
  type WorkflowFields,
} from "@/lib/workflows/chat-fields";
import {
  createAssetSchema,
  defaultChannelForAssetType,
  generateAssetRequestSchema,
} from "@/lib/validators/assets";
import {
  createResearchBriefSchema,
  generateResearchBriefRequestSchema,
} from "@/lib/validators/research-briefs";

export type ExecuteWorkflowResult =
  | {
      ok: true;
      summary: string;
      artifactLink: string;
      artifactLabel: string;
      artifactIds?: string[];
    }
  | {
      ok: false;
      error: string;
      code?: "missing_openai" | "missing_campaign" | "generation_failed";
    };

export type WorkflowCampaignContext = {
  campaign: DbCampaign;
  profile: DbCampaignProfile | null;
  dbUserId: string | null;
};

export async function executeChatWorkflow(input: {
  workflowId: CampaignWorkflowId;
  fields: WorkflowFields;
}): Promise<ExecuteWorkflowResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: "missing_campaign" };
  }

  return executeChatWorkflowWithContext(
    {
      campaign: context.campaign,
      profile: context.profile,
      dbUserId: context.dbUserId,
    },
    input,
  );
}

export async function executeChatWorkflowWithContext(
  context: WorkflowCampaignContext,
  input: {
    workflowId: CampaignWorkflowId;
    fields: WorkflowFields;
  },
): Promise<ExecuteWorkflowResult> {
  switch (input.workflowId) {
    case "event-research":
      return executeEventResearch(context, input.fields);
    case "content-creation":
      return executeContentCreation(context, input.fields);
    case "campaign-structure":
      return executeCampaignStructure(context, input.fields);
    case "incumbent-research":
      return executeIncumbentResearch(context, input.fields);
    default:
      return { ok: false, error: "Unknown workflow" };
  }
}

async function executeEventResearch(
  context: WorkflowCampaignContext,
  fields: WorkflowFields,
): Promise<ExecuteWorkflowResult> {
  const topic = buildEventResearchTopic(fields);
  return generateAndSaveResearchBrief(context, {
    researchType: "issue",
    topic,
  });
}

async function executeIncumbentResearch(
  context: WorkflowCampaignContext,
  fields: WorkflowFields,
): Promise<ExecuteWorkflowResult> {
  const topic = buildIncumbentResearchTopic(fields);
  return generateAndSaveResearchBrief(context, {
    researchType: "opponent",
    topic,
  });
}

async function generateAndSaveResearchBrief(
  context: WorkflowCampaignContext,
  request: { researchType: "issue" | "opponent"; topic: string },
): Promise<ExecuteWorkflowResult> {
  if (!isOpenAiConfigured()) {
    return {
      ok: false,
      error:
        "OpenAI is not configured. Add OPENAI_API_KEY to generate briefs with AI.",
      code: "missing_openai",
    };
  }

  const parsedRequest = generateResearchBriefRequestSchema.safeParse(request);
  if (!parsedRequest.success) {
    return {
      ok: false,
      error: parsedRequest.error.issues[0]?.message ?? "Invalid request",
      code: "generation_failed",
    };
  }

  try {
    const generated = await generateResearchBriefContent({
      campaign: context.campaign,
      profile: context.profile,
      campaignId: context.campaign.id,
      userId: context.dbUserId,
      request: parsedRequest.data,
    });

    const model = getOpenAiModel();
    const briefInput = createResearchBriefSchema.parse({
      campaignId: context.campaign.id,
      researchType: parsedRequest.data.researchType,
      title: generated.title,
      topic: parsedRequest.data.topic,
      summary: generated.summary,
      keyFindings: generated.key_findings,
      sources: generated.sources ?? [],
      status: "draft",
      aiGenerated: true,
      promptUsed: parsedRequest.data.topic,
      modelUsed: model,
      createdBy: context.dbUserId,
    });

    const result = await createResearchBrief(briefInput);
    if (!result.brief) {
      return {
        ok: false,
        error: "Database is not configured. Brief was not saved.",
        code: "missing_campaign",
      };
    }

    await linkResearchToCampaignGraph({
      campaignId: context.campaign.id,
      candidateName: campaignDisplayName(context.campaign),
      briefId: result.brief.id,
      briefTitle: result.brief.title,
      researchType: parsedRequest.data.researchType,
      relatedIssueTitles:
        generated.related_issues ??
        parsedRequest.data.relatedIssues ??
        context.profile?.top_issues ??
        undefined,
      existingNodes: await listGraphNodes(context.campaign.id),
    });

    revalidatePath("/research");
    revalidatePath("/dashboard");

    return {
      ok: true,
      summary:
        parsedRequest.data.researchType === "opponent"
          ? "Your candidate comparison report is saved as a draft in Research."
          : "Your event research brief is saved as a draft in Research.",
      artifactLink: `/research?briefId=${result.brief.id}`,
      artifactLabel: "Research",
      artifactIds: [result.brief.id],
    };
  } catch (error) {
    console.error("[generateAndSaveResearchBrief]", error);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Research generation failed.",
      code: "generation_failed",
    };
  }
}

async function executeContentCreation(
  context: WorkflowCampaignContext,
  fields: WorkflowFields,
): Promise<ExecuteWorkflowResult> {
  const combined = [fields.intent, fields.theme].filter(Boolean).join(". ");
  const assetType = inferAssetTypeFromText(combined);
  const { theme, issue, channel } = extractThemeAndIssue(fields.theme ?? "");

  if (!isOpenAiConfigured()) {
    return {
      ok: false,
      error:
        "OpenAI is not configured. Add OPENAI_API_KEY to generate assets with AI.",
      code: "missing_openai",
    };
  }

  const parsedRequest = generateAssetRequestSchema.safeParse({
    assetType,
    theme,
    issue,
    channel,
  });

  if (!parsedRequest.success) {
    return {
      ok: false,
      error: parsedRequest.error.issues[0]?.message ?? "Invalid request",
      code: "generation_failed",
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

    const model = getOpenAiModel();
    const channel =
      generated.channel ??
      parsedRequest.data.channel ??
      defaultChannelForAssetType(parsedRequest.data.assetType);

    const assetInput = createAssetSchema.parse({
      campaignId: context.campaign.id,
      assetType: parsedRequest.data.assetType,
      title: generated.title,
      contentText: generated.content,
      theme: generated.theme ?? parsedRequest.data.theme,
      issue: generated.issue ?? parsedRequest.data.issue,
      channel,
      status: "draft",
      aiGenerated: true,
      promptUsed: combined.slice(0, 500),
      modelUsed: model,
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

    await createComplianceRecordForAsset({
      campaignId: context.campaign.id,
      relatedAssetId: result.asset.id,
      contentType: parsedRequest.data.assetType,
      aiGenerated: true,
      distributionChannel: channel,
      reviewStatus: complianceStatusForAssetType(
        parsedRequest.data.assetType,
        true,
      ),
    });

    await linkAssetToCampaignGraph({
      campaignId: context.campaign.id,
      candidateName: campaignDisplayName(context.campaign),
      assetId: result.asset.id,
      assetTitle: result.asset.title,
      assetType: parsedRequest.data.assetType,
      existingNodes: await listGraphNodes(context.campaign.id),
    });

    revalidatePath("/assets");
    revalidatePath("/dashboard");

    return {
      ok: true,
      summary:
        "Your content draft is saved in Asset Studio for review and approval.",
      artifactLink: `/assets?assetId=${result.asset.id}`,
      artifactLabel: "Asset Studio",
      artifactIds: [result.asset.id],
    };
  } catch (error) {
    console.error("[executeContentCreation]", error);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Content generation failed.",
      code: "generation_failed",
    };
  }
}

async function executeCampaignStructure(
  context: WorkflowCampaignContext,
  fields: WorkflowFields,
): Promise<ExecuteWorkflowResult> {
  if (!isOpenAiConfigured()) {
    return {
      ok: false,
      error:
        "OpenAI is not configured. Add OPENAI_API_KEY to generate a campaign timeline.",
      code: "missing_openai",
    };
  }

  const districtSegments = fields.districtSegments?.trim() ?? "";
  const issues = fields.issues?.trim() ?? "";
  if (!districtSegments || !issues) {
    return {
      ok: false,
      error: "District/segments and key issues are required.",
      code: "generation_failed",
    };
  }

  try {
    const timeline = await generateCampaignTimelineContent({
      campaign: context.campaign,
      profile: context.profile,
      campaignId: context.campaign.id,
      userId: context.dbUserId,
      districtSegments,
      issues,
    });

    const { eventIds, taskIds } = await persistCampaignTimelineItems({
      events: timeline.events,
      tasks: timeline.tasks,
    });

    revalidatePath("/planner");
    revalidatePath("/tasks");
    revalidatePath("/dashboard");

    return {
      ok: true,
      summary: [
        timeline.summary,
        "",
        `Created ${eventIds.length} planner event${eventIds.length === 1 ? "" : "s"} and ${taskIds.length} task${taskIds.length === 1 ? "" : "s"}.`,
      ].join("\n"),
      artifactLink: "/planner",
      artifactLabel: "Planner",
      artifactIds: [...eventIds, ...taskIds],
    };
  } catch (error) {
    console.error("[executeCampaignStructure]", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Campaign timeline generation failed.",
      code: "generation_failed",
    };
  }
}
