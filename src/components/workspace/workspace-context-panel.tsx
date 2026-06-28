"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  Moon,
  PanelRightClose,
  Sun,
  Type,
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
  onClose: () => void;
  onClearSelection: () => void;
};

export function WorkspaceContextPanel({
  campaign,
  profile,
  metrics,
  selectedNode,
  onClose,
  onClearSelection,
}: WorkspaceContextPanelProps) {
  return (
    <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-background md:flex">
      <div className="flex h-12 items-center justify-between gap-2 border-b border-border px-4">
        <h2 className="text-sm font-semibold">
          {selectedNode ? "Preview" : "Campaign"}
        </h2>
        <div className="flex items-center gap-0.5">
          {selectedNode ? (
            <button
              type="button"
              onClick={onClearSelection}
              aria-label="Clear selection"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Hide preview panel"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <PanelRightClose className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
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

      <AccessibilitySection />
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
        <p className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
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
          <p className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
            Source
          </p>
          <p className="mt-1 text-sm capitalize">
            {node.sourceObjectType.replace(/_/g, " ")}
          </p>
        </div>
      ) : null}

      {sourceLink ? (
        <Button className="w-full" render={<Link href={sourceLink.href} />}>
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
    <div className="space-y-6">
      <div>
        <p className="text-base font-semibold leading-tight">
          {campaignDisplayName(campaign)}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {campaign.office_sought?.trim() || "Office not set"}
          {campaign.jurisdiction?.trim() ? ` · ${campaign.jurisdiction}` : ""}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <OverviewStat
          label="Election"
          value={formatElectionDate(campaign.election_date)}
        />
        <OverviewStat label="Countdown" value={formatElectionCountdown(days)} />
        <OverviewStat label="State" value={campaign.state ?? "—"} />
        <OverviewStat
          label="Goal"
          value={formatFundraisingGoal(profile?.fundraising_goal ?? null)}
        />
      </dl>

      {topIssues.length > 0 ? (
        <div>
          <p className="mb-2 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
            Top issues
          </p>
          <div className="flex flex-wrap gap-1.5">
            {topIssues.map((issue) => (
              <span
                key={issue}
                className="badge-blue rounded-full border px-2.5 py-0.5 text-xs"
              >
                {issue}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
          Workspace
        </p>
        <div className="grid grid-cols-2 gap-2">
          <MetricTile label="Graph nodes" value={metrics.graphNodeCount} href="/brain" />
          <MetricTile label="Assets" value={metrics.assetCount} href="/assets" />
          <MetricTile label="Open tasks" value={metrics.taskCount} href="/tasks" />
          <MetricTile
            label="Upcoming"
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
        Open full knowledge graph
        <ArrowRight data-icon="inline-end" className="size-3.5" />
      </Button>
    </div>
  );
}

function OverviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-2.5">
      <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
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
      className="rounded-lg border border-border bg-card p-2.5 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <p className="text-xl font-semibold tracking-tight">{value}</p>
      <p className="text-[0.7rem] text-muted-foreground">{label}</p>
    </Link>
  );
}

/** Accessibility controls pinned at the bottom of the right rail. */
function AccessibilitySection() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [comfort, setComfort] = React.useState(false);

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("text-comfort", comfort);
  }, [comfort]);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className="space-y-2 border-t border-border p-3">
      <p className="px-1 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
        Accessibility
      </p>
      <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-border bg-card p-1">
        <SegButton
          active={!isDark}
          onClick={() => setTheme("light")}
          icon={<Sun className="size-3.5" aria-hidden />}
          label="Light"
        />
        <SegButton
          active={isDark}
          onClick={() => setTheme("dark")}
          icon={<Moon className="size-3.5" aria-hidden />}
          label="Dark"
        />
      </div>
      <button
        type="button"
        onClick={() => setComfort((v) => !v)}
        aria-pressed={comfort}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-2 text-sm transition-colors hover:bg-accent",
          comfort && "bg-accent",
        )}
      >
        <span className="flex items-center gap-2">
          <Type className="size-3.5 text-muted-foreground" aria-hidden />
          Comfortable text
        </span>
        <span
          className={cn(
            "text-[0.7rem] font-medium",
            comfort ? "text-brand-blue" : "text-muted-foreground",
          )}
        >
          {comfort ? "On" : "Off"}
        </span>
      </button>
    </div>
  );
}

function SegButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-accent text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
