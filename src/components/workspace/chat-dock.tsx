"use client";

import * as React from "react";
import { ArrowUp, AtSign, CalendarClock, ChevronDown, Paperclip } from "lucide-react";
import { useChat } from "@/components/chat/chat-provider";
import { useOptionalCampaignFocus } from "@/components/focus/focus-provider";
import { ChatMessageBubble } from "@/components/chat/chat-message-bubble";
import { useAutomations } from "@/components/automations/automations-provider";
import {
  AgentMentionMenu,
  AgentModeChip,
  parseAgentDirective,
  useAgentMention,
} from "@/components/chat/agent-mention";
import { useVisualViewportOffset } from "@/hooks/use-visual-viewport-offset";
import { AGENT_LABELS } from "@/lib/agents";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Prepare for a town hall next week",
  "Create content for our launch event",
  "Build a campaign timeline for our district",
  "Compare candidates in this race",
];

type ChatDockProps = {
  composerRef?: React.RefObject<HTMLTextAreaElement | null>;
};

export function ChatDock({ composerRef }: ChatDockProps) {
  const {
    activeThread,
    agentOverride,
    setAgentOverride,
    isSending,
    aiConfigured,
    sendMessage,
    promoteLastReplyToThread,
  } = useChat();
  const focusApi = useOptionalCampaignFocus();
  const { openCreateDialog } = useAutomations();
  const [promoteMessage, setPromoteMessage] = React.useState<string | null>(null);
  const keyboardOffset = useVisualViewportOffset();
  const [draft, setDraft] = React.useState("");
  const [collapsed, setCollapsed] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const localRef = React.useRef<HTMLTextAreaElement>(null);
  const textareaRef = composerRef ?? localRef;

  const mention = useAgentMention({
    textareaRef,
    draft,
    setDraft,
    onPick: setAgentOverride,
  });

  const messages = React.useMemo(
    () => activeThread?.messages ?? [],
    [activeThread],
  );

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Auto-grow the textarea like Cursor/Codex.
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [draft, textareaRef]);

  async function submit() {
    const text = draft.trim();
    if (!text || isSending) return;

    // /schedule slash command — open create dialog with prompt pre-filled
    if (text.startsWith("/schedule")) {
      const prompt = text.replace(/^\/schedule\s*/, "").trim();
      setDraft("");
      openCreateDialog({
        prompt: prompt || undefined,
        agentMode: agentOverride ?? undefined,
        name: prompt
          ? prompt.slice(0, 48) + (prompt.length > 48 ? "…" : "")
          : undefined,
      });
      return;
    }

    // `@Researcher …` / `/researcher …` — pin the agent and route the message.
    const directive = parseAgentDirective(text);
    if (directive.agent) {
      setAgentOverride(directive.agent);
      if (!directive.text) {
        setDraft("");
        return;
      }
    }

    setDraft("");
    setCollapsed(false);
    await sendMessage(
      directive.text,
      directive.agent ? { agent: directive.agent } : undefined,
    );
  }

  function handleScheduleFromDraft() {
    const text = draft.trim();
    if (!text) return;
    openCreateDialog({
      prompt: text,
      agentMode: agentOverride ?? undefined,
      name: text.slice(0, 48) + (text.length > 48 ? "…" : ""),
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mention.handleKeyDown(event)) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="pointer-events-none">
      {hasMessages && !collapsed ? (
        <div className="glass-frost motion-rise pointer-events-auto mx-auto mb-2 w-full max-w-3xl rounded-2xl px-4 pb-2">
          <div className="flex items-center justify-between pb-1 pt-3">
            <span className="text-xs font-medium text-muted-foreground">
              {focusApi?.focus.mode === "thread"
                ? "On shared thread"
                : agentOverride
                  ? AGENT_LABELS[agentOverride]
                  : "Private chat"}
            </span>
            <div className="flex items-center gap-1">
              {focusApi?.focus.objectId ? (
                <button
                  type="button"
                  onClick={() => {
                    void promoteLastReplyToThread().then((result) => {
                      setPromoteMessage(
                        result.ok
                          ? "Posted to shared thread."
                          : result.error ?? "Could not promote.",
                      );
                      window.setTimeout(() => setPromoteMessage(null), 2500);
                    });
                  }}
                  className="rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Promote
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronDown className="size-3.5" aria-hidden /> Hide
              </button>
            </div>
          </div>
          {promoteMessage ? (
            <p className="pb-1 text-[11px] text-muted-foreground">{promoteMessage}</p>
          ) : null}
          <div
            ref={scrollRef}
            className="max-h-[34vh] space-y-3 overflow-y-auto pb-2"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <ChatMessageBubble
                  role={message.role}
                  content={message.content}
                  pending={message.pending}
                  workflowProgress={message.workflowProgress}
                  workflowPhase={message.workflowPhase}
                  agentId={message.agentId}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className="group/dock pointer-events-auto mx-auto w-full max-w-3xl px-4 pt-2 pb-4 pb-safe"
        style={
          keyboardOffset > 0
            ? { paddingBottom: `calc(var(--safe-area-inset-bottom, 0px) + ${keyboardOffset}px)` }
            : undefined
        }
      >
        {!hasMessages ? (
          <div className="motion-rise mb-2 flex gap-1.5 overflow-x-auto pb-1 snap-x snap-mandatory sm:flex-wrap sm:overflow-visible sm:snap-none">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setDraft(suggestion);
                  textareaRef.current?.focus();
                }}
                className="shrink-0 snap-start rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:shrink"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        <div className="glass-composer relative rounded-2xl transition-shadow focus-within:border-brand-blue/60">
          <AgentMentionMenu mention={mention} />
          {agentOverride ? (
            <div className="flex flex-wrap items-center gap-1 px-3 pt-2.5">
              <AgentModeChip
                agent={agentOverride}
                onClear={() => setAgentOverride(null)}
              />
            </div>
          ) : null}
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              mention.syncCaret();
            }}
            onKeyDown={handleKeyDown}
            onSelect={mention.syncCaret}
            rows={1}
            placeholder={
              agentOverride
                ? `Ask the ${AGENT_LABELS[agentOverride]}…`
                : "Ask anything — @ to pick an agent…"
            }
            className={cn(
              "block max-h-[200px] min-h-[24px] w-full resize-none bg-transparent px-3.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground",
              agentOverride ? "pt-1.5" : "pt-3",
            )}
          />
          <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Attach files (coming soon)"
                aria-label="Attach files"
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Paperclip className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                title="Mention an agent or context"
                aria-label="Mention an agent or context"
                onClick={mention.insertMentionTrigger}
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <AtSign className="size-4" aria-hidden />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              {aiConfigured === false ? (
                <span className="hidden rounded-full bg-muted/70 px-2 py-0.5 text-[0.65rem] text-muted-foreground/80 md:inline">
                  AI key off · guided help
                </span>
              ) : null}
              {draft.trim() ? (
                <button
                  type="button"
                  onClick={handleScheduleFromDraft}
                  title="Save as scheduled run"
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <CalendarClock className="size-3.5" aria-hidden />
                  <span className="hidden sm:inline">Schedule</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void submit()}
                disabled={!draft.trim() || isSending}
                aria-label="Send message"
                className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
        {/* Keyboard hints appear only while the empty composer is focused
            (CSS focus-within, so it needs no JS focus tracking). The slot keeps
            its height so the composer never shifts or collides with the
            compliance footer below. */}
        <p
          className={cn(
            "mt-1 h-4 px-1 text-center text-[0.65rem] text-muted-foreground/80 opacity-0 transition-opacity duration-200",
            !draft && "group-focus-within/dock:opacity-100",
          )}
        >
          <kbd className="font-sans font-medium text-foreground/70">Enter</kbd>{" "}
          to send ·{" "}
          <kbd className="font-sans font-medium text-foreground/70">
            Shift+Enter
          </kbd>{" "}
          for a new line ·{" "}
          <kbd className="font-sans font-medium text-foreground/70">@</kbd> to
          pick an agent
        </p>
      </div>
    </div>
  );
}
