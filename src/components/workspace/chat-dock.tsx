"use client";

import * as React from "react";
import {
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useChat } from "@/components/chat/chat-provider";
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
  "Draft a quick stump-speech opener.",
  "Who are our top voter segments?",
];

type ChatDockProps = {
  composerRef?: React.RefObject<HTMLTextAreaElement | null>;
};

export function ChatDock({ composerRef }: ChatDockProps) {
  const {
    activeThread,
    agentMode,
    isSending,
    aiConfigured,
    sendMessage,
  } = useChat();
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
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  async function submit() {
    const text = draft.trim();
    if (!text || isSending) return;
    setDraft("");
    setCollapsed(false);
    await sendMessage(text);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="glass-panel flex shrink-0 flex-col border-t border-border/60">
      <div className="flex items-center justify-between gap-2 px-4 pt-2.5">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="badge-red inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium">
            <Sparkles className="size-3" aria-hidden />
            {AGENT_LABELS[agentMode]}
          </span>
          {aiConfigured === false ? (
            <span className="hidden text-[0.6875rem] text-muted-foreground/80 sm:inline">
              AI key not configured — showing guided help
            </span>
          ) : null}
        </div>
        {hasMessages ? (
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="glass-hover inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <>
                <ChevronUp className="size-3.5" aria-hidden /> Show chat
              </>
            ) : (
              <>
                <ChevronDown className="size-3.5" aria-hidden /> Hide chat
              </>
            )}
          </button>
        ) : null}
      </div>

      {hasMessages && !collapsed ? (
        <div
          ref={scrollRef}
          className="max-h-[38vh] min-h-[7rem] flex-1 space-y-3 overflow-y-auto px-4 py-3"
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
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "glass-card text-foreground",
                )}
              >
                {message.pending ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    Thinking…
                  </span>
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!hasMessages ? (
        <div className="flex flex-wrap gap-2 px-4 pt-2.5">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setDraft(suggestion);
                textareaRef.current?.focus();
              }}
              className="glass-hover rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      <div className="p-3">
        <div className="glass-card flex items-end gap-2 rounded-2xl p-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`Message the ${AGENT_LABELS[agentMode]}…`}
            className="max-h-40 min-h-[2.25rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!draft.trim() || isSending}
            aria-label="Send message"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {isSending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ArrowUp className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
