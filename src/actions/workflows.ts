"use server";

import { revalidatePath } from "next/cache";
import { executeChatWorkflow } from "@/actions/workflow-chat";
import {
  requireCampaignContext,
  type ModuleActionResult,
} from "@/lib/auth/require-campaign-context";
import { logAiGeneration } from "@/lib/ai/log-generation";
import { getOpenAiModel } from "@/lib/ai/config";
import {
  createWorkflowRun,
  createWorkflowSchedule,
  getWorkflowScheduleById,
  listWorkflowRuns,
  listWorkflowSchedules,
  markScheduleRan,
  updateWorkflowRun,
} from "@/lib/db/workflows";
import type { DbWorkflowRun, DbWorkflowSchedule } from "@/lib/db/schema";
import {
  buildWorkflowFieldsForSchedule,
  readStoredFieldsFromMetadata,
  resolveWorkflowIdFromSchedule,
} from "@/lib/workflows/resolve-schedule";
import {
  createWorkflowScheduleSchema,
  type CreateWorkflowScheduleInput,
} from "@/lib/validators/workflows";

export type WorkflowRunActionResult =
  | {
      ok: true;
      runId: string;
      status: "completed";
      summary: string;
      artifactLink?: string;
    }
  | {
      ok: false;
      error: string;
      code?: "missing_db" | "not_found" | "unsupported_workflow" | "run_failed";
      runId?: string;
    };

export async function getScheduledRunsForCampaign(): Promise<
  | { ok: false; error: string; schedules: DbWorkflowSchedule[] }
  | { ok: true; schedules: DbWorkflowSchedule[]; synced: boolean }
> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, schedules: [] };
  }

  const result = await listWorkflowSchedules(context.campaign.id);
  return {
    ok: true,
    schedules: result.schedules,
    synced: result.synced,
  };
}

export async function getWorkflowRunHistoryForCampaign(): Promise<
  | { ok: false; error: string; runs: DbWorkflowRun[] }
  | { ok: true; runs: DbWorkflowRun[]; synced: boolean }
> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, runs: [] };
  }

  const result = await listWorkflowRuns(context.campaign.id);
  return {
    ok: true,
    runs: result.runs,
    synced: result.synced,
  };
}

export async function createScheduledRun(
  input: Omit<CreateWorkflowScheduleInput, "campaignId" | "createdBy">,
): Promise<ModuleActionResult & { schedule?: DbWorkflowSchedule | null }> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const parsed = createWorkflowScheduleSchema.safeParse({
    campaignId: context.campaign.id,
    createdBy: context.dbUserId,
    ...input,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid schedule",
      code: "validation",
    };
  }

  const result = await createWorkflowSchedule(parsed.data);

  revalidatePath("/automations");

  if (!result.synced) {
    return {
      ok: true,
      id: "local-scaffold",
      schedule: null,
    };
  }

  return {
    ok: true,
    id: result.schedule!.id,
    schedule: result.schedule,
  };
}

async function executeWorkflowScheduleRun(
  scheduleId: string,
  options?: { promptSnapshot?: string | null },
): Promise<WorkflowRunActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: "run_failed" };
  }

  const scheduleResult = await getWorkflowScheduleById(
    scheduleId,
    context.campaign.id,
  );

  if (!scheduleResult.synced) {
    return {
      ok: false,
      error:
        "Database not connected — configure Supabase to run scheduled workflows.",
      code: "missing_db",
    };
  }

  const schedule = scheduleResult.schedule;
  if (!schedule) {
    return {
      ok: false,
      error: "Schedule not found.",
      code: "not_found",
    };
  }

  const workflowId = resolveWorkflowIdFromSchedule(schedule);
  if (!workflowId) {
    return {
      ok: false,
      error:
        "This schedule does not map to a supported campaign workflow. Edit the instruction to mention a workflow (event research, content creation, campaign timeline, or incumbent research).",
      code: "unsupported_workflow",
    };
  }

  const promptSnapshot =
    options?.promptSnapshot?.trim() || schedule.prompt.trim();
  const storedFields = readStoredFieldsFromMetadata(schedule.metadata_json);
  const fields = buildWorkflowFieldsForSchedule({
    workflowId,
    schedule,
    campaign: context.campaign,
    profile: context.profile,
    storedFields,
    promptSnapshot,
  });

  const runResult = await createWorkflowRun({
    scheduleId: schedule.id,
    campaignId: context.campaign.id,
    promptSnapshot,
    agentMode: schedule.agent_mode,
    metadata: {
      workflowId,
      trigger: "manual",
      fields,
    },
  });

  if (!runResult.synced || !runResult.run) {
    return {
      ok: false,
      error:
        "Database not connected — configure Supabase to run scheduled workflows.",
      code: "missing_db",
    };
  }

  const runId = runResult.run.id;

  try {
    const execution = await executeChatWorkflow({
      workflowId,
      fields,
    });

    if (!execution.ok) {
      await updateWorkflowRun({
        runId,
        status: "failed",
        errorMessage: execution.error,
        outputJson: { workflowId, code: execution.code ?? "generation_failed" },
      });
      await markScheduleRan({ scheduleId: schedule.id, status: "error" });

      revalidatePath("/automations");

      return {
        ok: false,
        error: execution.error,
        code: "run_failed",
        runId,
      };
    }

    const log = await logAiGeneration({
      campaignId: context.campaign.id,
      userId: context.dbUserId,
      module: "workflow_automation",
      prompt: promptSnapshot,
      model: getOpenAiModel(),
      inputJson: {
        scheduleId: schedule.id,
        runId,
        workflowId,
        agentMode: schedule.agent_mode,
        fields,
      },
      outputJson: {
        artifactLink: execution.artifactLink,
        artifactLabel: execution.artifactLabel,
        artifactIds: execution.artifactIds ?? [],
      },
      outputText: execution.summary,
      createdObjectType: execution.artifactLabel.toLowerCase().replace(/\s+/g, "_"),
      createdObjectId: execution.artifactIds?.[0],
    });

    await updateWorkflowRun({
      runId,
      status: "completed",
      outputText: execution.summary,
      outputJson: {
        workflowId,
        artifactLink: execution.artifactLink,
        artifactLabel: execution.artifactLabel,
        artifactIds: execution.artifactIds ?? [],
      },
      aiGenerationLogId: log.logId,
    });
    await markScheduleRan({ scheduleId: schedule.id, status: "active" });

    revalidatePath("/automations");
    revalidatePath("/research");
    revalidatePath("/assets");
    revalidatePath("/planner");
    revalidatePath("/tasks");

    return {
      ok: true,
      runId,
      status: "completed",
      summary: execution.summary,
      artifactLink: execution.artifactLink,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Workflow run failed unexpectedly.";

    await updateWorkflowRun({
      runId,
      status: "failed",
      errorMessage: message,
      outputJson: { workflowId },
    });
    await markScheduleRan({ scheduleId: schedule.id, status: "error" });

    revalidatePath("/automations");

    return {
      ok: false,
      error: message,
      code: "run_failed",
      runId,
    };
  }
}

/** Manual runner for a saved workflow schedule ("Run now"). */
export async function triggerWorkflowRun(
  scheduleId: string,
): Promise<WorkflowRunActionResult> {
  return executeWorkflowScheduleRun(scheduleId);
}

/** @deprecated Use `triggerWorkflowRun` — kept for backward compatibility. */
export async function triggerWorkflowRunStub(scheduleId: string) {
  return triggerWorkflowRun(scheduleId);
}
