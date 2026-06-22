"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { Lightbulb, Loader2, Plus, SquareCheckBig, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createTaskFromResearchBrief,
  deleteResearchBriefAction,
  updateResearchBriefContent,
} from "@/actions/research";
import {
  ResearchBriefStatusBadge,
  ResearchTypeBadge,
} from "@/components/research/brief-badges";
import { BriefFormDialog } from "@/components/research/brief-form-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DbResearchBrief, ResearchSourceJson } from "@/lib/db/schema";
import {
  RESEARCH_BRIEF_STATUS_LABELS,
  RESEARCH_TYPE_LABELS,
  researchBriefStatusSchema,
  researchTypeSchema,
  type ResearchBriefStatus,
  type ResearchType,
} from "@/lib/validators/research-briefs";

type ResearchHubProps = {
  briefs: DbResearchBrief[];
  openAiConfigured: boolean;
  topIssues?: string[];
};

type BriefFilters = {
  researchType: ResearchType | "all";
  status: ResearchBriefStatus | "all";
  dateRange: "all" | "7d" | "30d";
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function keyFindingsList(brief: DbResearchBrief): string[] {
  if (Array.isArray(brief.key_findings_json) && brief.key_findings_json.length) {
    return brief.key_findings_json;
  }
  return [];
}

function sourcesList(brief: DbResearchBrief): ResearchSourceJson[] {
  if (Array.isArray(brief.sources_json) && brief.sources_json.length) {
    return brief.sources_json;
  }
  return [];
}

function findingsToText(findings: string[]): string {
  return findings.join("\n");
}

function sourcesToText(sources: ResearchSourceJson[]): string {
  return sources
    .map((source) =>
      [source.url, source.title, source.snippet].filter(Boolean).join(" | "),
    )
    .join("\n");
}

function parseKeyFindings(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseSources(value: string): ResearchSourceJson[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      if (parts.length >= 2) {
        return {
          url: parts[0] ?? "",
          title: parts[1] ?? "Source",
          snippet: parts[2],
        };
      }
      return { url: line, title: line };
    });
}

