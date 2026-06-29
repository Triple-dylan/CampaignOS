"use client";

import { useCallback, useMemo, useState } from "react";
import {
  CalendarRange,
  Columns3,
  MessageSquarePlus,
  Plus,
  Rows3,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useChat } from "@/components/chat/chat-provider";
import { BriefDetailDrawer } from "@/components/research/brief-detail-drawer";
import { BriefFormDialog } from "@/components/research/brief-form-dialog";
import {
  GuidedBriefDialog,
  type GuidedWorkflow,
} from "@/components/research/guided-brief-dialog";
import { ResearchBoard } from "@/components/research/research-board";
import { ResearchList } from "@/components/research/research-list";
import type { BriefGraphLink } from "@/components/research/research-stages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DbResearchBrief } from "@/lib/db/schema";
import {
  RESEARCH_TYPE_LABELS,
  researchTypeSchema,
  type ResearchType,
} from "@/lib/validators/research-briefs";

type ResearchHubProps = {
  briefs: DbResearchBrief[];
  openAiConfigured: boolean;
  topIssues?: string[];
  graphLinksByBrief?: Record<string, BriefGraphLink[]>;
};

type ViewMode = "board" | "list";

export function ResearchHub({
  briefs,
  openAiConfigured,
  topIssues = [],
  graphLinksByBrief = {},
}: ResearchHubProps) {
  const router = useRouter();
  const { setChatRailOpen } = useChat();
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [typeFilter, setTypeFilter] = useState<ResearchType | "all">("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [guidedWorkflow, setGuidedWorkflow] = useState<GuidedWorkflow | null>(
    null,
  );
  const [selectedBrief, setSelectedBrief] = useState<DbResearchBrief | null>(
    null,
  );

  const refresh = useCallback(() => router.refresh(), [router]);

  const graphLinkCountByBrief = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [briefId, links] of Object.entries(graphLinksByBrief)) {
      counts[briefId] = links.length;
    }
    return counts;
  }, [graphLinksByBrief]);

  const filteredBriefs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return briefs.filter((brief) => {
      if (typeFilter !== "all" && brief.research_type !== typeFilter) {
        return false;
      }
      if (query) {
        const haystack = [
          brief.title,
          brief.topic ?? "",
          brief.summary ?? "",
          ...(brief.key_findings_json ?? []),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [briefs, typeFilter, search]);

  const selectedGraphLinks = selectedBrief
    ? (graphLinksByBrief[selectedBrief.id] ?? [])
    : [];

  const hasBriefs = briefs.length > 0;
  const hasResults = filteredBriefs.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-3 md:p-4">
      <Toolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        search={search}
        onSearchChange={setSearch}
        briefCount={briefs.length}
        onNewReport={() => setGuidedWorkflow("event")}
        onNewComparison={() => setGuidedWorkflow("incumbent")}
        onNewBrief={() => setCreateOpen(true)}
        disableViewToggle={!hasBriefs}
      />

      {!hasBriefs ? (
        <ResearchInbox
          onNewReport={() => setGuidedWorkflow("event")}
          onNewComparison={() => setGuidedWorkflow("incumbent")}
          onNewBrief={() => setCreateOpen(true)}
          onAskInChat={() => setChatRailOpen(true)}
        />
      ) : !hasResults ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-10 text-center">
          <Search className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">No briefs match your filters</p>
          <p className="text-xs text-muted-foreground">
            Try clearing the search or switching the type filter.
          </p>
        </div>
      ) : viewMode === "board" ? (
        <ResearchBoard
          briefs={filteredBriefs}
          graphLinkCountByBrief={graphLinkCountByBrief}
          onOpen={setSelectedBrief}
        />
      ) : (
        <ResearchList
          briefs={filteredBriefs}
          graphLinkCountByBrief={graphLinkCountByBrief}
          onOpen={setSelectedBrief}
        />
      )}

      <BriefFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        openAiConfigured={openAiConfigured}
        topIssues={topIssues}
        onSuccess={refresh}
      />

      <GuidedBriefDialog
        workflow={guidedWorkflow}
        onOpenChange={(open) => {
          if (!open) setGuidedWorkflow(null);
        }}
        openAiConfigured={openAiConfigured}
        topIssues={topIssues}
        onSuccess={refresh}
      />

      <BriefDetailDrawer
        brief={selectedBrief}
        graphLinks={selectedGraphLinks}
        onClose={() => setSelectedBrief(null)}
        onChanged={refresh}
      />
    </div>
  );
}

