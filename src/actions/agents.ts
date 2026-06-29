"use server";

import type { AgentMode } from "@/actions/chat";
import { AGENT_LOG_MODULES } from "@/lib/agents";
import { requireCampaignContext } from "@/lib/auth/require-campaign-context";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import type { DbWorkflowRun, DbWorkflowSchedule } from "@/lib/db/schema";
import { loadSkill } from "@/lib/harness/skills/loader";
import type { SkillDefinition } from "@/lib/harness/types";

export type AgentGenerationLogSummary = {
  id: string;
  module: string;
  prompt: string | null;
  outputText: string | null;
  createdAt: string;
};

export type AgentConsolePayload = {
  schedules: DbWorkflowSchedule[];
  runs: DbWorkflowRun[];
  recentLogs: AgentGenerationLogSummary[];
  defaultSkill: SkillDefinition | null;
};

function mapSchedule(row: Record<string, unknown>): DbWorkflowSchedule {
  return row as DbWorkflowSchedule;
}

function mapRun(row: Record<string, unknown>): DbWorkflowRun {
  return row as DbWorkflowRun;
}

async function listSchedulesForAgent(
  campaignId: string,
  agentMode: AgentMode,
): Promise<DbWorkflowSchedule[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("workflow_schedules")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("agent_mode", agentMode)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []).map(mapSchedule);
}

async function listRunsForAgent(
  campaignId: string,
  agentMode: AgentMode,
): Promise<DbWorkflowRun[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("workflow_runs")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("agent_mode", agentMode)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;
  return (data ?? []).map(mapRun);
}

async function listGenerationLogsForAgent(
  campaignId: string,
  agentMode: AgentMode,
): Promise<AgentGenerationLogSummary[]> {
  if (!isSupabaseConfigured()) return [];

  const modules = AGENT_LOG_MODULES[agentMode];
  const moduleOnly = modules.filter((module) => module !== "workspace_chat");

  const supabase = getSupabaseAdmin();
  const queries = [];

  if (moduleOnly.length > 0) {
    queries.push(
      supabase
        .from("ai_generation_logs")
        .select("id, module, prompt, output_text, created_at, input_json")
        .eq("campaign_id", campaignId)
        .in("module", moduleOnly)
        .order("created_at", { ascending: false })
        .limit(10),
    );
  }

  queries.push(
    supabase
      .from("ai_generation_logs")
      .select("id, module, prompt, output_text, created_at, input_json")
      .eq("campaign_id", campaignId)
      .eq("module", "workspace_chat")
      .order("created_at", { ascending: false })
      .limit(30),
  );

  const results = await Promise.all(queries);
  const merged: AgentGenerationLogSummary[] = [];

  for (const result of results) {
    if (result.error) throw result.error;
    for (const row of result.data ?? []) {
      const inputJson = row.input_json as Record<string, unknown> | null;
      if (
        row.module === "workspace_chat" &&
        inputJson?.agentMode !== agentMode
      ) {
        continue;
      }
      merged.push({
        id: row.id as string,
        module: row.module as string,
        prompt: (row.prompt as string | null) ?? null,
        outputText: (row.output_text as string | null) ?? null,
        createdAt: row.created_at as string,
      });
    }
  }

  merged.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return merged.slice(0, 10);
}

export async function getAgentConsoleData(
  agentMode: AgentMode,
  defaultSkillId: string,
): Promise<
  | { ok: false; error: string }
  | { ok: true; data: AgentConsolePayload }
> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error };
  }

  const [schedules, runs, recentLogs, defaultSkill] = await Promise.all([
    listSchedulesForAgent(context.campaign.id, agentMode),
    listRunsForAgent(context.campaign.id, agentMode),
    listGenerationLogsForAgent(context.campaign.id, agentMode),
    loadSkill(`skills/${defaultSkillId}/SKILL.md`),
  ]);

  return {
    ok: true,
    data: { schedules, runs, recentLogs, defaultSkill },
  };
}
