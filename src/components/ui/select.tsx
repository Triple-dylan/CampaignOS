import * as React from "react";

import { cn } from "@/lib/utils";

const selectTriggerClass =
  "h-8 w-full min-w-0 appearance-none rounded-lg border border-input bg-background/60 px-2.5 py-1 text-base backdrop-blur-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(selectTriggerClass, className)}
      {...props}
    />
  );
}

export { Select, selectTriggerClass };
