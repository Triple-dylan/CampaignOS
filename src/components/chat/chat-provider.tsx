"use client";

import * as React from "react";
import {
  sendChatMessage,
  type AgentMode,
  type ChatTurn,
} from "@/actions/chat";
import {
  DEFAULT_CHAT_EFFORT,
  DEFAULT_CHAT_MODEL,
  type ChatEffortId,
  type ChatModelId,
} from "@/lib/ai/chat-models";
import {
  ensurePrivateChatThread,
  loadPrivateChatThreads,
  persistPrivateChatTurn,
} from "@/actions/private-chat";
import { promoteChatToThread } from "@/actions/comments";
import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import { agentForSkillId } from "@/lib/agents";
import { resolveHarnessPlanClient } from "@/lib/harness/resolver-client";
import type { WorkflowPhase } from "@/lib/workflows/chat-machine";
import { useWorkflowRun } from "@/hooks/use-workflow-run";
import { useOptionalCampaignFocus } from "@/components/focus/focus-provider";
import { useOptionalPresence } from "@/components/presence/presence-provider";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  pending?: boolean;
  workflowProgress?: string;
  workflowPhase?: WorkflowPhase;
  /** Specialist that handled (or is handling) this assistant turn. */
  agentId?: AgentMode;
};

export type ChatThread = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
};

export type SendMessageOptions = {
  /** One-shot agent routing (e.g. from an `@mention`), beats the pinned override. */
  agent?: AgentMode;
};

type ChatContextValue = {
  threads: ChatThread[];
  activeThreadId: string | null;
  activeThread: ChatThread | null;
  /**
   * Explicitly pinned agent, or null for auto-routing (the harness resolver
   * picks the specialist per message).
   */
  agentOverride: AgentMode | null;
  /** Effective mode — pinned override or the Campaign Manager default. */
  agentMode: AgentMode;
  /** Selected completion model for the next chat turn. */
  chatModel: ChatModelId;
  setChatModel: (model: ChatModelId) => void;
  /** Reasoning / depth preference forwarded to the chat API. */
  chatEffort: ChatEffortId;
  setChatEffort: (effort: ChatEffortId) => void;
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
  setAgentOverride: (mode: AgentMode | null) => void;
  sendMessage: (text: string, options?: SendMessageOptions) => Promise<void>;
  /** Promote the last assistant reply (or provided text) into the Focus object thread. */
  promoteLastReplyToThread: () => Promise<{ ok: boolean; error?: string }>;
  persistenceReady: boolean;
};

const ChatContext = React.createContext<ChatContextValue | null>(null);

