"use server";

import { revalidatePath } from "next/cache";
import { generateAsset } from "@/actions/assets";
import { createPlannerEvent } from "@/actions/planner";
import { generateResearchBrief } from "@/actions/research";
import { createCampaignTask } from "@/actions/tasks";
import { generateCampaignTimelineContent } from "@/lib/ai/generate-campaign-timeline";
import { isOpenAiConfigured } from "@/lib/ai/config";
import { requireCampaignContext } from "@/lib/auth/require-campaign-context";
import type { CampaignWorkflowId } from "@/lib/workflows/registry";
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

export async function executeChatWorkflow(input: {
  workflowId: CampaignWorkflowId;
  fields: WorkflowFields;
}): Promise<ExecuteWorkflowResult> {
  switch (input.workflowId) {
    case "event-research":
      return executeEventResearch(input.fields);
    case "content-creation":
      return executeContentCreation(input.fields);
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
): Promise<ExecuteWorkflowResult> {
  const combined = [fields.intent, fields.theme].filter(Boolean).join(". ");
  const assetType = inferAssetTypeFromText(combined);
  const { theme, issue, channel } = extractThemeAndIssue(fields.theme ?? "");

  const result = await generateAsset({
    assetType,
    theme,
    issue,
    channel,
  });

  if (!result.ok) {
    return mapActionError(result);
  }

  return {
    ok: true,
    summary:
      "Your content draft is saved in Asset Studio for review and approval.",
    artifactLink: `/assets?assetId=${result.assetId}`,
    artifactLabel: "Asset Studio",
    artifactIds: [result.assetId],
  };
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

    const eventIds: string[] = [];
    const taskIds: string[] = [];

    for (const event of timeline.events) {
      const created = await createPlannerEvent({
        title: event.title,
        description: event.description,
        eventType: event.event_type,
        startTime: event.start_time,
        isMilestone: event.is_milestone ?? false,
      });
      if (created.ok && created.id) {
        eventIds.push(created.id);
      }
    }

    for (const task of timeline.tasks) {
      const created = await createCampaignTask({
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.due_date ?? null,
        status: "todo",
      });
      if (created.ok && created.id) {
        taskIds.push(created.id);
      }
    }

    revalidatePath("/planner");
    revalidatePath("/tasks");
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
