"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useCampaign } from "@/components/campaign/campaign-context";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
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
  const campaignName = campaign ? campaignDisplayName(campaign) : null;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {showCampaignContext && (orgName || campaignName) ? (
          <nav
            aria-label="Campaign breadcrumb"
            className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground"
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
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-sm font-semibold leading-none">{title}</h1>
          {description ? (
            <p className="truncate text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {showCampaignContext && campaign?.office_sought?.trim() ? (
        <Link
          href="/settings"
          className="hidden shrink-0 text-xs text-muted-foreground hover:text-foreground sm:inline"
        >
          {campaign.office_sought}
        </Link>
      ) : null}
    </header>
  );
}
