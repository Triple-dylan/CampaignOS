"use client";

import * as React from "react";
import {
  sendChatMessage,
  type AgentMode,
  type ChatTurn,
} from "@/actions/chat";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  pending?: boolean;
};

export type ChatThread = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
};

type ChatContextValue = {
  threads: ChatThread[];
  activeThreadId: string | null;
  activeThread: ChatThread | null;
  agentMode: AgentMode;
  isSending: boolean;
  /** null until the first server response is observed. */
  aiConfigured: boolean | null;
  createThread: () => string;
  selectThread: (id: string) => void;
  setAgentMode: (mode: AgentMode) => void;
  sendMessage: (text: string) => Promise<void>;
};

const ChatContext = React.createContext<ChatContextValue | null>(null);

export function useChat(): ChatContextValue {
  const ctx = React.useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return ctx;
}

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function deriveTitle(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 40) return trimmed || "New thread";
  return `${trimmed.slice(0, 40)}…`;
}

export function ChatProvider({
  children,
  initialAiConfigured = null,
}: {
  children: React.ReactNode;
  initialAiConfigured?: boolean | null;
}) {
  const [threads, setThreads] = React.useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = React.useState<string | null>(
    null,
  );
  const [agentMode, setAgentMode] = React.useState<AgentMode>(
    "campaign-manager",
  );
  const [isSending, setIsSending] = React.useState(false);
  const [aiConfigured, setAiConfigured] = React.useState<boolean | null>(
    initialAiConfigured,
  );

  const createThread = React.useCallback((): string => {
    const id = makeId("thread");
    const thread: ChatThread = {
      id,
      title: "New thread",
      messages: [],
      createdAt: Date.now(),
    };
    setThreads((prev) => [thread, ...prev]);
    setActiveThreadId(id);
    return id;
  }, []);

  const selectThread = React.useCallback((id: string) => {
    setActiveThreadId(id);
  }, []);

  const sendMessage = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      // Ensure there is an active thread to append to.
      let threadId = activeThreadId;
      if (!threadId || !threads.some((t) => t.id === threadId)) {
        threadId = createThread();
      }

      const userMessage: ChatMessage = {
        id: makeId("msg"),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };
      const pendingId = makeId("msg");
      const pendingMessage: ChatMessage = {
        id: pendingId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        pending: true,
      };

      let historyForRequest: ChatTurn[] = [];

      setThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== threadId) return thread;
          const isFirst = thread.messages.length === 0;
          const nextMessages = [
            ...thread.messages,
            userMessage,
            pendingMessage,
          ];
          historyForRequest = nextMessages
            .filter((m) => !m.pending)
            .map((m) => ({ role: m.role, content: m.content }));
          return {
            ...thread,
            title: isFirst ? deriveTitle(trimmed) : thread.title,
            messages: nextMessages,
          };
        }),
      );

      setIsSending(true);
      try {
        const result = await sendChatMessage({
          messages: historyForRequest,
          agentMode,
        });
        setAiConfigured(result.configured);
        setThreads((prev) =>
          prev.map((thread) => {
            if (thread.id !== threadId) return thread;
            return {
              ...thread,
              messages: thread.messages.map((m) =>
                m.id === pendingId
                  ? { ...m, content: result.reply, pending: false }
                  : m,
              ),
            };
          }),
        );
      } catch (error) {
        console.error("[chat] sendMessage failed", error);
        setThreads((prev) =>
          prev.map((thread) => {
            if (thread.id !== threadId) return thread;
            return {
              ...thread,
              messages: thread.messages.map((m) =>
                m.id === pendingId
                  ? {
                      ...m,
                      pending: false,
                      content:
                        "Something went wrong reaching the assistant. Please try again.",
                    }
                  : m,
              ),
            };
          }),
        );
      } finally {
        setIsSending(false);
      }
    },
    [activeThreadId, agentMode, createThread, isSending, threads],
  );

  const activeThread =
    threads.find((thread) => thread.id === activeThreadId) ?? null;

  const value = React.useMemo<ChatContextValue>(
    () => ({
      threads,
      activeThreadId,
      activeThread,
      agentMode,
      isSending,
      aiConfigured,
      createThread,
      selectThread,
      setAgentMode,
      sendMessage,
    }),
    [
      threads,
      activeThreadId,
      activeThread,
      agentMode,
      isSending,
      aiConfigured,
      createThread,
      selectThread,
      sendMessage,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
