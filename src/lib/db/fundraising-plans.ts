import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import type { DbFundraisingPlan } from "@/lib/db/schema";
import {
  createFundraisingPlanSchema,
  updateFundraisingPlanSchema,
  type CreateFundraisingPlanInput,
  type UpdateFundraisingPlanInput,
} from "@/lib/validators/fundraising";

function mapFundraisingPlan(row: Record<string, unknown>): DbFundraisingPlan {
  return row as DbFundraisingPlan;
}

export async function getLatestFundraisingPlan(
  campaignId: string,
): Promise<DbFundraisingPlan | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("fundraising_plans")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapFundraisingPlan(data) : null;
}

export async function getFundraisingPlanById(
  campaignId: string,
  planId: string,
): Promise<DbFundraisingPlan | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("fundraising_plans")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("id", planId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapFundraisingPlan(data) : null;
}

export async function createFundraisingPlan(input: CreateFundraisingPlanInput) {
  const parsed = createFundraisingPlanSchema.parse(input);

  if (!isSupabaseConfigured()) {
    console.info(
      "[fundraising-plans] Supabase not configured — skipping plan create",
    );
    return { synced: false as const, plan: null };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("fundraising_plans")
    .insert({
      campaign_id: parsed.campaignId,
      title: parsed.title,
      goal_amount: parsed.goalAmount ?? null,
      raised_amount: parsed.raisedAmount ?? 0,
      plan_body: parsed.planBody ?? null,
      timeline_json: parsed.timeline ?? [],
      outreach_strategy: parsed.outreachStrategy ?? null,
      event_strategy: parsed.eventStrategy ?? null,
      ai_generated: parsed.aiGenerated ?? false,
      created_by: parsed.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    plan: mapFundraisingPlan(data),
  };
}

export async function updateFundraisingPlan(input: UpdateFundraisingPlanInput) {
  const parsed = updateFundraisingPlanSchema.parse(input);

  if (!isSupabaseConfigured()) {
    return { synced: false as const, plan: null };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.title !== undefined) updates.title = parsed.title;
  if (parsed.goalAmount !== undefined) updates.goal_amount = parsed.goalAmount;
  if (parsed.raisedAmount !== undefined) {
    updates.raised_amount = parsed.raisedAmount;
  }
  if (parsed.planBody !== undefined) updates.plan_body = parsed.planBody;
  if (parsed.timeline !== undefined) updates.timeline_json = parsed.timeline;
  if (parsed.outreachStrategy !== undefined) {
    updates.outreach_strategy = parsed.outreachStrategy;
  }
  if (parsed.eventStrategy !== undefined) {
    updates.event_strategy = parsed.eventStrategy;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("fundraising_plans")
    .update(updates)
    .eq("id", parsed.id)
    .eq("campaign_id", parsed.campaignId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    plan: mapFundraisingPlan(data),
  };
}

export async function upsertFundraisingPlan(input: CreateFundraisingPlanInput) {
  const existing = await getLatestFundraisingPlan(input.campaignId);

  if (existing) {
    return updateFundraisingPlan({
      id: existing.id,
      campaignId: input.campaignId,
      title: input.title,
      goalAmount: input.goalAmount,
      raisedAmount: input.raisedAmount,
      planBody: input.planBody,
      timeline: input.timeline,
      outreachStrategy: input.outreachStrategy,
      eventStrategy: input.eventStrategy,
    });
  }

  return createFundraisingPlan(input);
}

export type FundraisingProgressSummary = {
  profileGoal: number | null;
  planGoal: number | null;
  raisedAmount: number;
  effectiveGoal: number | null;
  progressPercent: number | null;
};

export function computeFundraisingProgress(input: {
  profileGoal: number | null | undefined;
  planGoal: number | null | undefined;
  raisedAmount: number | null | undefined;
}): FundraisingProgressSummary {
  const profileGoal =
    input.profileGoal != null ? Number(input.profileGoal) : null;
  const planGoal = input.planGoal != null ? Number(input.planGoal) : null;
  const raisedAmount = Number(input.raisedAmount ?? 0);

  const effectiveGoal =
    profileGoal != null && planGoal != null
      ? Math.max(profileGoal, planGoal)
      : (profileGoal ?? planGoal);

  const progressPercent =
    effectiveGoal != null && effectiveGoal > 0
      ? Math.min(100, Math.round((raisedAmount / effectiveGoal) * 100))
      : null;

  return {
    profileGoal,
    planGoal,
    raisedAmount,
    effectiveGoal,
    progressPercent,
  };
}
