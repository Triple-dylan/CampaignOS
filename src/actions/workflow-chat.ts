"use server";

import { revalidatePath } from "next/cache";
import { previewAssetDrafts, saveAssetFromDraft } from "@/actions/assets";
import { generateResearchBrief } from "@/actions/research";
import type { AssetGenerationOutput } from "@/lib/ai/schemas/asset";
import { generateContentCalendarContent } from "@/lib/ai/generate-content-calendar";
import { generateCampaignTimelineContent } from "@/lib/ai/generate-campaign-timeline";
import { isOpenAiConfigured } from "@/lib/ai/config";
import { requireCampaignContext } from "@/lib/auth/require-campaign-context";
import { campaignDisplayName } from "@/lib/db/schema";
import type { CampaignWorkflowId } from "@/lib/workflows/registry";
import { persistContentCalendar } from "@/lib/workflows/persist-content-calendar";
import { persistCampaignTimeline } from "@/lib/workflows/persist-timeline";
import {
  buildEventResearchTopic,
  buildIncumbentResearchTopic,
  extractThemeAndIssue,
  inferAssetTypeFromText,
  type WorkflowFields,
} from "@/lib/workflows/chat-fields";

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

export type PreviewWorkflowResult =
  | { ok: true; drafts: AssetGenerationOutput[] }
  | {
      ok: false;
      error: string;
      code?: "missing_openai" | "missing_campaign" | "generation_failed";
    };

export async function previewChatWorkflow(input: {
  workflowId: CampaignWorkflowId;
  fields: WorkflowFields;
}): Promise<PreviewWorkflowResult> {
  if (input.workflowId !== "content-creation") {
    return { ok: false, error: "Preview is only supported for content creation." };
  }

  const combined = [input.fields.intent, input.fields.theme].filter(Boolean).join(". ");
  const assetType = inferAssetTypeFromText(combined);
  const { theme, issue, channel } = extractThemeAndIssue(input.fields.theme ?? "");

  const result = await previewAssetDrafts({
    assetType,
    theme,
    issue,
    channel,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      code: result.code === "missing_openai" ? "missing_openai" : "generation_failed",
    };
  }

  return { ok: true, drafts: result.drafts };
}

export async function executeChatWorkflow(input: {
  workflowId: CampaignWorkflowId;
  fields: WorkflowFields;
  draftIndex?: number;
  drafts?: AssetGenerationOutput[];
}): Promise<ExecuteWorkflowResult> {
  switch (input.workflowId) {
    case "event-research":
      return executeEventResearch(input.fields);
    case "content-creation":
      return executeContentCreation(input.fields, input.draftIndex, input.drafts);
    case "content-calendar":
      return executeContentCalendar(input.fields);
    case "campaign-structure":
      return executeCampaignStructure(input.fields);
    case "incumbent-research":
      return executeIncumbentResearch(input.fields);
    default:
      return { ok: false, error: "Unknown workflow" };
  }
}

async function executeEventResearch(
  fields: WorkflowFields,
): Promise<ExecuteWorkflowResult> {
  const topic = buildEventResearchTopic(fields);
  const result = await generateResearchBrief({
    researchType: "issue",
    topic,
  });

  if (!result.ok) {
    return mapActionError(result);
  }

  return {
    ok: true,
    summary: "Your event research brief is saved as a draft in Research.",
    artifactLink: `/research?briefId=${result.briefId}`,
    artifactLabel: "Research",
    artifactIds: [result.briefId],
  };
}

async function executeIncumbentResearch(
  fields: WorkflowFields,
): Promise<ExecuteWorkflowResult> {
  const topic = buildIncumbentResearchTopic(fields);
  const result = await generateResearchBrief({
    researchType: "opponent",
    topic,
  });

  if (!result.ok) {
    return mapActionError(result);
  }

  return {
    ok: true,
    summary: "Your candidate comparison report is saved as a draft in Research.",
    artifactLink: `/research?briefId=${result.briefId}`,
    artifactLabel: "Research",
    artifactIds: [result.briefId],
  };
}

