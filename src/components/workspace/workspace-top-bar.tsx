"use client";

import { ChevronRight, PanelLeft, PanelRight } from "lucide-react";
import { useCampaign } from "@/components/campaign/campaign-context";
import { campaignDisplayName } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type WorkspaceTopBarProps = {
  onToggleRail: () => void;
  onTogglePanel: () => void;
  panelOpen: boolean;
  showPanelToggle: boolean;
};

export function WorkspaceTopBar({
  onToggleRail,
  onTogglePanel,
  panelOpen,
  showPanelToggle,
}: WorkspaceTopBarProps) {
  const { orgName, campaign } = useCampaign();
  const campaignName = campaign ? campaignDisplayName(campaign) : null;

  return (
    <header className="glass-bar glass-chrome-top pointer-events-auto sticky top-0 z-30 flex h-11 shrink-0 items-center gap-2 rounded-none border-x-0 border-t-0 border-b-0 px-3 md:px-4">
      <button
        type="button"
        onClick={onToggleRail}
        aria-label="Open navigation"
        className="-ml-1 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:hidden"
      >
        <PanelLeft className="size-4" aria-hidden />
      </button>

      <nav
        aria-label="Workspace breadcrumb"
        className="flex min-w-0 flex-1 items-center gap-1.5 text-sm"
      >
        <span className="truncate font-medium">{orgName ?? "Workspace"}</span>
        {campaignName ? (
          <>
            <ChevronRight
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span className="truncate text-muted-foreground">
              {campaignName}
            </span>
          </>
        ) : null}
      </nav>

      {showPanelToggle ? (
        <button
          type="button"
          onClick={onTogglePanel}
          aria-label={panelOpen ? "Hide preview panel" : "Show preview panel"}
          aria-pressed={panelOpen}
          className={cn(
            "flex size-8 items-center justify-center rounded-md transition-colors hover:bg-accent",
            panelOpen ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <PanelRight className="size-4" aria-hidden />
        </button>
      ) : null}
    </header>
  );
}
