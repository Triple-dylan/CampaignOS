"use server";

import { revalidatePath } from "next/cache";
import { executeChatWorkflowWithContext } from "@/actions/workflow-chat";
import {
  requireCampaignContext,
  type ModuleActionResult,
} from "@/lib/auth/require-campaign-context";
import { logAiGeneration } from "@/lib/ai/log-generation";
import { getOpenAiModel } from "@/lib/ai/config";
import { getCampaignById, getCampaignProfile } from "@/lib/db/campaigns";
import {
  createWorkflowRun,
  createWorkflowSchedule,
  getWorkflowScheduleById,
  listDueWorkflowSchedules,
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
  options?: { promptSnapshot?: string | null; trigger?: "manual" | "cron" },
): Promise<WorkflowRunActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: "run_failed" };
  }

  return executeWorkflowScheduleForCampaign({
    scheduleId,
    campaign: context.campaign,
    profile: context.profile,
    dbUserId: context.dbUserId,
    promptSnapshot: options?.promptSnapshot,
    trigger: options?.trigger ?? "manual",
  });
}

async function executeWorkflowScheduleForCampaign(input: {
  scheduleId: string;
  campaign: NonNullable<Awaited<ReturnType<typeof getCampaignById>>>;
  profile: Awaited<ReturnType<typeof getCampaignProfile>>;
  dbUserId: string | null;
  promptSnapshot?: string | null;
  trigger?: "manual" | "cron";
}): Promise<WorkflowRunActionResult> {
  const scheduleResult = await getWorkflowScheduleById(
    input.scheduleId,
    input.campaign.id,
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
    input.promptSnapshot?.trim() || schedule.prompt.trim();
  const storedFields = readStoredFieldsFromMetadata(schedule.metadata_json);
  const fields = buildWorkflowFieldsForSchedule({
    workflowId,
    schedule,
    campaign: input.campaign,
    profile: input.profile,
    storedFields,
    promptSnapshot,
  });

  const runResult = await createWorkflowRun({
    scheduleId: schedule.id,
    campaignId: input.campaign.id,
    promptSnapshot,
    agentMode: schedule.agent_mode,
    metadata: {
      workflowId,
      trigger: input.trigger ?? "manual",
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
    const execution = await executeChatWorkflowWithContext(
      {
        campaign: input.campaign,
        profile: input.profile,
        dbUserId: input.dbUserId,
      },
      { workflowId, fields },
    );

    if (!execution.ok) {
      await updateWorkflowRun({
        runId,
        status: "failed",
        errorMessage: execution.error,
        outputJson: { workflowId, code: execution.code ?? "generation_failed" },
      });
      await markScheduleRan({
        scheduleId: schedule.id,
        status: "error",
        scheduleType: schedule.schedule_type,
        scheduleConfig: schedule.schedule_config,
        cronExpression: schedule.cron_expression,
      });

      revalidatePath("/automations");

      return {
        ok: false,
        error: execution.error,
        code: "run_failed",
        runId,
      };
    }

    const log = await logAiGeneration({
      campaignId: input.campaign.id,
      userId: input.dbUserId,
      module: "workflow_automation",
      prompt: promptSnapshot,
      model: getOpenAiModel(),
      inputJson: {
        scheduleId: schedule.id,
        runId,
        workflowId,
        agentMode: schedule.agent_mode,
        fields,
        trigger: input.trigger ?? "manual",
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
    await markScheduleRan({
      scheduleId: schedule.id,
      status: "active",
      scheduleType: schedule.schedule_type,
      scheduleConfig: schedule.schedule_config,
      cronExpression: schedule.cron_expression,
    });

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
    await markScheduleRan({
      scheduleId: schedule.id,
      status: "error",
      scheduleType: schedule.schedule_type,
      scheduleConfig: schedule.schedule_config,
      cronExpression: schedule.cron_expression,
    });

    revalidatePath("/automations");

    return {
      ok: false,
      error: message,
      code: "run_failed",
      runId,
    };
  }
}

/** Cron entrypoint — runs all due schedules across campaigns. */
export async function runDueWorkflowSchedules(): Promise<{
  processed: number;
  completed: number;
  failed: number;
  results: Array<{ scheduleId: string; ok: boolean; error?: string }>;
}> {
  const due = await listDueWorkflowSchedules();
  const results: Array<{ scheduleId: string; ok: boolean; error?: string }> = [];
  let completed = 0;
  let failed = 0;

  for (const schedule of due.schedules) {
    const campaign = await getCampaignById(schedule.campaign_id);
    if (!campaign) {
      failed += 1;
      results.push({
        scheduleId: schedule.id,
        ok: false,
        error: "Campaign not found",
      });
      continue;
    }

    const profile = await getCampaignProfile(campaign.id);
    const result = await executeWorkflowScheduleForCampaign({
      scheduleId: schedule.id,
      campaign,
      profile,
      dbUserId: schedule.created_by,
      trigger: "cron",
    });

    if (result.ok) {
      completed += 1;
      results.push({ scheduleId: schedule.id, ok: true });
    } else {
      failed += 1;
      results.push({
        scheduleId: schedule.id,
        ok: false,
        error: result.error,
      });
    }
  }

  return {
    processed: due.schedules.length,
    completed,
    failed,
    results,
  };
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
