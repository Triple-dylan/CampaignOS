"use client";

import * as React from "react";
import {
  sendChatMessage,
  type AgentMode,
  type ChatTurn,
} from "@/actions/chat";
import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import { resolveHarnessPlanClient } from "@/lib/harness/resolver-client";
import type { WorkflowPhase } from "@/lib/workflows/chat-machine";
import { useWorkflowRun } from "@/hooks/use-workflow-run";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  pending?: boolean;
  workflowProgress?: string;
  workflowPhase?: WorkflowPhase;
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
  /**
   * Whether the right-rail follow-chat is expanded. Lives in the provider so
   * the panel's open/collapsed state persists as the user moves between the
   * Work desk and module pages.
   */
  isChatRailOpen: boolean;
  setChatRailOpen: (open: boolean) => void;
  toggleChatRail: () => void;
  createThread: () => string;
  selectThread: (id: string) => void;
  /**
   * Resolver-driven graph folder highlights from the latest chat turn.
   * Falls back to client resolver while a message is in flight.
   */
  graphFoldersToHighlight: CampaignFolderId[];
  /** Resolver-driven specific node ids (retrieval-aware). */
  graphNodeIdsToHighlight: string[];
  /** Resolver context paths for optimistic retrieval highlights. */
  harnessContextPaths: string[];
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
  initialThreads = [],
}: {
  children: React.ReactNode;
  initialAiConfigured?: boolean | null;
  /** Optional seed threads — used only by the dev preview routes. */
  initialThreads?: ChatThread[];
}) {
  const [threads, setThreads] = React.useState<ChatThread[]>(initialThreads);
  const [activeThreadId, setActiveThreadId] = React.useState<string | null>(
    initialThreads[0]?.id ?? null,
  );
  const [agentMode, setAgentMode] = React.useState<AgentMode>(
    "campaign-manager",
  );
  const [isSending, setIsSending] = React.useState(false);
  const [aiConfigured, setAiConfigured] = React.useState<boolean | null>(
    initialAiConfigured,
  );
  const [graphFoldersToHighlight, setGraphFoldersToHighlight] = React.useState<
    CampaignFolderId[]
  >([]);
  const [graphNodeIdsToHighlight, setGraphNodeIdsToHighlight] = React.useState<
    string[]
  >([]);
  const [harnessContextPaths, setHarnessContextPaths] = React.useState<
    string[]
  >([]);
  const [isChatRailOpen, setChatRailOpen] = React.useState(true);
  const { handleMessage: handleWorkflowMessage, hydrateThread } = useWorkflowRun();

  const toggleChatRail = React.useCallback(
    () => setChatRailOpen((open) => !open),
    [],
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
    void hydrateThread(id);
  }, [hydrateThread]);

  const sendMessage = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

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
        workflowProgress: "Working…",
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
      const optimisticPlan = resolveHarnessPlanClient(trimmed, agentMode);
      setGraphFoldersToHighlight(optimisticPlan.graphFolders);
      setHarnessContextPaths(optimisticPlan.contextPaths);
      setGraphNodeIdsToHighlight([]);

      const updatePending = (patch: Partial<ChatMessage>) => {
        setThreads((prev) =>
          prev.map((thread) => {
            if (thread.id !== threadId) return thread;
            return {
              ...thread,
              messages: thread.messages.map((m) =>
                m.id === pendingId ? { ...m, ...patch } : m,
              ),
            };
          }),
        );
      };

      try {
        const workflowResult = await handleWorkflowMessage({
          threadId: threadId!,
          text: trimmed,
          onProgress: (state) => {
            updatePending({
              pending: true,
              workflowProgress: state.progressLabel,
              workflowPhase: state.phase,
            });
            setGraphFoldersToHighlight(
              resolveHarnessPlanClient(trimmed, agentMode).graphFolders,
            );
          },
        });

        if (workflowResult.handled) {
          setGraphFoldersToHighlight(workflowResult.graphFolders);
          setGraphNodeIdsToHighlight([]);
          setHarnessContextPaths(
            resolveHarnessPlanClient(trimmed, agentMode).contextPaths,
          );
          setThreads((prev) =>
            prev.map((thread) => {
              if (thread.id !== threadId) return thread;
              return {
                ...thread,
                messages: thread.messages.map((m) =>
                  m.id === pendingId
                    ? {
                        ...m,
                        content: workflowResult.reply,
                        pending: false,
                        workflowProgress: workflowResult.state?.progressLabel,
                        workflowPhase: workflowResult.state?.phase,
                      }
                    : m,
                ),
              };
            }),
          );
          return;
        }

        const result = await sendChatMessage({
          messages: historyForRequest,
          agentMode,
        });
        setAiConfigured(result.configured);
        // Prefer the server's authoritative highlights, but if it resolved
        // nothing (no campaign context / AI key off) keep the optimistic topic
        // cluster lit so the graph still shows what the assistant would read.
        setGraphFoldersToHighlight(
          result.graphFoldersToHighlight.length > 0 ||
            result.graphNodeIdsToHighlight.length > 0
            ? result.graphFoldersToHighlight
            : optimisticPlan.graphFolders,
        );
        setGraphNodeIdsToHighlight(result.graphNodeIdsToHighlight);
        setHarnessContextPaths(
          resolveHarnessPlanClient(trimmed, agentMode).contextPaths,
        );
        setThreads((prev) =>
          prev.map((thread) => {
            if (thread.id !== threadId) return thread;
            return {
              ...thread,
              messages: thread.messages.map((m) =>
                m.id === pendingId
                  ? {
                      ...m,
                      content: result.reply,
                      pending: false,
                      workflowProgress: undefined,
                      workflowPhase: undefined,
                    }
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
                      workflowProgress: "Workflow error",
                      workflowPhase: "error",
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
    [
      activeThreadId,
      agentMode,
      createThread,
      handleWorkflowMessage,
      isSending,
      threads,
    ],
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
      graphFoldersToHighlight,
      graphNodeIdsToHighlight,
      harnessContextPaths,
      isChatRailOpen,
      setChatRailOpen,
      toggleChatRail,
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
      graphFoldersToHighlight,
      graphNodeIdsToHighlight,
      harnessContextPaths,
      isChatRailOpen,
      toggleChatRail,
      createThread,
      selectThread,
      sendMessage,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
