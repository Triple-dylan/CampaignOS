"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import {
  Loader2,
  Pencil,
  Phone,
  PiggyBank,
  Plus,
  Sparkles,
  SquareCheckBig,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createTaskFromProspect,
  deleteFundraisingProspectAction,
  generateProspectOutreach,
  updateFundraisingProspectAction,
} from "@/actions/fundraising";
import { PlanFormDialog } from "@/components/fundraising/plan-form-dialog";
import {
  CapacityTierBadge,
  ProspectStatusBadge,
  ProspectTypeBadge,
} from "@/components/fundraising/prospect-badges";
import { ProspectFormDialog } from "@/components/fundraising/prospect-form-dialog";
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
import { formatFundraisingGoal } from "@/lib/campaign/utils";
import type {
  DbFundraisingPlan,
  DbFundraisingProspect,
  FundraisingTimelineMilestoneJson,
} from "@/lib/db/schema";
import type { FundraisingProgressSummary } from "@/lib/db/fundraising-plans";
import {
  CAPACITY_TIER_LABELS,
  PROSPECT_STATUS_LABELS,
  PROSPECT_TYPE_LABELS,
  capacityTierSchema,
  getCapacityTier,
  prospectStatusSchema,
  prospectTypeSchema,
  type CapacityTier,
  type OutreachHistoryEntry,
  type ProspectStatus,
  type ProspectType,
} from "@/lib/validators/fundraising";
import type { ProspectOutreachOutput } from "@/lib/ai/schemas/fundraising";
import { ResponsiveActionGroup } from "@/components/layout/responsive-action-group";
import { MOBILE_DIALOG_CONTENT_CLASS } from "@/lib/mobile-dialog";
import { cn } from "@/lib/utils";

const PIPELINE_STAGES = [
  "research",
  "not_contacted",
  "contacted",
  "follow_up",
  "pledged",
  "donated",
] as const satisfies readonly ProspectStatus[];

type FundraisingPlannerProps = {
  plan: DbFundraisingPlan | null;
  prospects: DbFundraisingProspect[];
  taskCounts: Record<string, number>;
  profileGoal: number | null;
  progress: FundraisingProgressSummary;
  openAiConfigured: boolean;
  topIssues?: string[];
  /** Deep-link from graph — opens the matching prospect detail. */
  initialProspectId?: string | null;
};

type ProspectFilters = {
  status: ProspectStatus | "all";
  capacityTier: CapacityTier;
  relatedIssue: string;
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

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return `$${Number(value).toLocaleString()}`;
}

function milestonesList(
  plan: DbFundraisingPlan | null,
): FundraisingTimelineMilestoneJson[] {
  if (!plan?.timeline_json?.length) return [];
  return plan.timeline_json.filter((entry) => entry.title?.trim());
}

function outreachHistoryList(
  prospect: DbFundraisingProspect,
): OutreachHistoryEntry[] {
  if (!prospect.outreach_history_json?.length) return [];
  return prospect.outreach_history_json.filter((entry) =>
    entry.summary?.trim(),
  ) as OutreachHistoryEntry[];
}

function outreachToText(entries: OutreachHistoryEntry[]): string {
  return entries
    .map((entry) =>
      [entry.date, entry.channel, entry.summary, entry.outcome]
        .filter(Boolean)
        .join(" | "),
    )
    .join("\n");
}

function parseOutreachHistory(value: string): OutreachHistoryEntry[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      return {
        date: parts[0],
        channel: parts[1],
        summary: parts[2] ?? line,
        outcome: parts[3],
      };
    });
}

function formatOutreachDraft(outreach: ProspectOutreachOutput): string {
  const lines = [
    outreach.subject ? `Subject: ${outreach.subject}` : null,
    "",
    outreach.opening,
    "",
    "Talking points:",
    ...outreach.talking_points.map((point) => `• ${point}`),
    "",
    `Ask: ${outreach.ask}`,
    "",
    `Follow-up: ${outreach.follow_up}`,
    "",
    "---",
    "",
    outreach.script,
  ].filter((line) => line !== null);

  return lines.join("\n");
}

