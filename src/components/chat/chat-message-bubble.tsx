"use client";

import * as React from "react";
import type { AgentMode } from "@/actions/chat";
import { agentPersona } from "@/lib/agents";
import {
  randomThinkingLineIndex,
  THINKING_LINES,
} from "@/lib/thinking-lines";
import { cn } from "@/lib/utils";
import type { WorkflowPhase } from "@/lib/workflows/chat-machine";

export type ChatMessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  workflowProgress?: string;
  workflowPhase?: WorkflowPhase;
  /** Specialist attribution shown above assistant replies. */
  agentId?: AgentMode;
};

/**
 * While the assistant works, cycle through US civic facts and officeholder
 * quotes instead of a generic "thinking" label. A new line fades in every few
 * seconds; the bouncing dots stay as the activity cue.
 */
function ThinkingInterlude() {
  const [lineIndex, setLineIndex] = React.useState(() =>
    randomThinkingLineIndex(),
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      setLineIndex((current) => randomThinkingLineIndex(current));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const line = THINKING_LINES[lineIndex];

  return (
    <span className="flex flex-col gap-1.5 py-0.5">
      <span className="flex items-center gap-1">
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
      <span
        key={lineIndex}
        className="max-w-prose text-xs italic leading-relaxed text-muted-foreground"
        style={{ animation: "graph-node-fade 0.5s ease both" }}
      >
        {line.text}
        {line.attribution ? (
          <span className="not-italic"> — {line.attribution}</span>
        ) : null}
      </span>
    </span>
  );
}

function renderContentWithLinks(content: string): React.ReactNode {
  const parts = content.split(/(\/[a-z?=&\w-]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith("/")) {
      return (
        <a
          key={index}
          href={part}
          className="font-medium underline underline-offset-2 hover:opacity-80"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export function ChatMessageBubble({
  role,
  content,
  pending,
  workflowProgress,
  workflowPhase,
  agentId,
}: ChatMessageBubbleProps) {
  const persona = role === "assistant" && agentId ? agentPersona(agentId) : null;
  return (
    <div
      className={cn(
        "max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
        role === "user"
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card text-foreground",
      )}
    >
      {persona ? (
        <span className="mb-1 flex items-center gap-1 text-[0.65rem] font-medium text-muted-foreground">
          <persona.icon className="size-3 text-brand-blue" aria-hidden />
          {persona.label}
        </span>
      ) : null}
      {workflowProgress && role === "assistant" ? (
        <p
          className={cn(
            "mb-1.5 text-[0.65rem] font-medium uppercase tracking-wide",
            workflowPhase === "error"
              ? "text-destructive"
              : workflowPhase === "complete"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-brand-blue",
          )}
        >
          {workflowProgress}
        </p>
      ) : null}
      {pending ? <ThinkingInterlude /> : renderContentWithLinks(content)}
    </div>
  );
}
