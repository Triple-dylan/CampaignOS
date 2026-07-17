import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import type {
  DbPrivateChatMessage,
  DbPrivateChatThread,
} from "@/lib/db/schema";

export async function listPrivateChatThreads(
  campaignId: string,
  userId: string,
): Promise<DbPrivateChatThread[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("private_chat_threads")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbPrivateChatThread[];
}

export async function createPrivateChatThread(input: {
  campaignId: string;
  userId: string;
  title?: string;
  threadId?: string;
}): Promise<DbPrivateChatThread | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseAdmin();
  const row: Record<string, unknown> = {
    campaign_id: input.campaignId,
    user_id: input.userId,
    title: input.title ?? "New chat",
  };
  if (input.threadId) {
    row.id = input.threadId;
  }

  const { data, error } = await supabase
    .from("private_chat_threads")
    .insert(row)
    .select("*")
    .single();

  if (error) throw error;
  return data as DbPrivateChatThread;
}

export async function getPrivateChatThreadForUser(input: {
  threadId: string;
  userId: string;
}): Promise<DbPrivateChatThread | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("private_chat_threads")
    .select("*")
    .eq("id", input.threadId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (error) throw error;
  return data as DbPrivateChatThread | null;
}

export async function listPrivateChatMessages(
  threadId: string,
): Promise<DbPrivateChatMessage[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("private_chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DbPrivateChatMessage[];
}

export async function appendPrivateChatMessage(input: {
  threadId: string;
  role: "user" | "assistant";
  content: string;
  agentId?: string | null;
  metadata?: Record<string, unknown>;
  messageId?: string;
}): Promise<DbPrivateChatMessage | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseAdmin();
  const row: Record<string, unknown> = {
    thread_id: input.threadId,
    role: input.role,
    content: input.content,
    agent_id: input.agentId ?? null,
    metadata_json: input.metadata ?? {},
  };
  if (input.messageId) {
    row.id = input.messageId;
  }

  const { data, error } = await supabase
    .from("private_chat_messages")
    .insert(row)
    .select("*")
    .single();

  if (error) throw error;

  await supabase
    .from("private_chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.threadId);

  return data as DbPrivateChatMessage;
}

export async function touchPrivateChatThreadTitle(
  threadId: string,
  title: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseAdmin();
  await supabase
    .from("private_chat_threads")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", threadId);
}
