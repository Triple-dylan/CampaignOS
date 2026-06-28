"use client";

import * as React from "react";
import { ArrowUp, CalendarClock, ChevronDown, Sparkles } from "lucide-react";
import { useChat } from "@/components/chat/chat-provider";
import { useAutomations } from "@/components/automations/automations-provider";
import { cn } from "@/lib/utils";
import type { AgentMode } from "@/actions/chat";

const AGENT_LABELS: Record<AgentMode, string> = {
  "campaign-manager": "Campaign Manager",
  "content-strategist": "Content Strategist",
  researcher: "Researcher",
  fundraiser: "Fundraiser",
  "compliance-reviewer": "Compliance Reviewer",
};

const SUGGESTIONS = [
  "What should we focus on this week?",
  "Draft a stump-speech opener.",
  "Who are our top voter segments?",
];

type ChatDockProps = {
  composerRef?: React.RefObject<HTMLTextAreaElement | null>;
};

export function ChatDock({ composerRef }: ChatDockProps) {
  const { activeThread, agentMode, isSending, aiConfigured, sendMessage } =
    useChat();
  const { openCreateDialog } = useAutomations();
  const [draft, setDraft] = React.useState("");
  const [collapsed, setCollapsed] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const localRef = React.useRef<HTMLTextAreaElement>(null);
  const textareaRef = composerRef ?? localRef;

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
        agentMode,
        name: prompt
          ? prompt.slice(0, 48) + (prompt.length > 48 ? "…" : "")
          : undefined,
      });
      return;
    }

    setDraft("");
    setCollapsed(false);
    await sendMessage(text);
  }

  function handleScheduleFromDraft() {
    const text = draft.trim();
    if (!text) return;
    openCreateDialog({
      prompt: text,
      agentMode,
      name: text.slice(0, 48) + (text.length > 48 ? "…" : ""),
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="shrink-0 bg-background">
      {hasMessages && !collapsed ? (
        <div className="mx-auto w-full max-w-3xl px-4">
          <div className="flex items-center justify-between pb-1 pt-3">
            <span className="text-xs font-medium text-muted-foreground">
              {AGENT_LABELS[agentMode]}
            </span>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronDown className="size-3.5" aria-hidden /> Hide
            </button>
          </div>
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
                <div
                  className={cn(
                    "max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card text-foreground",
                  )}
                >
                  {message.pending ? (
                    <span className="flex items-center gap-1 py-0.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="size-1.5 rounded-full bg-muted-foreground"
                          style={{
                            animation: "typing-bounce 1.2s ease-in-out infinite",
                            animationDelay: `${i * 0.15}s`,
                          }}
                        />
                      ))}
                    </span>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-2">
        {!hasMessages ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setDraft(suggestion);
                  textareaRef.current?.focus();
                }}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-panel)] transition-shadow focus-within:border-brand-blue/60 focus-within:shadow-[var(--shadow-pop)]">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`Ask the ${AGENT_LABELS[agentMode]}…`}
            className="block max-h-[200px] min-h-[24px] w-full resize-none bg-transparent px-4 pt-3 text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5 pt-1.5">
            <span className="badge-blue inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[0.7rem] font-medium">
              <Sparkles className="size-3" aria-hidden />
              {AGENT_LABELS[agentMode]}
            </span>
            <div className="flex items-center gap-2">
              {aiConfigured === false ? (
                <span className="hidden text-[0.7rem] text-muted-foreground sm:inline">
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
                className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
