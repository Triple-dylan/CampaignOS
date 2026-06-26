"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ComboboxOption = {
  value: string;
  label: string;
};

type ComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  options: readonly ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  allowCustom?: boolean;
  customLabel?: string;
  emptyMessage?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
};

export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  allowCustom = true,
  customLabel = "Use custom value",
  emptyMessage = "No matches found.",
  className,
  id,
  disabled,
}: ComboboxProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [customModeForced, setCustomModeForced] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const isKnownOption = options.some((option) => option.value === value);
  const customMode =
    customModeForced || (Boolean(value) && !isKnownOption);

  const selectedOption = options.find((option) => option.value === value);
  const displayLabel = selectedOption?.label ?? (value || placeholder);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(normalizedQuery),
  );

  const queryMatchesOption = options.some(
    (option) => option.label.toLowerCase() === normalizedQuery,
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectOption(optionValue: string) {
    onChange(optionValue);
    setCustomModeForced(false);
    setCustomValue("");
    setQuery("");
    setOpen(false);
  }

  function enableCustomMode() {
    setCustomModeForced(true);
    setOpen(false);
    setCustomValue(value && !isKnownOption ? value : "");
  }

  function commitCustomValue() {
    const trimmed = customValue.trim();
    if (trimmed) {
      onChange(trimmed);
    }
    setCustomModeForced(false);
  }

  if (customMode) {
    return (
      <div className={cn("space-y-2", className)}>
        <Input
          id={id}
          value={customValue || (!isKnownOption ? value : "")}
          onChange={(event) => setCustomValue(event.target.value)}
          onBlur={commitCustomValue}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitCustomValue();
            }
            if (event.key === "Escape") {
              setCustomModeForced(false);
            }
          }}
          placeholder="Enter custom value…"
          disabled={disabled}
          autoFocus
        />
        <button
          type="button"
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          onClick={() => {
            setCustomModeForced(false);
            setOpen(true);
          }}
        >
          Back to list
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background/60 px-2.5 text-left text-sm backdrop-blur-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30",
          !value && "text-muted-foreground",
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </button>

      {open ? (
        <div
          className="glass-card absolute z-50 mt-1 w-full overflow-hidden rounded-lg p-1 shadow-lg"
          role="presentation"
        >
          <div className="p-1.5">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setOpen(false);
                }
                if (event.key === "Enter" && filtered[0]) {
                  event.preventDefault();
                  selectOption(filtered[0].value);
                }
              }}
            />
          </div>

          <ul
            id={listboxId}
            role="listbox"
            className="max-h-56 overflow-y-auto p-1"
          >
            {filtered.length === 0 ? (
              <li className="px-2 py-1.5 text-xs text-muted-foreground">
                {emptyMessage}
              </li>
            ) : (
              filtered.map((option) => {
                const selected = option.value === value;
                return (
                  <li key={option.value} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                        selected && "bg-accent text-accent-foreground",
                      )}
                      onClick={() => selectOption(option.value)}
                    >
                      <Check
                        className={cn(
                          "size-4 shrink-0",
                          selected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate">{option.label}</span>
                    </button>
                  </li>
                );
              })
            )}

            {allowCustom &&
            normalizedQuery &&
            !queryMatchesOption &&
            !filtered.some((o) => o.label.toLowerCase() === normalizedQuery) ? (
              <li role="option" aria-selected={false}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                  onClick={() => selectOption(query.trim())}
                >
                  <span className="text-muted-foreground">Use</span>
                  <span className="font-medium">&ldquo;{query.trim()}&rdquo;</span>
                </button>
              </li>
            ) : null}
          </ul>

          {allowCustom ? (
            <div className="border-t border-border/60 p-1">
              <button
                type="button"
                className="w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={enableCustomMode}
              >
                {customLabel}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
