"use client";

import { Brain, ChevronDown } from "lucide-react";
import { useChat } from "@/components/chat/chat-provider";
import {
  CHAT_EFFORTS,
  CHAT_MODELS,
  getChatModel,
  isChatEffortId,
  isChatModelId,
  type ChatEffortId,
  type ChatModelId,
} from "@/lib/ai/chat-models";
import { cn } from "@/lib/utils";

type ChatModelControlsProps = {
  className?: string;
  /** Compact rail vs wider dock composer. */
  density?: "rail" | "dock";
};

/**
 * Cursor-style model + effort pickers for the chat composer. Selections live in
 * {@link useChat} and are forwarded on every `sendChatMessage` call so the API
 * path is ready once OpenAI is configured.
 *
 * Effort always shows: reasoning models receive `reasoning_effort`, others map
 * it to temperature until the provider API is fully connected.
 */
export function ChatModelControls({
  className,
  density = "rail",
}: ChatModelControlsProps) {
  const { chatModel, setChatModel, chatEffort, setChatEffort } = useChat();
  const modelMeta = getChatModel(chatModel);
  const effortMeta = CHAT_EFFORTS.find((effort) => effort.id === chatEffort);

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1",
        density === "dock" && "gap-1.5",
        className,
      )}
    >
      <label className="relative inline-flex min-w-0 items-center">
        <span className="sr-only">Model</span>
        <select
          value={chatModel}
          onChange={(event) => {
            if (isChatModelId(event.target.value)) {
              setChatModel(event.target.value as ChatModelId);
            }
          }}
          title={modelMeta.description}
          className={cn(
            "max-w-[9.5rem] appearance-none truncate rounded-md border border-transparent bg-transparent py-1 pr-5 pl-1.5 text-[0.7rem] font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25",
            density === "dock" && "max-w-[11rem] text-xs",
          )}
        >
          {CHAT_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-0.5 size-3 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      </label>

      <label className="relative inline-flex items-center">
        <span className="sr-only">Effort</span>
        <Brain
          className="pointer-events-none absolute top-1/2 left-1.5 size-3 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <select
          value={chatEffort}
          onChange={(event) => {
            if (isChatEffortId(event.target.value)) {
              setChatEffort(event.target.value as ChatEffortId);
            }
          }}
          title={
            modelMeta.supportsReasoningEffort
              ? effortMeta?.description
              : `${effortMeta?.description ?? "Effort"} (maps to response temperature for this model)`
          }
          className={cn(
            "appearance-none rounded-md border border-transparent bg-transparent py-1 pr-5 pl-6 text-[0.7rem] font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25",
            density === "dock" && "text-xs",
          )}
        >
          {CHAT_EFFORTS.map((effort) => (
            <option key={effort.id} value={effort.id}>
              {effort.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-0.5 size-3 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      </label>
    </div>
  );
}