export function useChat(): ChatContextValue {
  const ctx = React.useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return ctx;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "00000000-0000-4000-8000-000000000000".replace(/[018]/g, (char) => {
    const n = Number(char);
    return (n ^ ((Math.random() * 16) >> (n / 4))).toString(16);
  });
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
  const focusApi = useOptionalCampaignFocus();
  const presenceApi = useOptionalPresence();
  const [threads, setThreads] = React.useState<ChatThread[]>(initialThreads);
  const [activeThreadId, setActiveThreadId] = React.useState<string | null>(
    initialThreads[0]?.id ?? null,
  );
  const [agentOverride, setAgentOverride] = React.useState<AgentMode | null>(
    null,
  );
  const [chatModel, setChatModel] =
    React.useState<ChatModelId>(DEFAULT_CHAT_MODEL);
  const [chatEffort, setChatEffort] =
    React.useState<ChatEffortId>(DEFAULT_CHAT_EFFORT);
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
  const [persistenceReady, setPersistenceReady] = React.useState(
    initialThreads.length > 0,
  );
  const { handleMessage: handleWorkflowMessage, hydrateThread } = useWorkflowRun();

  React.useEffect(() => {
    if (initialThreads.length > 0) return;
    let cancelled = false;
    void (async () => {
      const result = await loadPrivateChatThreads();
      if (cancelled || !result.ok || result.threads.length === 0) {
        setPersistenceReady(true);
        return;
      }
      setThreads(
        result.threads.map((thread) => ({
          id: thread.id,
          title: thread.title,
          createdAt: thread.createdAt,
          messages: thread.messages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            createdAt: message.createdAt,
            agentId: message.agentId as AgentMode | undefined,
          })),
        })),
      );
      setActiveThreadId(result.threads[0]?.id ?? null);
      setPersistenceReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialThreads.length]);

  const toggleChatRail = React.useCallback(
    () => setChatRailOpen((open) => !open),
    [],
  );

  const createThread = React.useCallback((): string => {
    const id = makeId();
    const thread: ChatThread = {
      id,
      title: "New thread",
      messages: [],
      createdAt: Date.now(),
    };
    setThreads((prev) => [thread, ...prev]);
    setActiveThreadId(id);
    void ensurePrivateChatThread({ threadId: id });
    return id;
  }, []);

  const selectThread = React.useCallback((id: string) => {
    setActiveThreadId(id);
    void hydrateThread(id);
  }, [hydrateThread]);

  const sendMessage = React.useCallback(
    async (text: string, options?: SendMessageOptions) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      // Shared thread audience — post to Focus object instead of private chat.
      if (
        focusApi?.focus.mode === "thread" &&
        focusApi.focus.objectType &&
        focusApi.focus.objectId
      ) {
        setIsSending(true);
        try {
          await promoteChatToThread({
            objectType: focusApi.focus.objectType,
            objectId: focusApi.focus.objectId,
            body: trimmed,
            objectTitle: focusApi.focus.objectTitle ?? undefined,
          });
        } finally {
          setIsSending(false);
        }
        return;
      }

      let threadId = activeThreadId;
      if (!threadId || !threads.some((t) => t.id === threadId)) {
        threadId = createThread();
      }

      const explicitAgent = options?.agent ?? agentOverride;
      const optimisticPlan = resolveHarnessPlanClient(
        trimmed,
        explicitAgent ?? "campaign-manager",
      );
      const routedAgent: AgentMode =
        explicitAgent ?? agentForSkillId(optimisticPlan.skillId);

      const userMessage: ChatMessage = {
        id: makeId(),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };
      const pendingId = makeId();
      const pendingMessage: ChatMessage = {
        id: pendingId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        pending: true,
        agentId: routedAgent,
      };

      let historyForRequest: ChatTurn[] = [];
      let derivedTitle = "New thread";

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
          derivedTitle = isFirst ? deriveTitle(trimmed) : thread.title;
          return {
            ...thread,
            title: derivedTitle,
            messages: nextMessages,
          };
        }),
      );

      setIsSending(true);
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

      const roomSummary =
        presenceApi?.objectPeers
          .map((peer) => `${peer.displayName} is ${peer.action}`)
          .join("; ") || null;

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
            setGraphFoldersToHighlight(optimisticPlan.graphFolders);
          },
        });

        if (workflowResult.handled) {
          setGraphFoldersToHighlight(workflowResult.graphFolders);
          setGraphNodeIdsToHighlight([]);
          setHarnessContextPaths(optimisticPlan.contextPaths);
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
          void persistPrivateChatTurn({
            threadId: threadId!,
            userMessage: { id: userMessage.id, content: userMessage.content },
            assistantMessage: {
              id: pendingId,
              content: workflowResult.reply,
              agentId: routedAgent,
            },
            title: derivedTitle,
          });
          return;
        }

        const result = await sendChatMessage({
          messages: historyForRequest,
          agentMode: routedAgent,
          model: chatModel,
          effort: chatEffort,
          focusContext: focusApi?.focus
            ? {
                module: focusApi.focus.module,
                objectType: focusApi.focus.objectType,
                objectId: focusApi.focus.objectId,
                objectTitle: focusApi.focus.objectTitle,
                roomSummary,
              }
            : null,
        });
        setAiConfigured(result.configured);
        setGraphFoldersToHighlight(result.graphFoldersToHighlight);
        setGraphNodeIdsToHighlight(result.graphNodeIdsToHighlight);
        setHarnessContextPaths(optimisticPlan.contextPaths);
        const attributedAgent =
          explicitAgent ??
          (result.harnessSkillId
            ? agentForSkillId(result.harnessSkillId)
            : routedAgent);
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
                      agentId: attributedAgent,
                    }
                  : m,
              ),
            };
          }),
        );
        void persistPrivateChatTurn({
          threadId: threadId!,
          userMessage: { id: userMessage.id, content: userMessage.content },
          assistantMessage: {
            id: pendingId,
            content: result.reply,
            agentId: attributedAgent,
          },
          title: derivedTitle,
        });
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
      agentOverride,
      chatEffort,
      chatModel,
      createThread,
      focusApi,
      handleWorkflowMessage,
      isSending,
      presenceApi,
      threads,
    ],
  );

  const promoteLastReplyToThread = React.useCallback(async () => {
    const focus = focusApi?.focus;
    if (!focus?.objectType || !focus.objectId) {
      return {
        ok: false,
        error: "Focus an asset, page, or task before promoting to a thread.",
      };
    }
    const thread = threads.find((item) => item.id === activeThreadId);
    const lastAssistant = [...(thread?.messages ?? [])]
      .reverse()
      .find((message) => message.role === "assistant" && !message.pending);
    if (!lastAssistant?.content) {
      return { ok: false, error: "No assistant reply to promote." };
    }
    const result = await promoteChatToThread({
      objectType: focus.objectType,
      objectId: focus.objectId,
      body: lastAssistant.content,
      objectTitle: focus.objectTitle ?? undefined,
    });
    return { ok: result.ok, error: result.error };
  }, [activeThreadId, focusApi, threads]);

  const activeThread =
    threads.find((thread) => thread.id === activeThreadId) ?? null;

  const value = React.useMemo<ChatContextValue>(
    () => ({
      threads,
      activeThreadId,
      activeThread,
      agentOverride,
      agentMode: agentOverride ?? "campaign-manager",
      chatModel,
      setChatModel,
      chatEffort,
      setChatEffort,
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
      setAgentOverride,
      sendMessage,
      promoteLastReplyToThread,
      persistenceReady,
    }),
    [
      threads,
      activeThreadId,
      activeThread,
      agentOverride,
      chatModel,
      chatEffort,
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
      promoteLastReplyToThread,
      persistenceReady,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
