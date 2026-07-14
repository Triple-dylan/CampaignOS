"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Flag,
  Moon,
  PanelRightClose,
  Sparkles,
  Sun,
  Type,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GraphNodeTypeBadge } from "@/components/brain/graph-node-badge";
import { getSourceObjectLink } from "@/lib/graph/source-links";
import type {
  CampaignGraphFlow,
  CampaignGraphNodeData,
} from "@/lib/graph/to-react-flow";
import { getCampaignFolder } from "@/lib/campaign-knowledge/folders";
import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";
import type { WorkspaceDigest } from "@/lib/workspace/digest";
import {
  daysUntilElection,
  formatElectionCountdown,
} from "@/lib/campaign/utils";
import {
  CENTER_DISPLAY_MODES,
  buildCenterDisplayContent,
  type CenterDisplayMode,
} from "@/lib/graph/center-display";
import type { CampaignGraphPreferences } from "@/lib/graph/graph-preferences";
import { cn } from "@/lib/utils";

export type WorkspaceMetrics = {
  graphNodeCount: number;
  assetCount: number;
  taskCount: number;
  upcomingEventCount: number;
  researchBriefCount: number;
  prospectCount: number;
};

export type WorkspaceContextPanelProps = {
  campaign: DbCampaign | null;
  profile: DbCampaignProfile | null;
  metrics: WorkspaceMetrics;
  /** Actionable digest for the default (nothing selected) view. */
  digest?: WorkspaceDigest | null;
  graph: CampaignGraphFlow | null;
  selectedNode: CampaignGraphNodeData | null;
  onClose: () => void;
  onClearSelection: () => void;
  /** Graph gear preferences — centre display editor when centre node selected. */
  graphPreferences?: CampaignGraphPreferences;
  onGraphPreferencesChange?: (
    patch: Partial<CampaignGraphPreferences>,
  ) => void;
  /** Teammates currently focused on the selected graph node. */
  presencePeerCount?: number;
};

export function WorkspaceContextPanelContent({
  campaign,
  profile,
  metrics,
  digest = null,
  graph,
  selectedNode,
  onClose,
  onClearSelection,
  graphPreferences,
  onGraphPreferencesChange,
  presencePeerCount = 0,
}: WorkspaceContextPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border/60 px-4">
        <h2 className="text-sm font-semibold">
          {selectedNode ? "Preview" : digest ? "Today" : "Campaign"}
          {selectedNode && presencePeerCount > 0 ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              · {presencePeerCount} here
            </span>
          ) : null}
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
          selectedNode.isCampaignCenter ? (
            <CenterNodeEditor
              campaign={campaign}
              profile={profile}
              digest={digest}
              node={selectedNode}
              preferences={graphPreferences}
              onPreferencesChange={onGraphPreferencesChange}
            />
          ) : selectedNode.isFolderHub && selectedNode.folder ? (
            <FolderHubDetail
              folderId={selectedNode.folder}
              graph={graph}
              hubNode={selectedNode}
            />
          ) : (
            <NodeDetail node={selectedNode} />
          )
        ) : digest ? (
          <CampaignDigest campaign={campaign} digest={digest} />
        ) : (
          <CampaignOverview
            campaign={campaign}
            profile={profile}
            metrics={metrics}
          />
        )}
      </div>

      <AccessibilitySection />
    </div>
  );
}

export function WorkspaceContextPanel({
  open = true,
  ...props
}: WorkspaceContextPanelProps & { open?: boolean }) {
  return (
    <aside
      inert={!open}
      aria-hidden={!open}
      className={cn(
        "glass-frost motion-panel hidden shrink-0 flex-col overflow-hidden md:flex",
        open ? "w-80" : "w-0 border-transparent opacity-0 shadow-none",
      )}
    >
      {/* Fixed-width inner column so content doesn't squish while animating. */}
      <div className="flex h-full w-80 min-h-0 flex-col">
        <WorkspaceContextPanelContent {...props} />
      </div>
    </aside>
  );
}

