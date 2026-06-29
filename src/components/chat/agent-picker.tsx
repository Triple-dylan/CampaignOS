"use client";

import * as React from "react";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { useChat } from "@/components/chat/chat-provider";
import { AGENT_PERSONAS, agentPersona } from "@/lib/agents";
import { cn } from "@/lib/utils";

type AgentPickerProps = {
  /** Where the menu opens relative to the trigger. */
  placement?: "top" | "bottom";
  className?: string;
};

/**
 * Composer agent picker. Agent personas are modes of the same chat — switching
 * here changes who the user is talking to without leaving the conversation.
 */
export function AgentPicker({ placement = "top", className }: AgentPickerProps) {
  const { agentMode, setAgentMode } = useChat();
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const active = agentPersona(agentMode);

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Switch agent"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-[0.7rem] font-medium text-foreground outline-hidden transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Sparkles className="size-3.5 text-brand-blue" aria-hidden />
        <span className="max-w-[10rem] truncate">{active.label}</span>
        <ChevronDown
          className={cn(
            "size-3 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "glass-frost absolute z-50 w-64 rounded-xl p-1.5",
            placement === "top" ? "bottom-full mb-2" : "top-full mt-2",
            "left-0",
          )}
        >
          <p className="px-2 pb-1 pt-1 text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground/70">
            Talk to
          </p>
          {AGENT_PERSONAS.map((persona) => {
            const isActive = persona.id === agentMode;
            return (
              <button
                key={persona.id}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  setAgentMode(persona.id);
                  setOpen(false);
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
                {isActive ? (
                  <Check className="size-3.5 shrink-0 text-brand-blue" aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
