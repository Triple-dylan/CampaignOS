"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { WorkflowPhase } from "@/lib/workflows/chat-machine";

export type ChatMessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  workflowProgress?: string;
  workflowPhase?: WorkflowPhase;
};

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
}: ChatMessageBubbleProps) {
  return (
    <div
      className={cn(
        "max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
        role === "user"
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card text-foreground",
      )}
    >
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
      {pending ? (
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
        renderContentWithLinks(content)
      )}
    </div>
  );
}
