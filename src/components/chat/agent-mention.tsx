"use client";

import * as React from "react";
import { X } from "lucide-react";
import type { AgentMode } from "@/actions/chat";
import {
  AGENT_REGISTRY,
  agentPersona,
  isAgentSlug,
  type AgentPersona,
} from "@/lib/agents";
import { cn } from "@/lib/utils";

/**
 * Composer-side agent mention machinery: `@` popover with keyboard nav,
 * `@Agent` / `/agent` directive parsing on submit, and the dismissible
 * mode chip shown inside the input when an explicit agent is pinned.
 */

export type AgentDirective = {
  agent: AgentMode | null;
  text: string;
};

/**
 * Parse a leading `@Researcher …` mention or `/researcher …` slash command.
 * Returns the routed agent (if any) and the message text with the directive
 * stripped, so workflow detection still sees the plain request.
 */
export function parseAgentDirective(raw: string): AgentDirective {
  const text = raw.trim();

  if (text.startsWith("/")) {
    const match = text.match(/^\/([a-z][a-z-]*)\b/i);
    const slug = match?.[1]?.toLowerCase();
    if (slug && isAgentSlug(slug)) {
      return { agent: slug, text: text.slice(match![0].length).trim() };
    }
    return { agent: null, text };
  }

  if (text.startsWith("@")) {
    const rest = text.slice(1);
    const restLower = rest.toLowerCase();
    for (const persona of AGENT_REGISTRY) {
      for (const alias of [persona.label.toLowerCase(), persona.slug]) {
        const boundary = rest[alias.length];
        if (
          restLower === alias ||
          (restLower.startsWith(alias) &&
            boundary !== undefined &&
            /[\s,.:!?]/.test(boundary))
        ) {
          return {
            agent: persona.id,
            text: rest.slice(alias.length).replace(/^[\s,.:!?]+/, "").trim(),
          };
        }
      }
    }
  }

  return { agent: null, text };
}

type MentionToken = { start: number; query: string };

function getMentionToken(draft: string, caret: number): MentionToken | null {
  const before = draft.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at === -1) return null;
  // `@` must start the draft or follow whitespace to count as a mention.
  if (at > 0 && !/\s/.test(before[at - 1]!)) return null;
  const query = before.slice(at + 1);
  if (query.includes("\n") || query.length > 24) return null;
  return { start: at, query };
}

function filterAgents(query: string): AgentPersona[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...AGENT_REGISTRY];
  return AGENT_REGISTRY.filter(
    (agent) => agent.label.toLowerCase().includes(q) || agent.slug.includes(q),
  );
}

export type AgentMentionController = {
  open: boolean;
  items: AgentPersona[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  /** Returns true when the key event was consumed by the popover. */
  handleKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => boolean;
  /** Keep caret position in sync — wire to onSelect/onClick/onKeyUp. */
  syncCaret: () => void;
  pick: (agent: AgentPersona) => void;
  /** Insert an `@` at the end of the draft and focus (for the @ button). */
  insertMentionTrigger: () => void;
};

export function useAgentMention(options: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  draft: string;
  setDraft: (value: string) => void;
  onPick: (agent: AgentMode) => void;
}): AgentMentionController {
  const { textareaRef, draft, setDraft, onPick } = options;
  const [caret, setCaret] = React.useState(0);
  // Active row keyed to the mention token so it resets when the query changes.
  const [active, setActive] = React.useState<{ key: string; index: number }>({
    key: "",
    index: 0,
  });
  const [dismissedAt, setDismissedAt] = React.useState<number | null>(null);

  const token = React.useMemo(() => getMentionToken(draft, caret), [draft, caret]);
  const items = React.useMemo(
    () => (token ? filterAgents(token.query) : []),
    [token],
  );
  const tokenKey = token ? `${token.start}:${token.query}` : "";
  const activeIndex = active.key === tokenKey ? active.index : 0;
  const setActiveIndex = React.useCallback(
    (index: number) => setActive({ key: tokenKey, index }),
    [tokenKey],
  );
  const open = token !== null && items.length > 0 && dismissedAt !== token.start;

  const syncCaret = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const position = el.selectionStart ?? 0;
    setCaret(position);
    // Escape-dismissal lasts until the `@` token is removed or left behind.
    if (dismissedAt !== null && getMentionToken(el.value, position)?.start !== dismissedAt) {
      setDismissedAt(null);
    }
  }, [dismissedAt, textareaRef]);

  const pick = React.useCallback(
    (agent: AgentPersona) => {
      if (!token) return;
      const before = draft.slice(0, token.start);
      const after = draft.slice(caret).replace(/^\s+/, "");
      setDraft(before + after);
      onPick(agent.id);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(token.start, token.start);
        setCaret(token.start);
      });
    },
    [caret, draft, onPick, setDraft, textareaRef, token],
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
      if (!open) return false;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((activeIndex + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((activeIndex - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        pick(items[activeIndex]!);
        return true;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setDismissedAt(token?.start ?? null);
        return true;
      }
      return false;
    },
    [activeIndex, items, open, pick, setActiveIndex, token],
  );

  const insertMentionTrigger = React.useCallback(() => {
    const needsSpace = draft.length > 0 && !/\s$/.test(draft);
    const next = `${draft}${needsSpace ? " " : ""}@`;
    setDraft(next);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.length, next.length);
      setCaret(next.length);
    });
  }, [draft, setDraft, textareaRef]);

  return {
    open,
    items,
    activeIndex,
    setActiveIndex,
    handleKeyDown,
    syncCaret,
    pick,
    insertMentionTrigger,
  };
}

/** Popover listing agents while an `@` mention is being typed. */
export function AgentMentionMenu({
  mention,
  className,
}: {
  mention: AgentMentionController;
  className?: string;
}) {
  if (!mention.open) return null;
  return (
    <div
      role="listbox"
      aria-label="Mention an agent"
      className={cn(
        "glass-frost absolute bottom-full left-2 z-50 mb-2 w-64 rounded-xl p-1.5",
        className,
      )}
    >
      <p className="px-2 pb-1 pt-1 text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground/70">
        Agents
      </p>
      {mention.items.map((persona, index) => {
        const isActive = index === mention.activeIndex;
        return (
          <button
            key={persona.id}
            type="button"
            role="option"
            aria-selected={isActive}
            onMouseEnter={() => mention.setActiveIndex(index)}
            onMouseDown={(event) => {
              // Keep focus in the textarea while selecting.
              event.preventDefault();
              mention.pick(persona);
            }}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-hidden transition-colors",
              isActive
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card [&_svg]:size-3.5",
                isActive && "text-brand-blue",
              )}
            >
              <persona.icon aria-hidden />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium leading-tight text-foreground">
                {persona.label}
              </span>
              <span className="truncate text-[0.7rem] leading-tight text-muted-foreground">
                {persona.blurb}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Dismissible chip shown inside the composer when an explicit agent is pinned. */
export function AgentModeChip({
  agent,
  onClear,
}: {
  agent: AgentMode;
  onClear: () => void;
}) {
  const persona = agentPersona(agent);
  const Icon = persona.icon;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-brand-blue/30 bg-brand-blue/10 py-0.5 pl-1.5 pr-0.5 text-[0.7rem] font-medium text-foreground">
      <Icon className="size-3 text-brand-blue" aria-hidden />
      {persona.label}
      <button
        type="button"
        onClick={onClear}
        title="Back to auto routing"
        aria-label={`Stop talking to ${persona.label}`}
        className="flex size-4 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="size-3" aria-hidden />
      </button>
    </span>
  );
}
