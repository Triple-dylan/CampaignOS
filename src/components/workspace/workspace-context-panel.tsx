"use client";

import Link from "next/link";
import {
  ArrowRight,
  PanelRightClose,
  PanelRightOpen,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GraphNodeTypeBadge } from "@/components/brain/graph-node-badge";
import { getSourceObjectLink } from "@/lib/graph/source-links";
import type { CampaignGraphNodeData } from "@/lib/graph/to-react-flow";
import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";
import { campaignDisplayName } from "@/lib/db/schema";
import {
  daysUntilElection,
  formatElectionCountdown,
  formatElectionDate,
  formatFundraisingGoal,
} from "@/lib/campaign/utils";
import { cn } from "@/lib/utils";

export type WorkspaceMetrics = {
  graphNodeCount: number;
  assetCount: number;
  taskCount: number;
  upcomingEventCount: number;
  researchBriefCount: number;
  prospectCount: number;
};

type WorkspaceContextPanelProps = {
  campaign: DbCampaign | null;
  profile: DbCampaignProfile | null;
  metrics: WorkspaceMetrics;
  selectedNode: CampaignGraphNodeData | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onClearSelection: () => void;
};

export function WorkspaceContextPanel({
  campaign,
  profile,
  metrics,
  selectedNode,
  collapsed,
  onToggleCollapsed,
  onClearSelection,
}: WorkspaceContextPanelProps) {
  if (collapsed) {
    return (
      <div className="glass-floating hidden w-12 shrink-0 flex-col items-center gap-2 rounded-2xl py-3 lg:flex">
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Open context panel"
          className="glass-hover flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <PanelRightOpen className="size-4" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <aside className="glass-floating hidden w-80 shrink-0 flex-col overflow-hidden rounded-2xl lg:flex">
      <div className="relative z-10 flex items-center justify-between gap-2 border-b border-border/50 px-4 py-3">
        <h2 className="text-sm font-semibold">
          {selectedNode ? "Node details" : "Campaign context"}
        </h2>
        <div className="flex items-center gap-1">
          {selectedNode ? (
            <button
              type="button"
              onClick={onClearSelection}
              aria-label="Clear selection"
              className="glass-hover flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Collapse context panel"
            className="glass-hover flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <PanelRightClose className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="relative z-10 min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {selectedNode ? (
          <NodeDetail node={selectedNode} />
        ) : (
          <CampaignOverview
            campaign={campaign}
            profile={profile}
            metrics={metrics}
          />
        )}
      </div>
    </aside>
  );
}

function NodeDetail({ node }: { node: CampaignGraphNodeData }) {
  const sourceLink = getSourceObjectLink({
    sourceObjectType: node.sourceObjectType,
    sourceObjectId: node.sourceObjectId,
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold leading-snug">{node.title}</h3>
        <GraphNodeTypeBadge nodeType={node.nodeType} className="mt-2" />
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Summary
        </p>
        {node.summary?.trim() ? (
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed">
            {node.summary}
          </p>
        ) : (
          <p className="mt-1.5 text-sm text-muted-foreground">
            No summary for this node yet.
          </p>
        )}
      </div>

      {node.sourceObjectType ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Source
          </p>
          <p className="mt-1 text-sm capitalize">
            {node.sourceObjectType.replace(/_/g, " ")}
          </p>
        </div>
      ) : null}

      {sourceLink ? (
        <Button
          className="w-full"
          render={<Link href={sourceLink.href} />}
        >
          {sourceLink.label}
          <ArrowRight data-icon="inline-end" className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

function CampaignOverview({
  campaign,
  profile,
  metrics,
}: {
  campaign: DbCampaign | null;
  profile: DbCampaignProfile | null;
  metrics: WorkspaceMetrics;
}) {
  if (!campaign) {
    return (
      <p className="text-sm text-muted-foreground">
        Complete your campaign setup to see live context here.
      </p>
    );
  }

  const days = daysUntilElection(campaign.election_date);
  const topIssues = profile?.top_issues ?? [];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-lg font-semibold leading-tight">
          {campaignDisplayName(campaign)}
        </p>
        <p className="text-sm text-muted-foreground">
          {campaign.office_sought?.trim() || "Office not set"}
          {campaign.jurisdiction?.trim() ? ` · ${campaign.jurisdiction}` : ""}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <OverviewStat
          label="Election"
          value={formatElectionDate(campaign.election_date)}
        />
        <OverviewStat label="Countdown" value={formatElectionCountdown(days)} />
        <OverviewStat label="State" value={campaign.state ?? "WA"} />
        <OverviewStat
          label="Goal"
          value={formatFundraisingGoal(profile?.fundraising_goal ?? null)}
        />
      </dl>

      {topIssues.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Top issues
          </p>
          <div className="flex flex-wrap gap-1.5">
            {topIssues.map((issue) => (
              <span
                key={issue}
                className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
              >
                {issue}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Workspace
        </p>
        <div className="grid grid-cols-2 gap-2">
          <MetricTile label="Graph nodes" value={metrics.graphNodeCount} href="/brain" />
          <MetricTile label="Assets" value={metrics.assetCount} href="/assets" />
          <MetricTile label="Open tasks" value={metrics.taskCount} href="/tasks" />
          <MetricTile
            label="Upcoming events"
            value={metrics.upcomingEventCount}
            href="/planner"
          />
          <MetricTile
            label="Research"
            value={metrics.researchBriefCount}
            href="/research"
          />
          <MetricTile
            label="Prospects"
            value={metrics.prospectCount}
            href="/fundraising"
          />
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        render={<Link href="/brain" />}
      >
        Open full Campaign Brain
        <ArrowRight data-icon="inline-end" className="size-3.5" />
      </Button>
    </div>
  );
}

function OverviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5">
      <dt className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-medium">{value}</dd>
    </div>
  );
}

function MetricTile({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "glass-hover rounded-lg border border-border/60 bg-background/50 p-2.5",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      )}
    >
      <p className="text-xl font-semibold tracking-tight">{value}</p>
      <p className="text-[0.6875rem] text-muted-foreground">{label}</p>
    </Link>
  );
}
