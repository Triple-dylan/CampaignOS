"use server";

import { revalidatePath } from "next/cache";
import {
  requireCampaignContext,
  type ModuleActionResult,
} from "@/lib/auth/require-campaign-context";
import {
  createWorkflowSchedule,
  listWorkflowSchedules,
} from "@/lib/db/workflows";
import type { DbWorkflowSchedule } from "@/lib/db/schema";
import {
  createWorkflowScheduleSchema,
  type CreateWorkflowScheduleInput,
} from "@/lib/validators/workflows";

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

/**
 * Execution scaffold — deferred until Trigger.dev / cron worker is wired.
 *
 * Recommended path (see docs in response):
 * 1. Trigger.dev scheduled task polls `workflow_schedules` where enabled + active
 * 2. Creates `workflow_runs` row, invokes chat agent with prompt_snapshot
 * 3. Logs to `ai_generation_logs`, updates run status + schedule.last_run_at
 */
export async function triggerWorkflowRunStub(scheduleId: string) {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false as const, error: context.error };
  }

  return {
    ok: true as const,
    status: "pending_implementation" as const,
    scheduleId,
    message:
      "Workflow execution is not yet implemented. Schedule saved for when the job runner is connected.",
  };
}