type ToolbarProps = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  typeFilter: ResearchType | "all";
  onTypeFilterChange: (value: ResearchType | "all") => void;
  search: string;
  onSearchChange: (value: string) => void;
  briefCount: number;
  onNewReport: () => void;
  onNewComparison: () => void;
  onNewBrief: () => void;
  disableViewToggle: boolean;
};

function Toolbar({
  viewMode,
  onViewModeChange,
  typeFilter,
  onTypeFilterChange,
  search,
  onSearchChange,
  briefCount,
  onNewReport,
  onNewComparison,
  onNewBrief,
  disableViewToggle,
}: ToolbarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-border bg-card/60 p-0.5">
          <button
            type="button"
            disabled={disableViewToggle}
            onClick={() => onViewModeChange("board")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
              viewMode === "board"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Columns3 className="size-3.5" aria-hidden />
            Board
          </button>
          <button
            type="button"
            disabled={disableViewToggle}
            onClick={() => onViewModeChange("list")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
              viewMode === "list"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Rows3 className="size-3.5" aria-hidden />
            List
          </button>
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search briefs…"
            className="h-8 w-44 pl-8"
            aria-label="Search briefs"
          />
        </div>

        <Select
          value={typeFilter}
          onChange={(event) =>
            onTypeFilterChange(event.target.value as ResearchType | "all")
          }
          className="h-8 max-w-40"
          aria-label="Filter by type"
        >
          <option value="all">All types</option>
          {researchTypeSchema.options.map((type) => (
            <option key={type} value={type}>
              {RESEARCH_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>

        <span className="text-xs text-muted-foreground">
          {briefCount} brief{briefCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={onNewReport}>
          <CalendarRange data-icon="inline-start" className="size-3.5" />
          New report
        </Button>
        <Button size="sm" variant="outline" onClick={onNewComparison}>
          <Users data-icon="inline-start" className="size-3.5" />
          New comparison
        </Button>
        <Button size="sm" onClick={onNewBrief}>
          <Plus data-icon="inline-start" className="size-3.5" />
          New brief
        </Button>
      </div>
    </div>
  );
}

type ResearchInboxProps = {
  onNewReport: () => void;
  onNewComparison: () => void;
  onNewBrief: () => void;
  onAskInChat: () => void;
};

function ResearchInbox({
  onNewReport,
  onNewComparison,
  onNewBrief,
  onAskInChat,
}: ResearchInboxProps) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="glass-card w-full max-w-2xl rounded-2xl border border-border p-8 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-border bg-card/70">
          <Sparkles className="size-6 text-muted-foreground" aria-hidden />
        </div>
        <h2 className="font-heading text-lg font-semibold">
          Your research inbox is empty
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Capture district intel, event prep, and opponent comparisons. Every
          brief becomes a node in your campaign knowledge graph.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <QuickStart
            icon={CalendarRange}
            title="Event research"
            description="Prep a town hall, debate, or fundraiser."
            cta="New report"
            onClick={onNewReport}
          />
          <QuickStart
            icon={Users}
            title="Incumbent research"
            description="Compare candidates across key dimensions."
            cta="New comparison"
            onClick={onNewComparison}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={onNewBrief}>
            <Plus data-icon="inline-start" className="size-3.5" />
            Blank brief
          </Button>
          <Button variant="ghost" size="sm" onClick={onAskInChat}>
            <MessageSquarePlus data-icon="inline-start" className="size-3.5" />
            Ask in chat
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuickStart({
  icon: Icon,
  title,
  description,
  cta,
  onClick,
}: {
  icon: typeof CalendarRange;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/quick flex flex-col items-start gap-1 rounded-xl border border-border bg-card/60 p-4 text-left transition-all hover:-translate-y-px hover:border-foreground/20 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background/70 text-muted-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="mt-1 text-sm font-medium text-foreground">{title}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
      <span className="mt-2 text-xs font-medium text-primary">{cta} →</span>
    </button>
  );
}