export function FundraisingPlanner({
  plan,
  prospects,
  taskCounts,
  profileGoal,
  progress,
  openAiConfigured,
  topIssues = [],
  initialProspectId = null,
}: FundraisingPlannerProps) {
  const router = useRouter();
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] =
    useState<DbFundraisingProspect | null>(
      () => prospects.find((prospect) => prospect.id === initialProspectId) ?? null,
    );
  const [filters, setFilters] = useState<ProspectFilters>({
    status: "all",
    capacityTier: "all",
    relatedIssue: "",
  });
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<ProspectType>("individual");
  const [editOrg, setEditOrg] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editIssue, setEditIssue] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [editAlignment, setEditAlignment] = useState("");
  const [editStatus, setEditStatus] = useState<ProspectStatus>("research");
  const [editNotes, setEditNotes] = useState("");
  const [editOutreachText, setEditOutreachText] = useState("");
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [callTimeMode, setCallTimeMode] = useState(false);
  const [callTimeProspect, setCallTimeProspect] =
    useState<DbFundraisingProspect | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const issueOptions = useMemo(() => {
    const fromProspects = prospects
      .map((prospect) => prospect.related_issue?.trim())
      .filter(Boolean) as string[];
    const combined = new Set([...topIssues, ...fromProspects]);
    return Array.from(combined).sort();
  }, [prospects, topIssues]);

  const filteredProspects = useMemo(() => {
    return prospects.filter((prospect) => {
      if (filters.status !== "all" && prospect.status !== filters.status) {
        return false;
      }
      if (
        filters.capacityTier !== "all" &&
        getCapacityTier(prospect.estimated_capacity) !== filters.capacityTier
      ) {
        return false;
      }
      if (
        filters.relatedIssue &&
        (prospect.related_issue?.trim() ?? "") !== filters.relatedIssue
      ) {
        return false;
      }
      return true;
    });
  }, [prospects, filters]);

  const milestones = milestonesList(plan);

  const pipelineCounts = useMemo(() => {
    const counts = new Map<ProspectStatus, number>();
    for (const stage of PIPELINE_STAGES) {
      counts.set(stage, 0);
    }
    for (const prospect of prospects) {
      const status = prospect.status as ProspectStatus;
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
    return counts;
  }, [prospects]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  function openProspectDetail(prospect: DbFundraisingProspect) {
    setSelectedProspect(prospect);
    setEditName(prospect.name);
    setEditType(prospect.prospect_type as ProspectType);
    setEditOrg(prospect.organization_name ?? "");
    setEditEmail(prospect.email ?? "");
    setEditPhone(prospect.phone ?? "");
    setEditIssue(prospect.related_issue ?? "");
    setEditCapacity(
      prospect.estimated_capacity != null
        ? String(prospect.estimated_capacity)
        : "",
    );
    setEditAlignment(prospect.alignment_reason ?? "");
    setEditStatus(prospect.status as ProspectStatus);
    setEditNotes(prospect.notes ?? "");
    setEditOutreachText(outreachToText(outreachHistoryList(prospect)));
    setAiDraft(null);
    setActionError(null);
  }

  function closeProspectDetail() {
    setSelectedProspect(null);
    setAiDraft(null);
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
      closeProspectDetail();
      refresh();
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-3 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {prospects.length} prospect{prospects.length === 1 ? "" : "s"} in
          pipeline
        </p>
        <ResponsiveActionGroup
          primary={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus data-icon="inline-start" className="size-4" />
              Add prospect
            </Button>
          }
          overflow={
            <Button
              variant={callTimeMode ? "default" : "outline"}
              onClick={() => {
                setCallTimeMode((on) => !on);
                setCallTimeProspect(null);
              }}
            >
              <Phone data-icon="inline-start" className="size-3.5" />
              Call time
            </Button>
          }
          overflowLabel="Fundraising actions"
        />
      </div>

      <section>
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Fundraising plan</CardTitle>
              <CardDescription>
                {plan
                  ? `Updated ${formatDate(plan.updated_at)}`
                  : "Create a plan to track goals and milestones"}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPlanDialogOpen(true)}
            >
              <Pencil data-icon="inline-start" className="size-4" />
              {plan ? "Edit plan" : "Create plan"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <SummaryItem
                label="Onboarding goal"
                value={formatFundraisingGoal(profileGoal)}
              />
              <SummaryItem
                label="Plan goal"
                value={formatFundraisingGoal(plan?.goal_amount ?? null)}
              />
              <SummaryItem
                label="Raised (manual)"
                value={formatCurrency(progress.raisedAmount)}
              />
              <SummaryItem
                label="Progress"
                value={
                  progress.progressPercent != null
                    ? `${progress.progressPercent}%`
                    : "—"
                }
              />
            </dl>

            {progress.effectiveGoal != null && progress.effectiveGoal > 0 ? (
              <div className="glass-card space-y-2 rounded-xl border border-border p-3">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(progress.raisedAmount)} raised</span>
                  <span className="font-medium text-foreground">
                    {progress.progressPercent ?? 0}% of goal
                  </span>
                  <span>{formatCurrency(progress.effectiveGoal)} goal</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/50">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all"
                    style={{
                      width: `${Math.min(progress.progressPercent ?? 0, 100)}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Set a fundraising goal in onboarding or your plan to track
                progress.
              </p>
            )}

            {plan?.outreach_strategy?.trim() ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Outreach strategy
                </p>
                <p className="mt-1 whitespace-pre-line text-sm">
                  {plan.outreach_strategy}
                </p>
              </div>
            ) : null}

            {milestones.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Timeline milestones
                </p>
                <ul className="space-y-2 text-sm">
                  {milestones.map((milestone, index) => (
                    <li
                      key={`${milestone.title}-${index}`}
                      className="rounded-md border bg-muted/30 px-3 py-2"
                    >
                      <p className="font-medium">{milestone.title}</p>
                      <p className="text-muted-foreground">
                        {[
                          milestone.targetDate,
                          milestone.targetAmount != null
                            ? formatCurrency(milestone.targetAmount)
                            : null,
                          milestone.notes,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      {prospects.length > 0 ? (
        <section className="glass-card rounded-xl border border-border p-3">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pipeline stages
          </p>
          <div className="flex snap-x snap-mandatory gap-1 overflow-x-auto pb-1">
            {PIPELINE_STAGES.map((stage, index) => {
              const count = pipelineCounts.get(stage) ?? 0;
              return (
                <div
                  key={stage}
                  className="flex min-w-[4.75rem] shrink-0 snap-start items-center sm:min-w-0 sm:flex-1"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setFilters((current) => ({ ...current, status: stage }))
                    }
                    className={cn(
                      "flex min-w-[4.5rem] flex-1 flex-col items-center gap-1 rounded-lg border px-2 py-2 text-center transition-colors",
                      filters.status === stage
                        ? "border-primary/40 bg-primary/5"
                        : "border-transparent hover:border-border hover:bg-card/60",
                    )}
                  >
                    <span className="text-lg font-semibold tabular-nums">
                      {count}
                    </span>
                    <span className="line-clamp-2 text-[0.6rem] font-medium leading-tight text-muted-foreground">
                      {PROSPECT_STATUS_LABELS[stage]}
                    </span>
                  </button>
                  {index < PIPELINE_STAGES.length - 1 ? (
                    <div
                      className="mx-0.5 hidden h-px w-2 shrink-0 bg-border sm:block"
                      aria-hidden
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(value) =>
            setFilters((current) => ({
              ...current,
              status: value as ProspectFilters["status"],
            }))
          }
          options={[
            { value: "all", label: "All statuses" },
            ...prospectStatusSchema.options.map((status) => ({
              value: status,
              label: PROSPECT_STATUS_LABELS[status],
            })),
          ]}
        />
        <FilterSelect
          label="Capacity"
          value={filters.capacityTier}
          onChange={(value) =>
            setFilters((current) => ({
              ...current,
              capacityTier: value as CapacityTier,
            }))
          }
          options={[
            { value: "all", label: "All tiers" },
            ...capacityTierSchema.options
              .filter((tier) => tier !== "all")
              .map((tier) => ({
                value: tier,
                label: CAPACITY_TIER_LABELS[tier],
              })),
          ]}
        />
        <FilterSelect
          label="Issue"
          value={filters.relatedIssue}
          onChange={(value) =>
            setFilters((current) => ({
              ...current,
              relatedIssue: value,
            }))
          }
          options={[
            { value: "", label: "All issues" },
            ...issueOptions.map((issue) => ({ value: issue, label: issue })),
          ]}
        />
      </section>

      {filteredProspects.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="glass-card w-full max-w-2xl rounded-2xl border border-border p-8 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-border bg-card/70">
              <PiggyBank className="size-6 text-muted-foreground" />
            </div>
            <h2 className="font-heading text-lg font-semibold">No prospects yet</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Build your donor pipeline with capacity estimates, issue alignment,
              and follow-up tasks.
            </p>
            <Button className="mt-6" onClick={() => setCreateOpen(true)}>
              <Plus data-icon="inline-start" className="size-4" />
              Add your first prospect
            </Button>
          </div>
        </div>
      ) : callTimeMode ? (
        <section className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="glass-card flex flex-col gap-2 overflow-y-auto rounded-xl border border-border p-2">
            <p className="px-2 pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Call list
            </p>
            {filteredProspects.map((prospect) => (
              <button
                key={prospect.id}
                type="button"
                onClick={() => setCallTimeProspect(prospect)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-colors",
                  callTimeProspect?.id === prospect.id
                    ? "border-primary/40 bg-primary/5"
                    : "border-transparent hover:border-border hover:bg-card/60",
                )}
              >
                <p className="text-sm font-medium">{prospect.name}</p>
                <p className="text-xs text-muted-foreground">
                  {prospect.phone?.trim() || prospect.email?.trim() || "No contact"}
                  {prospect.estimated_capacity != null
                    ? ` · ${formatCurrency(prospect.estimated_capacity)}`
                    : ""}
                </p>
              </button>
            ))}
          </div>

          <div className="glass-card flex flex-col rounded-xl border border-border p-4">
            {callTimeProspect ? (
              <>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold">
                      {callTimeProspect.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {callTimeProspect.organization_name?.trim() ||
                        "Individual donor"}
                    </p>
                  </div>
                  <ProspectStatusBadge status={callTimeProspect.status} />
                </div>
                <div className="flex-1 space-y-3 rounded-lg border border-dashed border-border bg-muted/20 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Call script (stub)
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Hi {callTimeProspect.name.split(" ")[0]}, this is [your name]
                    with the campaign. I wanted to share why we&apos;re running and
                    ask for your support
                    {callTimeProspect.related_issue
                      ? ` on ${callTimeProspect.related_issue}`
                      : ""}
                    .
                  </p>
                  {callTimeProspect.alignment_reason ? (
                    <p className="text-sm text-foreground/80">
                      <span className="font-medium">Talking point: </span>
                      {callTimeProspect.alignment_reason}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Full AI-generated scripts available in prospect detail. Select
                    a prospect and use &ldquo;AI draft outreach&rdquo; for a
                    personalized script.
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openProspectDetail(callTimeProspect)}
                  >
                    Open full detail
                  </Button>
                  {openAiConfigured ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => {
                        openProspectDetail(callTimeProspect);
                        startTransition(async () => {
                          const result = await generateProspectOutreach({
                            prospectId: callTimeProspect.id,
                            channel: "phone",
                          });
                          if (result.ok) {
                            setAiDraft(formatOutreachDraft(result.outreach));
                          }
                        });
                      }}
                    >
                      <Sparkles data-icon="inline-start" className="size-3.5" />
                      Generate script
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                <Phone className="size-8 text-muted-foreground/50" aria-hidden />
                <p className="text-sm font-medium">Select a prospect</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Choose someone from the call list to see a script panel stub.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProspects.map((prospect) => {
            const taskCount = taskCounts[prospect.id] ?? 0;
            return (
              <Card
                key={prospect.id}
                className="cursor-pointer transition-shadow hover:shadow-[var(--glass-shadow-pop)]"
                onClick={() => openProspectDetail(prospect)}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">
                      {prospect.name}
                    </CardTitle>
                    <div className="flex flex-wrap gap-1">
                      <ProspectStatusBadge status={prospect.status} />
                      <ProspectTypeBadge type={prospect.prospect_type} />
                    </div>
                  </div>
                  <CardDescription>
                    {prospect.organization_name?.trim() || "No organization"}
                    {prospect.related_issue
                      ? ` · ${prospect.related_issue}`
                      : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <CapacityTierBadge amount={prospect.estimated_capacity} />
                    {prospect.estimated_capacity != null ? (
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(prospect.estimated_capacity)}
                      </span>
                    ) : null}
                  </div>
                  <p className="line-clamp-2 text-muted-foreground">
                    {prospect.alignment_reason?.trim() ||
                      prospect.notes?.trim() ||
                      "No notes yet"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {taskCount > 0
                      ? `${taskCount} linked task${taskCount === 1 ? "" : "s"}`
                      : "No linked tasks"}
                    {" · "}
                    Updated {formatDate(prospect.updated_at)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      <PlanFormDialog
        key={
          planDialogOpen
            ? `${plan?.id ?? "new"}-${plan?.updated_at ?? ""}`
            : "closed"
        }
        open={planDialogOpen}
        onOpenChange={setPlanDialogOpen}
        plan={plan}
        profileGoal={profileGoal}
        onSuccess={refresh}
      />

      <ProspectFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        topIssues={topIssues}
        onSuccess={refresh}
      />

      <Dialog
        open={Boolean(selectedProspect)}
        onOpenChange={(open) => {
          if (!open) closeProspectDetail();
        }}
      >
        <DialogContent className={cn("sm:max-w-2xl", MOBILE_DIALOG_CONTENT_CLASS)}>
          {selectedProspect ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedProspect.name}</DialogTitle>
                <DialogDescription>
                  {PROSPECT_TYPE_LABELS[
                    selectedProspect.prospect_type as ProspectType
                  ] ?? selectedProspect.prospect_type}
                  {" · "}
                  Updated {formatDate(selectedProspect.updated_at)}
                  {(taskCounts[selectedProspect.id] ?? 0) > 0
                    ? ` · ${taskCounts[selectedProspect.id]} linked task${
                        taskCounts[selectedProspect.id] === 1 ? "" : "s"
                      }`
                    : ""}
                </DialogDescription>
                <div className="flex flex-wrap gap-2 pt-1">
                  <ProspectStatusBadge status={selectedProspect.status} />
                  <ProspectTypeBadge type={selectedProspect.prospect_type} />
                  <CapacityTierBadge
                    amount={selectedProspect.estimated_capacity}
                  />
                </div>
              </DialogHeader>

              <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="detail-name">Name</Label>
                    <Input
                      id="detail-name"
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="detail-status">Status</Label>
                    <select
                      id="detail-status"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      value={editStatus}
                      onChange={(event) =>
                        setEditStatus(event.target.value as ProspectStatus)
                      }
                    >
                      {prospectStatusSchema.options.map((status) => (
                        <option key={status} value={status}>
                          {PROSPECT_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="detail-type">Type</Label>
                    <select
                      id="detail-type"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      value={editType}
                      onChange={(event) =>
                        setEditType(event.target.value as ProspectType)
                      }
                    >
                      {prospectTypeSchema.options.map((type) => (
                        <option key={type} value={type}>
                          {PROSPECT_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="detail-org">Organization</Label>
                    <Input
                      id="detail-org"
                      value={editOrg}
                      onChange={(event) => setEditOrg(event.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="detail-email">Email</Label>
                    <Input
                      id="detail-email"
                      type="email"
                      value={editEmail}
                      onChange={(event) => setEditEmail(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="detail-phone">Phone</Label>
                    <Input
                      id="detail-phone"
                      value={editPhone}
                      onChange={(event) => setEditPhone(event.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="detail-issue">Related issue</Label>
                    <Input
                      id="detail-issue"
                      value={editIssue}
                      onChange={(event) => setEditIssue(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="detail-capacity">Est. capacity ($)</Label>
                    <Input
                      id="detail-capacity"
                      inputMode="numeric"
                      value={editCapacity}
                      onChange={(event) => setEditCapacity(event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detail-alignment">Alignment reason</Label>
                  <textarea
                    id="detail-alignment"
                    className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={editAlignment}
                    onChange={(event) => setEditAlignment(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detail-notes">Notes</Label>
                  <textarea
                    id="detail-notes"
                    className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={editNotes}
                    onChange={(event) => setEditNotes(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detail-outreach">Outreach history</Label>
                  <textarea
                    id="detail-outreach"
                    className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={editOutreachText}
                    onChange={(event) => setEditOutreachText(event.target.value)}
                    placeholder="date | channel | summary | outcome"
                  />
                </div>

                {aiDraft ? (
                  <div className="space-y-2">
                    <Label>AI outreach draft</Label>
                    <textarea
                      readOnly
                      className="flex min-h-40 w-full rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm dark:border-violet-900 dark:bg-violet-950/40"
                      value={aiDraft}
                    />
                    <p className="text-xs text-muted-foreground">
                      Review and personalize before sending. AI drafts are logged
                      to ai_generation_logs.
                    </p>
                  </div>
                ) : null}

                {actionError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {actionError}
                  </p>
                ) : null}
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:flex-wrap">
                {openAiConfigured ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => {
                      setActionError(null);
                      startTransition(async () => {
                        const result = await generateProspectOutreach({
                          prospectId: selectedProspect.id,
                          channel: "email",
                        });
                        if (!result.ok) {
                          setActionError(result.error);
                          return;
                        }
                        setAiDraft(formatOutreachDraft(result.outreach));
                      });
                    }}
                  >
                    {isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles data-icon="inline-start" className="size-4" />
                        AI draft outreach
                      </>
                    )}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    runAction(async () => {
                      const result = await createTaskFromProspect(
                        selectedProspect.id,
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
                      Create follow-up task
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    setActionError(null);
                    startTransition(async () => {
                      const capacityValue = editCapacity.trim()
                        ? Number(editCapacity.replace(/,/g, ""))
                        : null;

                      const result = await updateFundraisingProspectAction({
                        prospectId: selectedProspect.id,
                        name: editName.trim(),
                        prospectType: editType,
                        organizationName: editOrg.trim() || null,
                        email: editEmail.trim() || null,
                        phone: editPhone.trim() || null,
                        relatedIssue: editIssue.trim() || null,
                        estimatedCapacity:
                          capacityValue != null && !Number.isNaN(capacityValue)
                            ? capacityValue
                            : null,
                        alignmentReason: editAlignment.trim() || null,
                        status: editStatus,
                        notes: editNotes.trim() || null,
                        outreachHistory: parseOutreachHistory(editOutreachText),
                      });

                      if (!result.ok) {
                        setActionError(result.error);
                        return;
                      }
                      closeProspectDetail();
                      refresh();
                    });
                  }}
                >
                  Save changes
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isPending}
                  onClick={() =>
                    runAction(async () => {
                      const result = await deleteFundraisingProspectAction(
                        selectedProspect.id,
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

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-medium">{value}</dd>
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
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <select
        className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-auto"
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
