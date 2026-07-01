"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChipMultiSelectProps = {
  value: string[];
  onChange: (value: string[]) => void;
  options: readonly string[];
  maxItems?: number;
  allowCustom?: boolean;
  customPlaceholder?: string;
  className?: string;
  size?: "sm" | "default";
};

export function ChipMultiSelect({
  value,
  onChange,
  options,
  maxItems = 12,
  allowCustom = true,
  customPlaceholder = "Add custom…",
  className,
  size = "default",
}: ChipMultiSelectProps) {
  const [customDraft, setCustomDraft] = useState("");
  const atMax = value.length >= maxItems;

  function toggleOption(option: string) {
    if (value.includes(option)) {
      onChange(value.filter((item) => item !== option));
      return;
    }
    if (atMax) return;
    onChange([...value, option]);
  }

  function addCustom() {
    const trimmed = customDraft.trim();
    if (!trimmed || value.includes(trimmed) || atMax) return;
    onChange([...value, trimmed]);
    setCustomDraft("");
  }

  const chipClass = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs";

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Selectable options"
      >
        {options.map((option) => {
          const selected = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              disabled={!selected && atMax}
              onClick={() => toggleOption(option)}
              className={cn(
                "min-h-11 rounded-full border font-medium transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:min-h-0",
                chipClass,
                selected
                  ? "border-primary bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_oklch(1_0_0_/_0.18)]"
                  : "border-border bg-background/60 backdrop-blur-sm hover:bg-muted disabled:opacity-50 dark:bg-input/30",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>

      {value.some((item) => !options.includes(item)) ? (
        <div className="flex flex-wrap gap-2">
          {value
            .filter((item) => !options.includes(item))
            .map((item) => (
              <span
                key={item}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border border-primary bg-primary/10 px-2.5 py-1 text-xs font-medium text-foreground",
                )}
              >
                {item}
                <button
                  type="button"
                  onClick={() => toggleOption(item)}
                  className="rounded-full p-0.5 hover:bg-background/80"
                  aria-label={`Remove ${item}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
        </div>
      ) : null}

      {allowCustom ? (
        <div className="flex gap-2">
          <Input
            value={customDraft}
            onChange={(event) => setCustomDraft(event.target.value)}
            placeholder={customPlaceholder}
            disabled={atMax}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustom();
              }
            }}
            className="flex-1"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={atMax || !customDraft.trim()}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-border bg-background/60 px-2.5 text-xs font-medium backdrop-blur-sm transition-colors hover:bg-muted disabled:opacity-50"
          >
            <Plus className="size-3.5" />
            Add
          </button>
        </div>
      ) : null}
    </div>
  );
}
