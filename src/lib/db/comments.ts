import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import type { DbComment, DbCommentThread } from "@/lib/db/schema";

export async function getOrCreateCommentThread(input: {
  campaignId: string;
  objectType: string;
  objectId: string;
  createdBy?: string | null;
}): Promise<DbCommentThread | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseAdmin();
  const existing = await supabase
    .from("comment_threads")
    .select("*")
    .eq("campaign_id", input.campaignId)
    .eq("object_type", input.objectType)
    .eq("object_id", input.objectId)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data) return existing.data as DbCommentThread;

  const { data, error } = await supabase
    .from("comment_threads")
    .insert({
      campaign_id: input.campaignId,
      object_type: input.objectType,
      object_id: input.objectId,
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) {
    // Race: unique conflict — fetch again
    const again = await supabase
      .from("comment_threads")
      .select("*")
      .eq("campaign_id", input.campaignId)
      .eq("object_type", input.objectType)
      .eq("object_id", input.objectId)
      .maybeSingle();
    if (again.error) throw again.error;
    return (again.data as DbCommentThread | null) ?? null;
  }

  return data as DbCommentThread;
}

export async function getCommentThreadById(
  threadId: string,
): Promise<DbCommentThread | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("comment_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();
  if (error) throw error;
  return data as DbCommentThread | null;
}

export async function listComments(threadId: string): Promise<DbComment[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbComment[];
}

export async function addComment(input: {
  threadId: string;
  authorKind?: "user" | "agent";
  authorUserId?: string | null;
  agentId?: string | null;
  body: string;
  parentId?: string | null;
  mentionUserIds?: string[];
  mentionAgentIds?: string[];
  metadata?: Record<string, unknown>;
}): Promise<DbComment | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("comments")
    .insert({
      thread_id: input.threadId,
      author_kind: input.authorKind ?? "user",
      author_user_id: input.authorUserId ?? null,
      agent_id: input.agentId ?? null,
      body: input.body,
      parent_id: input.parentId ?? null,
      mention_user_ids: input.mentionUserIds ?? [],
      mention_agent_ids: input.mentionAgentIds ?? [],
      metadata_json: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;

  await supabase
    .from("comment_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.threadId);

  return data as DbComment;
}

export async function setCommentThreadResolved(input: {
  threadId: string;
  resolved: boolean;
  resolvedBy?: string | null;
}): Promise<DbCommentThread | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("comment_threads")
    .update({
      resolved_at: input.resolved ? new Date().toISOString() : null,
      resolved_by: input.resolved ? (input.resolvedBy ?? null) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.threadId)
    .select("*")
    .single();
  if (error) throw error;
  return data as DbCommentThread;
}

export async function listUnresolvedThreadObjectIds(
  campaignId: string,
  objectType?: string,
): Promise<Array<{ object_type: string; object_id: string; id: string }>> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("comment_threads")
    .select("id, object_type, object_id")
    .eq("campaign_id", campaignId)
    .is("resolved_at", null);
  if (objectType) {
    query = query.eq("object_type", objectType);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Array<{
    object_type: string;
    object_id: string;
    id: string;
  }>;
}
