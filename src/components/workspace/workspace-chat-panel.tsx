"use client";

import * as React from "react";
import {
  ArrowUp,
  CalendarClock,
  MessageSquarePlus,
  Paperclip,
  PanelRightClose,
  Sparkles,
} from "lucide-react";
import { useChat } from "@/components/chat/chat-provider";
import { ChatMessageBubble } from "@/components/chat/chat-message-bubble";
import { useAutomations } from "@/components/automations/automations-provider";
import { AgentPicker } from "@/components/chat/agent-picker";
import { cn } from "@/lib/utils";

const RAIL_SUGGESTIONS = [
  "Event research for our next forum",
  "Draft a social post for launch week",
  "Build a campaign timeline",
];

/**
 * The persistent right-rail chat. It renders the SAME chat state as the Work
 * desk composer (via {@link useChat}), so the conversation follows the user as
 * they move onto dedicated module pages. Collapsible; its open state is held in
 * the chat provider so it persists across navigation.
 */
export function WorkspaceChatPanel() {
  const {
    activeThread,
    isSending,
    aiConfigured,
    sendMessage,
    createThread,
    setChatRailOpen,
  } = useChat();
  const { openCreateDialog } = useAutomations();
  const [draft, setDraft] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const messages = React.useMemo(
    () => activeThread?.messages ?? [],
    [activeThread],
  );
  const hasMessages = messages.length > 0;

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  async function submit() {
    const text = draft.trim();
    if (!text || isSending) return;
    if (text.startsWith("/schedule")) {
      const prompt = text.replace(/^\/schedule\s*/, "").trim();
      setDraft("");
      openCreateDialog({
        prompt: prompt || undefined,
        name: prompt ? prompt.slice(0, 48) : undefined,
      });
      return;
    }
    setDraft("");
    await sendMessage(text);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <aside className="glass-frost hidden w-[22rem] shrink-0 flex-col lg:flex">
      <div className="flex h-12 items-center justify-between gap-2 border-b border-border/60 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="size-4 shrink-0 text-brand-blue" aria-hidden />
          <h2 className="truncate text-sm font-semibold">Chat</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              createThread();
              setDraft("");
              textareaRef.current?.focus();
            }}
            title="New chat"
            aria-label="New chat"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <MessageSquarePlus className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setChatRailOpen(false)}
            title="Hide chat"
            aria-label="Hide chat"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <PanelRightClose className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3"
      >
        {hasMessages ? (
          messages.map((message) => (
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
              />
            </div>
          ))
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl border border-border/70 bg-card text-brand-blue">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <p className="mt-3 text-sm font-medium">Your campaign copilot</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ask about this page or anything across the campaign — the
              conversation follows you everywhere.
            </p>
            <div className="mt-4 flex w-full flex-col gap-1.5">
              {RAIL_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setDraft(s);
                    textareaRef.current?.focus();
                  }}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border/60 p-3">
        <div className="glass-composer rounded-2xl transition-shadow focus-within:border-brand-blue/60">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask the campaign copilot…"
            className="block max-h-[160px] min-h-[24px] w-full resize-none bg-transparent px-3 pt-2.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
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
              <AgentPicker placement="top" />
            </div>
            <div className="flex items-center gap-1.5">
              {draft.trim() ? (
                <button
                  type="button"
                  onClick={() =>
                    openCreateDialog({
                      prompt: draft.trim(),
                      name: draft.trim().slice(0, 48),
                    })
                  }
                  title="Save as scheduled run"
                  aria-label="Save as scheduled run"
                  className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <CalendarClock className="size-4" aria-hidden />
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
        {aiConfigured === false ? (
          <p className="mt-1.5 px-1 text-center text-[0.7rem] text-muted-foreground">
            AI key off · guided help
          </p>
        ) : null}
      </div>
    </aside>
  );
}