function FolderHubDetail({
  folderId,
  graph,
  hubNode,
}: {
  folderId: CampaignFolderId;
  graph: CampaignGraphFlow | null;
  hubNode: CampaignGraphNodeData;
}) {
  const folder = getCampaignFolder(folderId);

  const childDocuments = React.useMemo(() => {
    if (!graph) return [];
    return graph.nodes
      .filter(
        (node) =>
          !node.data.isFolderHub &&
          node.data.folder === folderId &&
          node.data.knowledgePath,
      )
      .map((node) => node.data)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [graph, folderId]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
          {folder.slug}/
        </p>
        <h3 className="mt-1 text-base font-semibold leading-snug">
          {folder.label}
        </h3>
        <GraphNodeTypeBadge nodeType={hubNode.nodeType} className="mt-2" />
      </div>

      <div>
        <p className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
          Folder purpose
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {folder.description}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Agents read <code className="text-foreground">{folder.slug}/_context.md</code>{" "}
          before descending into this folder (wiki-llm pattern).
        </p>
      </div>

      <div>
        <p className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
          Pages in this folder
        </p>
        {childDocuments.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {childDocuments.map((doc) => (
              <li
                key={doc.dbId}
                className="rounded-lg border border-border bg-card px-3 py-2"
              >
                <p className="text-sm font-medium leading-snug">{doc.title}</p>
                {doc.knowledgePath ? (
                  <p className="mt-0.5 font-mono text-[0.65rem] text-muted-foreground">
                    {doc.knowledgePath}
                  </p>
                ) : null}
                {doc.summary?.trim() ? (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {doc.summary}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No document pages in this folder yet. Add a markdown page with{" "}
            <code className="text-foreground">node_type</code> frontmatter to
            sync it here.
          </p>
        )}
      </div>
    </div>
  );
}

function CenterNodeEditor({
  campaign,
  profile,
  digest,
  node,
  preferences,
  onPreferencesChange,
}: {
  campaign: DbCampaign | null;
  profile: DbCampaignProfile | null;
  digest: WorkspaceDigest | null | undefined;
  node: CampaignGraphNodeData;
  preferences?: CampaignGraphPreferences;
  onPreferencesChange?: (patch: Partial<CampaignGraphPreferences>) => void;
}) {
  const mode = preferences?.center.displayMode ?? "election_dates";
  const customLabel = preferences?.center.customLabel ?? "";
  const customSubtitle = preferences?.center.customSubtitle ?? "";

  const preview = buildCenterDisplayContent({
    mode,
    customLabel,
    customSubtitle,
    campaign,
    profile,
    digest: digest ?? null,
  });

  const setMode = (displayMode: CenterDisplayMode) => {
    onPreferencesChange?.({
      center: {
        displayMode,
        customLabel,
        customSubtitle,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
          Campaign centre
        </p>
        <h3 className="mt-1 text-base font-semibold leading-snug">{node.title}</h3>
      </div>

      <div>
        <p className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
          Center display
        </p>
        <ul className="mt-2 space-y-1">
          {CENTER_DISPLAY_MODES.map((option) => (
            <li key={option.id}>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border px-2.5 py-2 transition-colors hover:bg-accent has-[:checked]:border-brand-blue/50 has-[:checked]:bg-brand-blue/5">
                <input
                  type="radio"
                  name="center-display"
                  checked={mode === option.id}
                  onChange={() => setMode(option.id)}
                  className="mt-0.5 accent-brand-blue"
                />
                <span>
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {mode === "custom" ? (
        <div className="space-y-2">
          <label className="flex flex-col gap-1">
            <span className="text-[0.7rem] font-medium text-muted-foreground">
              Custom title
            </span>
            <input
              type="text"
              value={customLabel}
              onChange={(e) =>
                onPreferencesChange?.({
                  center: {
                    displayMode: mode,
                    customLabel: e.target.value,
                    customSubtitle,
                  },
                })
              }
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[0.7rem] font-medium text-muted-foreground">
              Subtitle
            </span>
            <input
              type="text"
              value={customSubtitle}
              onChange={(e) =>
                onPreferencesChange?.({
                  center: {
                    displayMode: mode,
                    customLabel,
                    customSubtitle: e.target.value,
                  },
                })
              }
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </label>
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
          Preview
        </p>
        <p className="mt-1.5 text-sm font-semibold">{preview.title}</p>
        {preview.electionCountdown ? (
          <p className="mt-0.5 text-xs font-medium text-brand-blue">
            {preview.electionCountdown}
          </p>
        ) : null}
        {preview.summary ? (
          <p className="mt-1 text-xs text-muted-foreground">{preview.summary}</p>
        ) : null}
      </div>
    </div>
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
        {node.knowledgePath ? (
          <p className="mt-2 font-mono text-[0.65rem] text-muted-foreground">
            {node.knowledgePath}
          </p>
        ) : null}
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

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatShortDate(iso: string | null): string {
  if (!iso) return "No date";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now() - 24 * 60 * 60 * 1000;
}

function DigestSection({
  icon,
  label,
  href,
  hrefLabel,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  hrefLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </p>
        <Link
          href={href}
          className="text-[0.7rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {hrefLabel}
        </Link>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/**
 * The actionable default view of the right rail: what's due, what's coming
 * up, what needs review, and what agents have done — instead of static
 * campaign facts the user already knows by heart.
 */
function CampaignDigest({
  campaign,
  digest,
}: {
  campaign: DbCampaign | null;
  digest: WorkspaceDigest;
}) {
  if (!campaign) {
    return (
      <p className="text-sm text-muted-foreground">
        Complete your campaign setup to see live context here.
      </p>
    );
  }

  const days = daysUntilElection(campaign.election_date);
  const { fundraising } = digest;
  const reviewCount = digest.reviewAssets.length + digest.pendingComplianceCount;

  return (
    <div className="space-y-6">
      {/* Impact strip: countdown + fundraising progress */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold">
            {formatElectionCountdown(days)}
          </p>
          {fundraising.progressPercent != null ? (
            <p className="text-xs text-muted-foreground">
              {fundraising.progressPercent}% of goal
            </p>
          ) : null}
        </div>
        {fundraising.effectiveGoal != null ? (
          <>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-accent">
              <div
                className="h-full rounded-full bg-brand-blue transition-[width]"
                style={{ width: `${fundraising.progressPercent ?? 0}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {currencyFormatter.format(fundraising.raisedAmount)} raised of{" "}
              {currencyFormatter.format(fundraising.effectiveGoal)}
            </p>
          </>
        ) : null}
      </div>

      <DigestSection
        icon={<Flag className="size-3" aria-hidden />}
        label="Up next"
        href="/tasks"
        hrefLabel="All tasks"
      >
        {digest.dueTasks.length > 0 ? (
          <ul className="space-y-1.5">
            {digest.dueTasks.map((task) => (
              <li key={task.id}>
                <Link
                  href="/tasks"
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-2.5 py-2 transition-colors hover:bg-accent"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        task.priority === "high"
                          ? "bg-red-500"
                          : task.priority === "medium"
                            ? "bg-amber-500"
                            : "bg-muted-foreground/40",
                      )}
                      aria-hidden
                    />
                    <span className="truncate text-sm">{task.title}</span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-xs",
                      isOverdue(task.dueDate)
                        ? "font-medium text-red-600 dark:text-red-400"
                        : "text-muted-foreground",
                    )}
                  >
                    {formatShortDate(task.dueDate)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No open tasks. Ask the copilot to plan your next block of work.
          </p>
        )}
      </DigestSection>

      <DigestSection
        icon={<CalendarDays className="size-3" aria-hidden />}
        label="Next two weeks"
        href="/planner"
        hrefLabel="Planner"
      >
        {digest.upcomingEvents.length > 0 ? (
          <ul className="space-y-1.5">
            {digest.upcomingEvents.map((event) => (
              <li key={event.id}>
                <Link
                  href="/planner"
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-2.5 py-2 transition-colors hover:bg-accent"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm">
                      {event.title}
                    </span>
                    {event.location ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {event.location}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatShortDate(event.startTime)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing scheduled in the next two weeks.
          </p>
        )}
      </DigestSection>

      <DigestSection
        icon={<CheckCircle2 className="size-3" aria-hidden />}
        label="Needs your review"
        href="/assets"
        hrefLabel="Assets"
      >
        {reviewCount > 0 ? (
          <ul className="space-y-1.5">
            {digest.reviewAssets.map((asset) => (
              <li key={asset.id}>
                <Link
                  href="/assets"
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-2.5 py-2 transition-colors hover:bg-accent"
                >
                  <span className="truncate text-sm">{asset.title}</span>
                  <span className="shrink-0 text-xs capitalize text-muted-foreground">
                    {asset.assetType.replace(/_/g, " ")}
                  </span>
                </Link>
              </li>
            ))}
            {digest.pendingComplianceCount > 0 ? (
              <li>
                <Link
                  href="/compliance"
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-2.5 py-2 transition-colors hover:bg-accent"
                >
                  <span className="truncate text-sm">
                    Compliance reviews pending
                  </span>
                  <span className="shrink-0 text-xs font-medium text-amber-600 dark:text-amber-400">
                    {digest.pendingComplianceCount}
                  </span>
                </Link>
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Review queue is clear.
          </p>
        )}
      </DigestSection>

      <DigestSection
        icon={<Sparkles className="size-3" aria-hidden />}
        label="Agent activity"
        href="/automations"
        hrefLabel="Automations"
      >
        {digest.recentActivity.length > 0 ? (
          <ul className="space-y-1.5">
            {digest.recentActivity.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-2.5 py-2"
              >
                <span className="truncate text-sm capitalize">
                  {entry.module.replace(/[-_]/g, " ")}
                  {entry.createdObjectType
                    ? ` · ${entry.createdObjectType.replace(/_/g, " ")}`
                    : ""}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelativeTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No agent runs yet. Generated content and research will show up
            here.
          </p>
        )}
      </DigestSection>
    </div>
  );
}

/**
 * Lean fallback when no digest data is available (e.g. the Brain page):
 * workspace counts only — no static campaign facts.
 */
function CampaignOverview({
  campaign,
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

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Select a node on the graph to preview it here.
      </p>

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
