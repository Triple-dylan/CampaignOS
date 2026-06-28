"use client";

import { ChevronRight, PanelLeft } from "lucide-react";
import { useCampaign } from "@/components/campaign/campaign-context";
import { useWorkspaceShell } from "@/components/layout/workspace-shell";
import { campaignDisplayName } from "@/lib/db/schema";

type AppHeaderProps = {
  title: string;
  description?: string;
  showCampaignContext?: boolean;
};

export function AppHeader({
  title,
  description,
  showCampaignContext = true,
}: AppHeaderProps) {
  const { orgName, campaign } = useCampaign();
  const { toggleRailMobile } = useWorkspaceShell();
  const campaignName = campaign ? campaignDisplayName(campaign) : null;

  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur-sm">
      <button
        type="button"
        onClick={toggleRailMobile}
        aria-label="Open navigation"
        className="-ml-1 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
      >
        <PanelLeft className="size-4" aria-hidden />
      </button>
      <div className="flex min-w-0 flex-1 flex-col">
        {showCampaignContext && (orgName || campaignName) ? (
          <nav
            aria-label="Campaign breadcrumb"
            className="flex min-w-0 items-center gap-1 text-[0.7rem] text-muted-foreground"
          >
            <span className="truncate">{orgName}</span>
            {campaignName ? (
              <>
                <ChevronRight className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{campaignName}</span>
              </>
            ) : null}
          </nav>
        ) : null}
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="truncate text-sm font-semibold leading-tight">
            {title}
          </h1>
          {description ? (
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
