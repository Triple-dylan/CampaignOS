import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import type { DbResearchBrief } from "@/lib/db/schema";
import {
  createResearchBriefSchema,
  listResearchBriefsFilterSchema,
  updateResearchBriefSchema,
  type CreateResearchBriefInput,
  type ListResearchBriefsFilter,
  type UpdateResearchBriefInput,
} from "@/lib/validators/research-briefs";

function mapResearchBrief(row: Record<string, unknown>): DbResearchBrief {
  return row as DbResearchBrief;
}

export async function createResearchBrief(input: CreateResearchBriefInput) {
  const parsed = createResearchBriefSchema.parse(input);

  if (!isSupabaseConfigured()) {
    console.info(
      "[research-briefs] Supabase not configured — skipping brief create",
    );
    return { synced: false as const, brief: null };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("research_briefs")
    .insert({
      campaign_id: parsed.campaignId,
      research_type: parsed.researchType,
      title: parsed.title,
      topic: parsed.topic ?? null,
      summary: parsed.summary ?? null,
      body: parsed.body ?? null,
      key_findings_json: parsed.keyFindings ?? [],
      sources_json: parsed.sources ?? [],
      status: parsed.status ?? "draft",
      ai_generated: parsed.aiGenerated ?? false,
      prompt_used: parsed.promptUsed ?? null,
      model_used: parsed.modelUsed ?? null,
      confidence_level: parsed.confidenceLevel ?? null,
      created_by: parsed.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    brief: mapResearchBrief(data),
  };
}

export async function updateResearchBrief(input: UpdateResearchBriefInput) {
  const parsed = updateResearchBriefSchema.parse(input);

  if (!isSupabaseConfigured()) {
    return { synced: false as const, brief: null };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.researchType !== undefined) {
    updates.research_type = parsed.researchType;
  }
  if (parsed.title !== undefined) updates.title = parsed.title;
  if (parsed.topic !== undefined) updates.topic = parsed.topic;
  if (parsed.summary !== undefined) updates.summary = parsed.summary;
  if (parsed.body !== undefined) updates.body = parsed.body;
  if (parsed.keyFindings !== undefined) {
    updates.key_findings_json = parsed.keyFindings;
  }
  if (parsed.sources !== undefined) updates.sources_json = parsed.sources;
  if (parsed.status !== undefined) updates.status = parsed.status;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("research_briefs")
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
    brief: mapResearchBrief(data),
  };
}

export async function getResearchBriefById(
  campaignId: string,
  briefId: string,
): Promise<DbResearchBrief | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("research_briefs")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("id", briefId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapResearchBrief(data) : null;
}

export async function listResearchBriefs(
  filter: ListResearchBriefsFilter,
): Promise<DbResearchBrief[]> {
  const parsed = listResearchBriefsFilterSchema.parse(filter);

  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("research_briefs")
    .select("*")
    .eq("campaign_id", parsed.campaignId)
    .order("updated_at", { ascending: false });

  if (parsed.researchType) {
    query = query.eq("research_type", parsed.researchType);
  }
  if (parsed.status) {
    query = query.eq("status", parsed.status);
  }
  if (parsed.createdAfter) {
    query = query.gte("created_at", parsed.createdAfter);
  }
  if (parsed.createdBefore) {
    query = query.lte("created_at", parsed.createdBefore);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapResearchBrief);
}

export async function countResearchBriefs(campaignId: string): Promise<number> {
  if (!isSupabaseConfigured()) {
    return 0;
  }

  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("research_briefs")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function deleteResearchBrief(
  campaignId: string,
  briefId: string,
) {
  if (!isSupabaseConfigured()) {
    return { synced: false as const };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("research_briefs")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("id", briefId);

  if (error) {
    throw error;
  }

  return { synced: true as const };
}
