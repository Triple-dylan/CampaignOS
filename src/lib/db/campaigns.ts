import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import type {
  DbCampaign,
  DbCampaignProfile,
  DbGraphEdge,
  DbGraphNode,
} from "@/lib/db/schema";
import type { CampaignGraphPreferences } from "@/lib/graph/graph-preferences";
import { toCampaignSummary } from "@/lib/db/schema";
import { getOrganizationByClerkOrgId } from "@/lib/db/organizations";
import {
  createCampaignSchema,
  updateCampaignSchema,
  upsertCampaignProfileSchema,
  type CreateCampaignInput,
  type UpdateCampaignInput,
  type UpsertCampaignProfileInput,
} from "@/lib/validators/campaigns";

function mapCampaign(row: DbCampaign): DbCampaign {
  return row;
}

export async function createCampaign(input: CreateCampaignInput) {
  const parsed = createCampaignSchema.parse(input);

  if (!isSupabaseConfigured()) {
    return { synced: false as const, campaign: null };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      organization_id: parsed.organizationId,
      candidate_name: parsed.candidateName ?? null,
      office_sought: parsed.officeSought ?? null,
      jurisdiction: parsed.jurisdiction ?? null,
      state: parsed.state ?? "WA",
      district: parsed.district ?? null,
      party: parsed.party ?? null,
      election_date: parsed.electionDate ?? null,
      campaign_website: parsed.campaignWebsite || null,
      campaign_status: parsed.campaignStatus,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    campaign: mapCampaign(data as DbCampaign),
  };
}

export async function updateCampaign(input: UpdateCampaignInput) {
  const parsed = updateCampaignSchema.parse(input);

  if (!isSupabaseConfigured()) {
    return { synced: false as const, campaign: null };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.candidateName !== undefined) {
    updates.candidate_name = parsed.candidateName;
  }
  if (parsed.officeSought !== undefined) {
    updates.office_sought = parsed.officeSought;
  }
  if (parsed.jurisdiction !== undefined) {
    updates.jurisdiction = parsed.jurisdiction;
  }
  if (parsed.state !== undefined) {
    updates.state = parsed.state;
  }
  if (parsed.district !== undefined) {
    updates.district = parsed.district;
  }
  if (parsed.party !== undefined) {
    updates.party = parsed.party;
  }
  if (parsed.electionDate !== undefined) {
    updates.election_date = parsed.electionDate;
  }
  if (parsed.campaignWebsite !== undefined) {
    updates.campaign_website = parsed.campaignWebsite || null;
  }
  if (parsed.campaignStatus !== undefined) {
    updates.campaign_status = parsed.campaignStatus;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("campaigns")
    .update(updates)
    .eq("id", parsed.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    campaign: mapCampaign(data as DbCampaign),
  };
}

export async function getCampaignById(
  campaignId: string,
): Promise<DbCampaign | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as DbCampaign | null) ?? null;
}

export async function getCampaignByOrganizationId(
  organizationId: string,
  options?: { status?: DbCampaign["campaign_status"] },
): Promise<DbCampaign | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("campaigns")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (options?.status) {
    query = query.eq("campaign_status", options.status);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return (data as DbCampaign | null) ?? null;
}

export async function getActiveCampaignForClerkOrg(clerkOrgId: string) {
  const organization = await getOrganizationByClerkOrgId(clerkOrgId);

  if (!organization) {
    return null;
  }

  const campaign = await getCampaignByOrganizationId(organization.id, {
    status: "active",
  });

  return campaign ? toCampaignSummary(campaign) : null;
}

export async function upsertCampaignProfile(
  input: UpsertCampaignProfileInput,
) {
  const parsed = upsertCampaignProfileSchema.parse(input);

  if (!isSupabaseConfigured()) {
    return { synced: false as const, profile: null };
  }

  const supabase = getSupabaseAdmin();
  const row: Record<string, unknown> = {
    campaign_id: parsed.campaignId,
    updated_at: new Date().toISOString(),
  };

  if (parsed.candidateBio !== undefined) {
    row.candidate_bio = parsed.candidateBio ?? null;
  }
  if (parsed.campaignThemes !== undefined) {
    row.campaign_themes = parsed.campaignThemes ?? [];
  }
  if (parsed.topIssues !== undefined) {
    row.top_issues = parsed.topIssues ?? [];
  }
  if (parsed.voterSegments !== undefined) {
    row.voter_segments = parsed.voterSegments ?? [];
  }
  if (parsed.tonePreferences !== undefined) {
    row.tone_preferences = parsed.tonePreferences ?? {};
  }
  if (parsed.opponentNames !== undefined) {
    row.opponent_names = parsed.opponentNames ?? [];
  }
  if (parsed.fundraisingGoal !== undefined) {
    row.fundraising_goal = parsed.fundraisingGoal ?? null;
  }
  if (parsed.summary !== undefined) {
    row.summary = parsed.summary ?? null;
  }
  if (parsed.messageFramework !== undefined) {
    row.message_framework = parsed.messageFramework ?? {};
  }
  if (parsed.issueMap !== undefined) {
    row.issue_map = parsed.issueMap ?? [];
  }
  if (parsed.brainGeneratedAt !== undefined) {
    row.brain_generated_at = parsed.brainGeneratedAt ?? null;
  }

  const { data, error } = await supabase
    .from("campaign_profiles")
    .upsert(row, { onConflict: "campaign_id" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    profile: data as DbCampaignProfile,
  };
}

export async function getCampaignProfile(
  campaignId: string,
): Promise<DbCampaignProfile | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("campaign_profiles")
    .select("*")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as DbCampaignProfile | null) ?? null;
}

export async function listGraphNodes(
  campaignId: string,
): Promise<DbGraphNode[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("graph_nodes")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as DbGraphNode[];
}

export async function listGraphEdges(
  campaignId: string,
): Promise<DbGraphEdge[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("graph_edges")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as DbGraphEdge[];
}

export async function countGraphNodes(campaignId: string): Promise<number> {
  if (!isSupabaseConfigured()) {
    return 0;
  }

  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("graph_nodes")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getCampaignGraphPreferences(
  campaignId: string,
): Promise<Partial<CampaignGraphPreferences> | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("campaigns")
    .select("graph_preferences")
    .eq("id", campaignId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (
    (data?.graph_preferences as Partial<CampaignGraphPreferences> | null) ?? null
  );
}

export async function updateCampaignGraphPreferences(
  campaignId: string,
  preferences: CampaignGraphPreferences,
): Promise<{ synced: boolean }> {
  if (!isSupabaseConfigured()) {
    return { synced: false };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("campaigns")
    .update({
      graph_preferences: preferences,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  if (error) {
    throw error;
  }

  return { synced: true };
}
