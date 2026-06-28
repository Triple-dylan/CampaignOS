import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import type { DbWorkflowSchedule } from "@/lib/db/schema";
import { toCronExpression } from "@/lib/workflows/schedule";
import {
  createWorkflowScheduleSchema,
  type CreateWorkflowScheduleInput,
} from "@/lib/validators/workflows";

function mapSchedule(row: Record<string, unknown>): DbWorkflowSchedule {
  return row as DbWorkflowSchedule;
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
      status: "pending_implementation",
      created_by: parsed.createdBy ?? null,
      metadata_json: { source: "ui_scaffold" },
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
