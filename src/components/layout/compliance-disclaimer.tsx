"use client";

import * as React from "react";
import { ChevronUp } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Thin status-bar style compliance notice pinned to the bottom of the app,
 * like a desktop app's footer. A quiet legal note — deliberately muted so it
 * never competes with the composer above it. On mobile it collapses to a
 * single tap-to-expand line to save vertical space.
 */
export function ComplianceDisclaimer() {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = React.useState(false);

  const message =
    "CampaignOS supports campaign workflow and recordkeeping only — it does not provide legal advice. Consult qualified counsel for compliance decisions.";

  if (isMobile && !expanded) {
    return (
      <footer
        className="flex h-6 shrink-0 items-center border-t border-border/60 px-3 pb-safe"
        role="note"
        aria-label="Compliance disclaimer"
      >
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex min-h-6 w-full items-center text-[0.65rem] text-muted-foreground/70"
        >
          <span className="truncate">Compliance notice</span>
        </button>
      </footer>
    );
  }

  return (
    <footer
      className={cn(
        "flex shrink-0 items-center border-t border-border/60 px-3 pb-safe text-[0.65rem] text-muted-foreground/70",
        isMobile ? "min-h-6 gap-1.5 py-1" : "h-6 justify-center",
      )}
      role="note"
      aria-label="Compliance disclaimer"
    >
      <p className={cn(isMobile ? "leading-snug" : "truncate")}>{message}</p>
      {isMobile ? (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          aria-label="Collapse compliance notice"
          className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-accent"
        >
          <ChevronUp className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </footer>
  );
}
