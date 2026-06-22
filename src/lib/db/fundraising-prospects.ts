import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import type { DbFundraisingProspect } from "@/lib/db/schema";
import {
  createFundraisingProspectSchema,
  listFundraisingProspectsFilterSchema,
  updateFundraisingProspectSchema,
  type CreateFundraisingProspectInput,
  type ListFundraisingProspectsFilter,
  type UpdateFundraisingProspectInput,
} from "@/lib/validators/fundraising";

function mapFundraisingProspect(
  row: Record<string, unknown>,
): DbFundraisingProspect {
  return row as DbFundraisingProspect;
}

function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function createFundraisingProspect(
  input: CreateFundraisingProspectInput,
) {
  const parsed = createFundraisingProspectSchema.parse(input);

  if (!isSupabaseConfigured()) {
    console.info(
      "[fundraising-prospects] Supabase not configured — skipping prospect create",
    );
    return { synced: false as const, prospect: null };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("fundraising_prospects")
    .insert({
      campaign_id: parsed.campaignId,
      name: parsed.name,
      prospect_type: parsed.prospectType,
      organization_name: parsed.organizationName ?? null,
      email: normalizeEmail(parsed.email),
      phone: parsed.phone ?? null,
      website: parsed.website ?? null,
      location: parsed.location ?? null,
      alignment_reason: parsed.alignmentReason ?? null,
      related_issue: parsed.relatedIssue ?? null,
      estimated_capacity: parsed.estimatedCapacity ?? null,
      status: parsed.status ?? "research",
      notes: parsed.notes ?? null,
      outreach_history_json: parsed.outreachHistory ?? [],
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    prospect: mapFundraisingProspect(data),
  };
}

export async function updateFundraisingProspect(
  input: UpdateFundraisingProspectInput,
) {
  const parsed = updateFundraisingProspectSchema.parse(input);

  if (!isSupabaseConfigured()) {
    return { synced: false as const, prospect: null };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.name !== undefined) updates.name = parsed.name;
  if (parsed.prospectType !== undefined) {
    updates.prospect_type = parsed.prospectType;
  }
  if (parsed.organizationName !== undefined) {
    updates.organization_name = parsed.organizationName;
  }
  if (parsed.email !== undefined) {
    updates.email = normalizeEmail(parsed.email);
  }
  if (parsed.phone !== undefined) updates.phone = parsed.phone;
  if (parsed.website !== undefined) updates.website = parsed.website;
  if (parsed.location !== undefined) updates.location = parsed.location;
  if (parsed.alignmentReason !== undefined) {
    updates.alignment_reason = parsed.alignmentReason;
  }
  if (parsed.relatedIssue !== undefined) {
    updates.related_issue = parsed.relatedIssue;
  }
  if (parsed.estimatedCapacity !== undefined) {
    updates.estimated_capacity = parsed.estimatedCapacity;
  }
  if (parsed.status !== undefined) updates.status = parsed.status;
  if (parsed.notes !== undefined) updates.notes = parsed.notes;
  if (parsed.outreachHistory !== undefined) {
    updates.outreach_history_json = parsed.outreachHistory;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("fundraising_prospects")
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
    prospect: mapFundraisingProspect(data),
  };
}

export async function getFundraisingProspectById(
  campaignId: string,
  prospectId: string,
): Promise<DbFundraisingProspect | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("fundraising_prospects")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("id", prospectId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapFundraisingProspect(data) : null;
}

export async function listFundraisingProspects(
  filter: ListFundraisingProspectsFilter,
): Promise<DbFundraisingProspect[]> {
  const parsed = listFundraisingProspectsFilterSchema.parse(filter);

  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("fundraising_prospects")
    .select("*")
    .eq("campaign_id", parsed.campaignId)
    .order("updated_at", { ascending: false });

  if (parsed.status) {
    query = query.eq("status", parsed.status);
  }
  if (parsed.relatedIssue) {
    query = query.eq("related_issue", parsed.relatedIssue);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapFundraisingProspect);
}

export async function countFundraisingProspects(
  campaignId: string,
): Promise<number> {
  if (!isSupabaseConfigured()) {
    return 0;
  }

  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("fundraising_prospects")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .neq("status", "archived");

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function deleteFundraisingProspect(
  campaignId: string,
  prospectId: string,
) {
  if (!isSupabaseConfigured()) {
    return { synced: false as const };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("fundraising_prospects")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("id", prospectId);

  if (error) {
    throw error;
  }

  return { synced: true as const };
}

export async function countTasksByProspectIds(
  campaignId: string,
  prospectIds: string[],
): Promise<Record<string, number>> {
  if (!isSupabaseConfigured() || prospectIds.length === 0) {
    return {};
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .select("related_prospect_id")
    .eq("campaign_id", campaignId)
    .in("related_prospect_id", prospectIds)
    .neq("status", "archived");

  if (error) {
    throw error;
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const prospectId = row.related_prospect_id as string | null;
    if (!prospectId) continue;
    counts[prospectId] = (counts[prospectId] ?? 0) + 1;
  }

  return counts;
}
