import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import type { DbWorkflowRun, DbWorkflowSchedule } from "@/lib/db/schema";
import { buildScheduleMetadata } from "@/lib/workflows/resolve-schedule";
import { computeNextRunAt, isScheduleDue, toCronExpression } from "@/lib/workflows/schedule";
import {
  createWorkflowScheduleSchema,
  type CreateWorkflowScheduleInput,
} from "@/lib/validators/workflows";

function mapSchedule(row: Record<string, unknown>): DbWorkflowSchedule {
  return row as DbWorkflowSchedule;
}

function mapRun(row: Record<string, unknown>): DbWorkflowRun {
  return row as DbWorkflowRun;
}

export async function listWorkflowSchedules(campaignId: string) {
  if (!isSupabaseConfigured()) {
    return { synced: false as const, schedules: [] as DbWorkflowSchedule[] };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("workflow_schedules")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    schedules: (data ?? []).map(mapSchedule),
  };
}

export async function createWorkflowSchedule(input: CreateWorkflowScheduleInput) {
  const parsed = createWorkflowScheduleSchema.parse(input);

  if (!isSupabaseConfigured()) {
    console.info(
      "[workflows] Supabase not configured — skipping schedule create",
    );
    return { synced: false as const, schedule: null };
  }

  const cronExpression = toCronExpression({
    scheduleType: parsed.scheduleType,
    cronExpression: parsed.cronExpression,
    scheduleConfig: parsed.scheduleConfig,
  });

  const scheduleConfig = {
    hour: parsed.scheduleConfig?.hour ?? 9,
    minute: parsed.scheduleConfig?.minute ?? 0,
    dayOfWeek: parsed.scheduleConfig?.dayOfWeek ?? 1,
    timezone: parsed.scheduleConfig?.timezone ?? "America/Los_Angeles",
  };

  const nextRunAt = computeNextRunAt({
    scheduleType: parsed.scheduleType,
    cronExpression,
    scheduleConfig,
  });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("workflow_schedules")
    .insert({
      campaign_id: parsed.campaignId,
      name: parsed.name,
      description: parsed.description ?? null,
      prompt: parsed.prompt,
      agent_mode: parsed.agentMode,
      schedule_type: parsed.scheduleType,
      cron_expression: cronExpression,
      schedule_config: scheduleConfig,
      enabled: parsed.enabled,
      status: parsed.enabled ? "active" : "paused",
      next_run_at: nextRunAt,
      created_by: parsed.createdBy ?? null,
      metadata_json: buildScheduleMetadata({
        prompt: parsed.prompt,
        agentMode: parsed.agentMode,
        source: "ui_scaffold",
      }),
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    schedule: mapSchedule(data),
  };
}

export async function getWorkflowScheduleById(
  scheduleId: string,
  campaignId: string,
) {
  if (!isSupabaseConfigured()) {
    return { synced: false as const, schedule: null as DbWorkflowSchedule | null };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("workflow_schedules")
    .select("*")
    .eq("id", scheduleId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    schedule: data ? mapSchedule(data) : null,
  };
}

export async function listWorkflowRuns(campaignId: string, limit = 50) {
  if (!isSupabaseConfigured()) {
    return { synced: false as const, runs: [] as DbWorkflowRun[] };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("workflow_runs")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    runs: (data ?? []).map(mapRun),
  };
}

export async function createWorkflowRun(input: {
  scheduleId: string;
  campaignId: string;
  promptSnapshot: string;
  agentMode: string;
  metadata?: Record<string, unknown>;
}) {
  if (!isSupabaseConfigured()) {
    return { synced: false as const, run: null as DbWorkflowRun | null };
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("workflow_runs")
    .insert({
      schedule_id: input.scheduleId,
      campaign_id: input.campaignId,
      status: "running",
      prompt_snapshot: input.promptSnapshot,
      agent_mode: input.agentMode,
      started_at: now,
      metadata_json: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    run: mapRun(data),
  };
}

export async function updateWorkflowRun(input: {
  runId: string;
  status: "running" | "completed" | "failed";
  outputText?: string | null;
  outputJson?: Record<string, unknown> | null;
  errorMessage?: string | null;
  aiGenerationLogId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (!isSupabaseConfigured()) {
    return { synced: false as const };
  }

  const supabase = getSupabaseAdmin();
  const updates: Record<string, unknown> = {
    status: input.status,
  };

  if (input.status === "completed" || input.status === "failed") {
    updates.completed_at = new Date().toISOString();
  }
  if (input.outputText !== undefined) {
    updates.output_text = input.outputText;
  }
  if (input.outputJson !== undefined) {
    updates.output_json = input.outputJson;
  }
  if (input.errorMessage !== undefined) {
    updates.error_message = input.errorMessage;
  }
  if (input.aiGenerationLogId !== undefined) {
    updates.ai_generation_log_id = input.aiGenerationLogId;
  }
  if (input.metadata) {
    updates.metadata_json = input.metadata;
  }

  const { error } = await supabase
    .from("workflow_runs")
    .update(updates)
    .eq("id", input.runId);

  if (error) {
    throw error;
  }

  return { synced: true as const };
}

export async function listDueWorkflowSchedules(limit = 25) {
  if (!isSupabaseConfigured()) {
    return { synced: false as const, schedules: [] as DbWorkflowSchedule[] };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("workflow_schedules")
    .select("*")
    .eq("enabled", true)
    .order("next_run_at", { ascending: true, nullsFirst: false })
    .limit(limit * 4);

  if (error) {
    throw error;
  }

  const now = new Date();
  const schedules = (data ?? [])
    .map(mapSchedule)
    .filter((schedule) => isScheduleDue(schedule, now))
    .slice(0, limit);

  return {
    synced: true as const,
    schedules,
  };
}

export async function markScheduleRan(input: {
  scheduleId: string;
  status?: "active" | "error" | "paused";
  scheduleType?: string;
  scheduleConfig?: Record<string, unknown> | null;
  cronExpression?: string | null;
}) {
  if (!isSupabaseConfigured()) {
    return { synced: false as const };
  }

  const nextRunAt =
    input.scheduleType != null
      ? computeNextRunAt({
          scheduleType: input.scheduleType as CreateWorkflowScheduleInput["scheduleType"],
          cronExpression: input.cronExpression,
          scheduleConfig: input.scheduleConfig ?? undefined,
        })
      : null;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("workflow_schedules")
    .update({
      last_run_at: new Date().toISOString(),
      next_run_at: nextRunAt,
      status: input.status ?? "active",
    })
    .eq("id", input.scheduleId);

  if (error) {
    throw error;
  }

  return { synced: true as const };
}
