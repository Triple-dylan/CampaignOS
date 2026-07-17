import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import type {
  ActivityActorKind,
  DbActivityEvent,
} from "@/lib/db/schema";

export type RecordActivityInput = {
  organizationId: string;
  campaignId: string;
  actorKind?: ActivityActorKind;
  actorUserId?: string | null;
  agentId?: string | null;
  action: string;
  objectType: string;
  objectId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
};

export async function recordActivityEvent(
  input: RecordActivityInput,
): Promise<DbActivityEvent | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("activity_events")
    .insert({
      organization_id: input.organizationId,
      campaign_id: input.campaignId,
      actor_kind: input.actorKind ?? "user",
      actor_user_id: input.actorUserId ?? null,
      agent_id: input.agentId ?? null,
      action: input.action,
      object_type: input.objectType,
      object_id: input.objectId ?? null,
      summary: input.summary,
      metadata_json: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) {
    console.error("[activity] record failed", error);
    return null;
  }

  return data as DbActivityEvent;
}

export async function listActivityEvents(
  campaignId: string,
  options?: { limit?: number; objectType?: string; objectId?: string },
): Promise<DbActivityEvent[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("activity_events")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 40);

  if (options?.objectType) {
    query = query.eq("object_type", options.objectType);
  }
  if (options?.objectId) {
    query = query.eq("object_id", options.objectId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []) as DbActivityEvent[];
}