export function ResearchHub({
  briefs,
  openAiConfigured,
  topIssues = [],
}: ResearchHubProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedBrief, setSelectedBrief] = useState<DbResearchBrief | null>(
    null,
  );
  const [filters, setFilters] = useState<BriefFilters>({
    researchType: "all",
    status: "all",
    dateRange: "all",
  });
  const [editTitle, setEditTitle] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editFindingsText, setEditFindingsText] = useState("");
  const [editSourcesText, setEditSourcesText] = useState("");
  const [editStatus, setEditStatus] = useState<ResearchBriefStatus>("draft");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredBriefs = useMemo(() => {
    const cutoffDate =
      filters.dateRange === "all"
        ? null
        : (() => {
            const date = new Date();
            date.setDate(date.getDate() - (filters.dateRange === "7d" ? 7 : 30));
            return date;
          })();

    return briefs.filter((brief) => {
      if (
        filters.researchType !== "all" &&
        brief.research_type !== filters.researchType
      ) {
        return false;
      }
      if (filters.status !== "all" && brief.status !== filters.status) {
        return false;
      }
      if (cutoffDate !== null) {
        const created = new Date(brief.created_at);
        if (Number.isNaN(created.getTime()) || created < cutoffDate) {
          return false;
        }
      }
      return true;
    });
  }, [briefs, filters]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  function openBriefDetail(brief: DbResearchBrief) {
    setSelectedBrief(brief);
    setEditTitle(brief.title);
    setEditTopic(brief.topic ?? "");
    setEditSummary(brief.summary ?? "");
    setEditBody(brief.body ?? "");
    setEditFindingsText(findingsToText(keyFindingsList(brief)));
    setEditSourcesText(sourcesToText(sourcesList(brief)));
    setEditStatus(
      brief.status === "complete" ? "complete" : "draft",
    );
    setActionError(null);
  }

  function closeBriefDetail() {
    setSelectedBrief(null);
    setActionError(null);
  }

  function runAction(action: () => Promise<{ ok: boolean; error?: string }>) {
    setActionError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setActionError(result.error ?? "Action failed");
        return;
      }
      closeBriefDetail();
      refresh();
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {briefs.length} brief{briefs.length === 1 ? "" : "s"} in this campaign
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus data-icon="inline-start" className="size-4" />
          Create brief
        </Button>
      </div>

      <section className="flex flex-wrap gap-3">
        <FilterSelect
          label="Type"
          value={filters.researchType}
          onChange={(value) =>
            setFilters((current) => ({
              ...current,
              researchType: value as BriefFilters["researchType"],
            }))
          }
          options={[
            { value: "all", label: "All types" },
            ...researchTypeSchema.options.map((type) => ({
              value: type,
              label: RESEARCH_TYPE_LABELS[type],
            })),
          ]}
        />
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(value) =>
            setFilters((current) => ({
              ...current,
              status: value as BriefFilters["status"],
            }))
          }
          options={[
            { value: "all", label: "All statuses" },
            ...researchBriefStatusSchema.options.map((status) => ({
              value: status,
              label: RESEARCH_BRIEF_STATUS_LABELS[status],
            })),
          ]}
        />
        <FilterSelect
          label="Date"
          value={filters.dateRange}
          onChange={(value) =>
            setFilters((current) => ({
              ...current,
              dateRange: value as BriefFilters["dateRange"],
            }))
          }
          options={[
            { value: "all", label: "All time" },
            { value: "7d", label: "Last 7 days" },
            { value: "30d", label: "Last 30 days" },
          ]}
        />
      </section>

      {filteredBriefs.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
              <Lightbulb className="size-6 text-muted-foreground" />
            </div>
            <CardTitle>No research briefs yet</CardTitle>
            <CardDescription>
              Build district intel, issue deep-dives, and opposition summaries.
              Each brief creates a graph node linked to your campaign.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus data-icon="inline-start" className="size-4" />
              Create your first brief
            </Button>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredBriefs.map((brief) => {
            const findings = keyFindingsList(brief);
            return (
              <Card
                key={brief.id}
                className="cursor-pointer transition-colors hover:bg-muted/30"
                onClick={() => openBriefDetail(brief)}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">
                      {brief.title}
                    </CardTitle>
                    <div className="flex flex-wrap gap-1">
                      <ResearchBriefStatusBadge status={brief.status} />
                      <ResearchTypeBadge type={brief.research_type} />
                    </div>
                  </div>
                  <CardDescription>
                    {(brief.topic?.trim() ||
                      RESEARCH_TYPE_LABELS[brief.research_type as ResearchType]) ??
                      brief.research_type}
                    {brief.ai_generated ? " · AI generated" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="line-clamp-3 text-muted-foreground">
                    {brief.summary?.trim() ||
                      findings[0] ||
                      "No summary yet"}
                  </p>
                  {findings.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {findings.length} key finding{findings.length === 1 ? "" : "s"}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDate(brief.updated_at)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      <BriefFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        openAiConfigured={openAiConfigured}
        topIssues={topIssues}
        onSuccess={refresh}
      />

      <Dialog
        open={Boolean(selectedBrief)}
        onOpenChange={(open) => {
          if (!open) closeBriefDetail();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          {selectedBrief ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedBrief.title}</DialogTitle>
                <DialogDescription>
                  {RESEARCH_TYPE_LABELS[selectedBrief.research_type as ResearchType] ?? selectedBrief.research_type}
                  {" · "}
                  Updated {formatDate(selectedBrief.updated_at)}
                </DialogDescription>
                <div className="flex flex-wrap gap-2 pt-1">
                  <ResearchBriefStatusBadge status={selectedBrief.status} />
                  <ResearchTypeBadge type={selectedBrief.research_type} />
                  {selectedBrief.ai_generated ? (
                    <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900 dark:bg-violet-950 dark:text-violet-200">
                      AI generated
                    </span>
                  ) : null}
                </div>
              </DialogHeader>

              <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
                <div className="space-y-2">
                  <Label htmlFor="detail-title">Title</Label>
                  <Input
                    id="detail-title"
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="detail-topic">Topic</Label>
                  <Input
                    id="detail-topic"
                    value={editTopic}
                    onChange={(event) => setEditTopic(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="detail-summary">Summary</Label>
                  <textarea
                    id="detail-summary"
                    className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={editSummary}
                    onChange={(event) => setEditSummary(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="detail-findings">Key findings</Label>
                  <textarea
                    id="detail-findings"
                    className="flex min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={editFindingsText}
                    onChange={(event) => setEditFindingsText(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sources</Label>
                  {selectedBrief.ai_generated ? (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                      AI-generated references — verify independently before use in
                      paid media, mailers, or public statements.
                    </p>
                  ) : null}
                  <ul className="space-y-2 text-sm">
                    {parseSources(editSourcesText).map((source, index) => (
                      <li
                        key={`${source.url}-${index}`}
                        className="rounded-md border bg-muted/30 p-3"
                      >
                        {isValidUrl(source.url) ? (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary underline-offset-4 hover:underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {source.title}
                          </a>
                        ) : (
                          <span className="font-medium">{source.title}</span>
                        )}
                        {source.snippet ? (
                          <p className="mt-1 text-muted-foreground">
                            {source.snippet}
                          </p>
                        ) : null}
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {source.url}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <textarea
                    className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={editSourcesText}
                    onChange={(event) => setEditSourcesText(event.target.value)}
                    placeholder="url | title | snippet"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detail-body">Notes</Label>
                  <textarea
                    id="detail-body"
                    className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={editBody}
                    onChange={(event) => setEditBody(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detail-status">Status</Label>
                  <select
                    id="detail-status"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={editStatus}
                    onChange={(event) =>
                      setEditStatus(event.target.value as ResearchBriefStatus)
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="complete">Complete</option>
                  </select>
                </div>

                {actionError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {actionError}
                  </p>
                ) : null}
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    runAction(async () => {
                      const result = await createTaskFromResearchBrief(
                        selectedBrief.id,
                      );
                      return result.ok
                        ? { ok: true }
                        : { ok: false, error: result.error };
                    })
                  }
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <SquareCheckBig data-icon="inline-start" className="size-4" />
                      Create task
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    runAction(async () => {
                      const result = await updateResearchBriefContent({
                        briefId: selectedBrief.id,
                        title: editTitle.trim(),
                        topic: editTopic.trim() || null,
                        summary: editSummary.trim() || null,
                        body: editBody.trim() || null,
                        keyFindings: parseKeyFindings(editFindingsText),
                        sources: parseSources(editSourcesText),
                        status: editStatus,
                      });
                      return result.ok
                        ? { ok: true }
                        : { ok: false, error: result.error };
                    })
                  }
                >
                  Save changes
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isPending}
                  onClick={() =>
                    runAction(async () => {
                      const result = await deleteResearchBriefAction(
                        selectedBrief.id,
                      );
                      return result.ok
                        ? { ok: true }
                        : { ok: false, error: result.error };
                    })
                  }
                >
                  <Trash2 data-icon="inline-start" className="size-4" />
                  Delete
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <select
        className="h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
