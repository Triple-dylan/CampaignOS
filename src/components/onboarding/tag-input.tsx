"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TagInputProps = {
  value: string[];
  onChange: (value: string[]) => void;
  suggestions?: readonly string[];
  placeholder?: string;
  maxItems?: number;
  className?: string;
};

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Add item…",
  maxItems = 12,
  className,
}: TagInputProps) {
  const availableSuggestions = suggestions.filter(
    (item) => !value.includes(item),
  );

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || value.includes(trimmed) || value.length >= maxItems) {
      return;
    }
    onChange([...value, trimmed]);
  }

  function removeTag(tag: string) {
    onChange(value.filter((item) => item !== tag));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag(event.currentTarget.value);
      event.currentTarget.value = "";
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full p-0.5 hover:bg-background"
              aria-label={`Remove ${tag}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>

      <Input
        placeholder={placeholder}
        onKeyDown={handleKeyDown}
        disabled={value.length >= maxItems}
      />

      {availableSuggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {availableSuggestions.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="outline"
              size="xs"
              onClick={() => addTag(suggestion)}
              disabled={value.length >= maxItems}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
