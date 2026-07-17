"use server";

import { requireCampaignContext } from "@/lib/auth/require-campaign-context";
import { isSupabaseConfigured } from "@/lib/db/client";
import {
  appendPrivateChatMessage,
  createPrivateChatThread,
  getPrivateChatThreadForUser,
  listPrivateChatMessages,
  listPrivateChatThreads,
  touchPrivateChatThreadTitle,
} from "@/lib/db/private-chat";

export type PrivateChatMessageDTO = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  agentId?: string;
};

export type PrivateChatThreadDTO = {
  id: string;
  title: string;
  createdAt: number;
  messages: PrivateChatMessageDTO[];
};

export async function loadPrivateChatThreads(): Promise<{
  ok: boolean;
  threads: PrivateChatThreadDTO[];
  error?: string;
}> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, threads: [], error: context.error };
  }
  if (!context.dbUserId || !isSupabaseConfigured()) {
    return { ok: true, threads: [] };
  }

  try {
    const threads = await listPrivateChatThreads(
      context.campaign.id,
      context.dbUserId,
    );
    const hydrated: PrivateChatThreadDTO[] = [];
    for (const thread of threads.slice(0, 20)) {
      const messages = await listPrivateChatMessages(thread.id);
      hydrated.push({
        id: thread.id,
        title: thread.title,
        createdAt: new Date(thread.created_at).getTime(),
        messages: messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          createdAt: new Date(message.created_at).getTime(),
          agentId: message.agent_id ?? undefined,
        })),
      });
    }
    return { ok: true, threads: hydrated };
  } catch (error) {
    console.error("[private-chat] load failed", error);
    return { ok: false, threads: [], error: "Could not load chats." };
  }
}

export async function ensurePrivateChatThread(input?: {
  threadId?: string;
  title?: string;
}): Promise<{ ok: boolean; threadId?: string; error?: string }> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error };
  }
  if (!context.dbUserId || !isSupabaseConfigured()) {
    return { ok: true, threadId: input?.threadId };
  }

  try {
    if (input?.threadId) {
      const existing = await getPrivateChatThreadForUser({
        threadId: input.threadId,
        userId: context.dbUserId,
      });
      if (existing) {
        return { ok: true, threadId: existing.id };
      }
    }

    const thread = await createPrivateChatThread({
      campaignId: context.campaign.id,
      userId: context.dbUserId,
      title: input?.title,
      threadId: input?.threadId,
    });
    return { ok: true, threadId: thread?.id ?? input?.threadId };
  } catch (error) {
    console.error("[private-chat] ensure thread failed", error);
    return { ok: false, error: "Could not create chat thread." };
  }
}

export async function persistPrivateChatTurn(input: {
  threadId: string;
  userMessage: { id: string; content: string };
  assistantMessage: {
    id: string;
    content: string;
    agentId?: string | null;
  };
  title?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error };
  }
  if (!context.dbUserId || !isSupabaseConfigured()) {
    return { ok: true };
  }

  try {
    let thread = await getPrivateChatThreadForUser({
      threadId: input.threadId,
      userId: context.dbUserId,
    });
    if (!thread) {
      thread = await createPrivateChatThread({
        campaignId: context.campaign.id,
        userId: context.dbUserId,
        threadId: input.threadId,
        title: input.title ?? input.userMessage.content.slice(0, 60),
      });
    }
    if (!thread) {
      return { ok: true };
    }

    await appendPrivateChatMessage({
      threadId: thread.id,
      role: "user",
      content: input.userMessage.content,
      messageId: input.userMessage.id,
    });
    await appendPrivateChatMessage({
      threadId: thread.id,
      role: "assistant",
      content: input.assistantMessage.content,
      agentId: input.assistantMessage.agentId,
      messageId: input.assistantMessage.id,
    });

    if (input.title) {
      await touchPrivateChatThreadTitle(thread.id, input.title);
    } else if (thread.title === "New chat") {
      await touchPrivateChatThreadTitle(
        thread.id,
        input.userMessage.content.slice(0, 60),
      );
    }

    return { ok: true };
  } catch (error) {
    console.error("[private-chat] persist failed", error);
    return { ok: false, error: "Could not save chat." };
  }
}
