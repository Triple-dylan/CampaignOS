"use client";

import Link from "next/link";
import { Flag } from "lucide-react";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { useCampaign } from "@/components/campaign/campaign-context";
import { ThreadRailSection } from "@/components/layout/thread-rail-section";
import { AgentRailSection } from "@/components/layout/agent-rail-section";
import { ModuleRailNav } from "@/components/layout/module-rail-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useWorkspaceShell } from "@/components/layout/workspace-shell";
import { clerkAppearance } from "@/lib/clerk/appearance";
import { campaignDisplayName } from "@/lib/db/schema";

export function AppRail() {
  const { campaign } = useCampaign();
  const { closeRailMobile } = useWorkspaceShell();

  const candidateName = campaign
    ? campaignDisplayName(campaign)
    : "Campaign workspace";
  const officeLabel = campaign?.office_sought?.trim();

  return (
    <div className="glass-panel flex h-full w-full flex-col border-r border-border/60">
      <div className="flex flex-col gap-2 p-3">
        <Link
          href="/dashboard"
          onClick={closeRailMobile}
          className="glass-hover flex items-center gap-2.5 rounded-md p-1.5 outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <span className="brand-mark flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg text-white">
            <Flag className="size-4" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold leading-tight">
              CampaignOS
            </span>
            <span className="truncate text-xs leading-tight text-muted-foreground">
              {candidateName}
            </span>
          </span>
        </Link>
        {officeLabel ? (
          <p className="truncate px-1.5 text-xs text-muted-foreground">
            {officeLabel}
          </p>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pb-3">
        <ThreadRailSection />
        <AgentRailSection />
        <ModuleRailNav onNavigate={closeRailMobile} />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border/60 p-2.5">
        <div className="min-w-0 flex-1">
          <OrganizationSwitcher
            appearance={clerkAppearance}
            hidePersonal
            afterCreateOrganizationUrl="/dashboard"
            afterSelectOrganizationUrl="/dashboard"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <UserButton appearance={clerkAppearance} />
        </div>
      </div>
    </div>
  );
}
