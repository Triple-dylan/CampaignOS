"use client";

import { ChipMultiSelect } from "@/components/ui/chip-multi-select";
import { cn } from "@/lib/utils";

type TagInputProps = {
  value: string[];
  onChange: (value: string[]) => void;
  suggestions?: readonly string[];
  placeholder?: string;
  maxItems?: number;
  className?: string;
};

/** @deprecated Prefer ChipMultiSelect for toggle-chip UX. */
export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Add item…",
  maxItems = 12,
  className,
}: TagInputProps) {
  return (
    <ChipMultiSelect
      value={value}
      onChange={onChange}
      options={suggestions}
      maxItems={maxItems}
      allowCustom
      customPlaceholder={placeholder}
      className={cn(className)}
    />
  );
}
