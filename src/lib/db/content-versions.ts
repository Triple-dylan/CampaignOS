import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import type { DbContentVersion } from "@/lib/db/schema";

export type SaveContentVersionInput = {
  campaignId: string;
  objectType: string;
  objectId: string;
  version: number;
  content?: string | null;
  contentJson?: Record<string, unknown> | null;
  createdBy?: string | null;
  agentId?: string | null;
};

export async function saveContentVersion(
  input: SaveContentVersionInput,
): Promise<DbContentVersion | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("content_versions")
    .insert({
      campaign_id: input.campaignId,
      object_type: input.objectType,
      object_id: input.objectId,
      version: input.version,
      content: input.content ?? null,
      content_json: input.contentJson ?? null,
      created_by: input.createdBy ?? null,
      agent_id: input.agentId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[content-versions] save failed", error);
    return null;
  }

  return data as DbContentVersion;
}

export async function getLatestContentVersion(
  campaignId: string,
  objectType: string,
  objectId: string,
): Promise<DbContentVersion | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("content_versions")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("object_type", objectType)
    .eq("object_id", objectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as DbContentVersion | null;
}

export async function listContentVersions(
  campaignId: string,
  objectType: string,
  objectId: string,
  limit = 20,
): Promise<DbContentVersion[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("content_versions")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("object_type", objectType)
    .eq("object_id", objectId)
    .order("version", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as DbContentVersion[];
}

/**
 * Optimistic concurrency helper. Returns the next version if `expectedVersion`
 * matches the latest stored version (or no versions exist yet and expected is 0/1).
 * Otherwise returns a conflict with the current version.
 */
export async function claimNextContentVersion(input: {
  campaignId: string;
  objectType: string;
  objectId: string;
  expectedVersion: number;
  content?: string | null;
  contentJson?: Record<string, unknown> | null;
  createdBy?: string | null;
  agentId?: string | null;
}): Promise<
  | { ok: true; version: number; snapshot: DbContentVersion | null }
  | { ok: false; code: "conflict"; currentVersion: number }
> {
  const latest = await getLatestContentVersion(
    input.campaignId,
    input.objectType,
    input.objectId,
  );
  const currentVersion = latest?.version ?? 0;

  if (input.expectedVersion !== currentVersion && currentVersion !== 0) {
    // Allow first write when row has content_version=1 but no snapshot yet.
    if (!(currentVersion === 0 && input.expectedVersion <= 1)) {
      if (latest && latest.version !== input.expectedVersion) {
        return {
          ok: false,
          code: "conflict",
          currentVersion: latest.version,
        };
      }
    }
  }

  if (latest && latest.version !== input.expectedVersion) {
    // Soft: if table row version was passed and differs from snapshot history
    if (input.expectedVersion < latest.version) {
      return {
        ok: false,
        code: "conflict",
        currentVersion: latest.version,
      };
    }
  }

  const nextVersion = Math.max(currentVersion, input.expectedVersion) + 1;
  const snapshot = await saveContentVersion({
    campaignId: input.campaignId,
    objectType: input.objectType,
    objectId: input.objectId,
    version: nextVersion,
    content: input.content,
    contentJson: input.contentJson,
    createdBy: input.createdBy,
    agentId: input.agentId,
  });

  return { ok: true, version: nextVersion, snapshot };
}
