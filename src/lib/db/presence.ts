import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import type { DbPresenceSession, PresenceAction } from "@/lib/db/schema";

const PRESENCE_TTL_MS = 90_000;

export async function upsertPresenceSession(input: {
  campaignId: string;
  userId: string;
  module?: string | null;
  objectType?: string | null;
  objectId?: string | null;
  action?: PresenceAction;
}): Promise<DbPresenceSession | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("presence_sessions")
    .upsert(
      {
        campaign_id: input.campaignId,
        user_id: input.userId,
        module: input.module ?? null,
        object_type: input.objectType ?? null,
        object_id: input.objectId ?? null,
        action: input.action ?? "viewing",
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "campaign_id,user_id" },
    )
    .select("*")
    .single();

  if (error) {
    console.error("[presence] upsert failed", error);
    return null;
  }

  return data as DbPresenceSession;
}

export async function listActivePresence(
  campaignId: string,
): Promise<DbPresenceSession[]> {
  if (!isSupabaseConfigured()) return [];

  const since = new Date(Date.now() - PRESENCE_TTL_MS).toISOString();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("presence_sessions")
    .select("*")
    .eq("campaign_id", campaignId)
    .gte("last_seen_at", since)
    .order("last_seen_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbPresenceSession[];
}

export async function clearPresenceSession(input: {
  campaignId: string;
  userId: string;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseAdmin();
  await supabase
    .from("presence_sessions")
    .delete()
    .eq("campaign_id", input.campaignId)
    .eq("user_id", input.userId);
}

export { PRESENCE_TTL_MS };