async function executeContentCreation(
  fields: WorkflowFields,
  draftIndex = 0,
  drafts?: AssetGenerationOutput[],
): Promise<ExecuteWorkflowResult> {
  const combined = [fields.intent, fields.theme].filter(Boolean).join(". ");
  const assetType = inferAssetTypeFromText(combined);
  const { theme, issue, channel } = extractThemeAndIssue(fields.theme ?? "");

  let selectedDraft = drafts?.[draftIndex];
  if (!selectedDraft) {
    const preview = await previewAssetDrafts({ assetType, theme, issue, channel });
    if (!preview.ok) {
      return mapActionError(preview);
    }
    selectedDraft = preview.drafts[draftIndex] ?? preview.drafts[0];
  }

  if (!selectedDraft) {
    return { ok: false, error: "No draft available to save.", code: "generation_failed" };
  }

  const result = await saveAssetFromDraft({
    draft: selectedDraft,
    assetType,
    channel,
  });

  if (!result.ok) {
    return mapActionError(result);
  }

  return {
    ok: true,
    summary: [
      `Saved draft ${draftIndex + 1} to Asset Studio for review and approval.`,
      selectedDraft.content.slice(0, 280) +
        (selectedDraft.content.length > 280 ? "…" : ""),
    ].join("\n\n"),
    artifactLink: `/assets?assetId=${result.assetId}`,
    artifactLabel: "Asset Studio",
    artifactIds: [result.assetId],
  };
}

async function executeContentCalendar(
  fields: WorkflowFields,
): Promise<ExecuteWorkflowResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: "missing_campaign" };
  }

  if (!isOpenAiConfigured()) {
    return {
      ok: false,
      error:
        "OpenAI is not configured. Add OPENAI_API_KEY to generate a content calendar.",
      code: "missing_openai",
    };
  }

  const period = fields.intent?.trim() ?? "";
  const channelsAndCadence = fields.details?.trim() ?? "";
  if (!period || !channelsAndCadence) {
    return {
      ok: false,
      error: "Calendar period and channels/cadence are required.",
      code: "generation_failed",
    };
  }

  try {
    const calendar = await generateContentCalendarContent({
      campaign: context.campaign,
      profile: context.profile,
      campaignId: context.campaign.id,
      userId: context.dbUserId,
      period,
      channelsAndCadence,
    });

    const { eventIds } = await persistContentCalendar({
      organizationId: context.campaign.organization_id,
      campaign: context.campaign,
      createdBy: context.dbUserId,
      candidateName: campaignDisplayName(context.campaign),
      calendar,
    });

    revalidatePath("/planner");
    revalidatePath("/brain");
    revalidatePath("/dashboard");

    return {
      ok: true,
      summary: [
        calendar.summary,
        "",
        `Created ${eventIds.length} content beat${eventIds.length === 1 ? "" : "s"} in Planner and linked them in the brain graph.`,
      ].join("\n"),
      artifactLink: "/planner",
      artifactLabel: "Planner",
      artifactIds: eventIds,
    };
  } catch (error) {
    console.error("[executeContentCalendar]", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Content calendar generation failed.",
      code: "generation_failed",
    };
  }
}

async function executeCampaignStructure(
  fields: WorkflowFields,
): Promise<ExecuteWorkflowResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: "missing_campaign" };
  }

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

    const { eventIds, taskIds } = await persistCampaignTimeline({
      campaign: context.campaign,
      createdBy: context.dbUserId,
      candidateName: campaignDisplayName(context.campaign),
      timeline,
    });

    revalidatePath("/planner");
    revalidatePath("/tasks");
    revalidatePath("/brain");
    revalidatePath("/dashboard");

    return {
      ok: true,
      summary: [
        timeline.summary,
        "",
        `Created ${eventIds.length} planner event${eventIds.length === 1 ? "" : "s"} and ${taskIds.length} task stub${taskIds.length === 1 ? "" : "s"}.`,
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

function mapActionError(result: {
  ok: false;
  error: string;
  code?: string;
}): ExecuteWorkflowResult {
  return {
    ok: false,
    error: result.error,
    code:
      result.code === "missing_openai"
        ? "missing_openai"
        : result.code === "missing_campaign"
          ? "missing_campaign"
          : "generation_failed",
  };
}
