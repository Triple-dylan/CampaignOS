import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const selectTriggerClass =
  "h-8 w-full min-w-0 appearance-none truncate rounded-lg border border-input bg-background/60 px-2.5 py-1 pr-8 text-base backdrop-blur-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

/**
 * Native select styled to match the design system: compact 32px trigger with a
 * chevron indicator, same surface + focus treatment as {@link Input}. Sizing /
 * width overrides passed via `className` land on the wrapper so the chevron
 * stays anchored to the visible control.
 */
function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <span className={cn("relative inline-flex h-8 w-full min-w-0", className)}>
      <select
        data-slot="select"
        className={cn(selectTriggerClass, "h-full")}
        {...props}
      />
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  );
}

export { Select, selectTriggerClass };
