"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ExternalLink,
  Flag,
  Loader2,
  ScrollText,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { submitComplianceReviewAction } from "@/actions/compliance";
import {
  AutoCheckStatusIcon,
  ComplianceFlagBadge,
  ComplianceReviewBadge,
  complianceRecordSummary,
} from "@/components/compliance/compliance-badges";
import { Button } from "@/components/ui/button";
import {
  Card,
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
import { Label } from "@/components/ui/label";
import {
  autoChecksList,
  recordHasAttentionFlag,
} from "@/lib/db/compliance";
import type { DbComplianceRecordWithAsset } from "@/lib/db/schema";
import { type ComplianceReviewStatus } from "@/lib/validators/assets";
import {
  COMPLIANCE_RECORD_TYPE_LABELS,
  contentTypeLabel,
} from "@/lib/validators/compliance";
import type { ComplianceRecordCounts } from "@/lib/db/compliance";
import { cn } from "@/lib/utils";

type ComplianceDashboardProps = {
  records: DbComplianceRecordWithAsset[];
  counts: ComplianceRecordCounts;
  canReview: boolean;
  campaignState: string;
};

type RiskLane = "urgent" | "disclosure" | "ai_generated" | "rejected";

const RISK_LANES: Array<{
  id: RiskLane;
  label: string;
  icon: typeof AlertTriangle;
  description: string;
}> = [
  {
    id: "urgent",
    label: "Urgent",
    icon: AlertTriangle,
    description: "Pending review with attention flags",
  },
  {
    id: "disclosure",
    label: "Disclosure",
    icon: ScrollText,
    description: "Requires paid-for-by or disclaimer",
  },
  {
    id: "ai_generated",
    label: "AI-generated",
    icon: Bot,
    description: "Content created or assisted by AI",
  },
  {
    id: "rejected",
    label: "Rejected",
    icon: XCircle,
    description: "Changes requested by reviewers",
  },
];

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function classifyRecordLane(record: DbComplianceRecordWithAsset): RiskLane | null {
  if (record.review_status === "rejected") return "rejected";
  if (record.ai_generated) return "ai_generated";
  if (record.required_disclosure) return "disclosure";
  if (
    recordHasAttentionFlag(record) &&
    (record.review_status === "pending" ||
      record.review_status === "required")
  ) {
    return "urgent";
  }
  return null;
}

function contentTypesFromRecords(
  records: DbComplianceRecordWithAsset[],
): string[] {
  const types = new Set<string>();
  for (const record of records) {
    if (record.content_type) {
      types.add(record.content_type);
    }
  }
  return Array.from(types).sort();
}

export function ComplianceDashboard({
  records,
  counts,
  canReview,
  campaignState,
}: ComplianceDashboardProps) {
  const router = useRouter();
  const [selectedRecord, setSelectedRecord] =
    useState<DbComplianceRecordWithAsset | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeLane, setActiveLane] = useState<RiskLane | "all">("all");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");

  const contentTypes = useMemo(
    () => contentTypesFromRecords(records),
    [records],
  );

  const recordsByLane = useMemo(() => {
    const lanes = new Map<RiskLane, DbComplianceRecordWithAsset[]>([
      ["urgent", []],
      ["disclosure", []],
      ["ai_generated", []],
      ["rejected", []],
    ]);

    for (const record of records) {
      const lane = classifyRecordLane(record);
      if (lane) {
        lanes.get(lane)?.push(record);
      }
    }

    return lanes;
  }, [records]);

  const filteredRecords = useMemo(() => {
    let pool =
      activeLane === "all"
        ? records
        : (recordsByLane.get(activeLane) ?? []);

    if (contentTypeFilter !== "all") {
      pool = pool.filter((r) => r.content_type === contentTypeFilter);
    }

    return pool;
  }, [records, recordsByLane, activeLane, contentTypeFilter]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  function openRecordDetail(record: DbComplianceRecordWithAsset) {
    setSelectedRecord(record);
    setReviewNotes(record.review_notes ?? "");
    setActionError(null);
  }

  function closeRecordDetail() {
    setSelectedRecord(null);
    setActionError(null);
  }

  function runReviewAction(action: "approve" | "flag" | "reject") {
    if (!selectedRecord) {
      return;
    }

    setActionError(null);
    startTransition(async () => {
      const result = await submitComplianceReviewAction({
        recordId: selectedRecord.id,
        action,
        reviewNotes: reviewNotes.trim() || undefined,
      });

      if (!result.ok) {
        setActionError(result.error);
        return;
      }

      closeRecordDetail();
      refresh();
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-3 md:p-4">
      <div className="glass-bar flex items-start gap-2.5 rounded-xl px-3 py-2.5">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">
            Workflow & recordkeeping only — not legal advice.
          </span>{" "}
          Consult qualified counsel for election law decisions. Configured for{" "}
          {campaignState} campaigns.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending review"
          value={counts.pendingReview}
          highlight={counts.pendingReview > 0}
        />
        <StatCard label="Flagged" value={counts.flagged} />
        <StatCard label="Reviewed" value={counts.reviewed} />
        <StatCard label="Changes requested" value={counts.rejected} />
      </section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveLane("all")}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
              activeLane === "all"
                ? "border-primary/40 bg-primary/5 text-foreground"
                : "border-transparent bg-card/60 text-muted-foreground hover:border-border",
            )}
          >
            All lanes
            <span className="ml-1 tabular-nums opacity-70">{records.length}</span>
          </button>
          {RISK_LANES.map((lane) => {
            const Icon = lane.icon;
            const count = recordsByLane.get(lane.id)?.length ?? 0;
            return (
              <button
                key={lane.id}
                type="button"
                onClick={() => setActiveLane(lane.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  activeLane === lane.id
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : "border-transparent bg-card/60 text-muted-foreground hover:border-border",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {lane.label}
                <span className="tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        <Button variant="outline" size="sm" render={<Link href="/assets" />}>
          Open Asset Studio
          <ExternalLink data-icon="inline-end" className="size-3.5" />
        </Button>
      </div>

      {contentTypes.length > 0 ? (
        <FilterSelect
          label="Type"
          value={contentTypeFilter}
          onChange={setContentTypeFilter}
          options={[
            { value: "all", label: "All types" },
            ...contentTypes.map((type) => ({
              value: type,
              label:
                COMPLIANCE_RECORD_TYPE_LABELS[type] ?? contentTypeLabel(type),
            })),
          ]}
        />
      ) : null}

      {filteredRecords.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="glass-card w-full max-w-2xl rounded-2xl border border-border p-8 text-center">
            <h2 className="font-heading text-lg font-semibold">
              {records.length === 0
                ? "No compliance records yet"
                : "No records in this lane"}
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {records.length === 0
                ? "Records are created when you add assets in Asset Studio."
                : "Try another risk lane or clear the type filter."}
            </p>
            {records.length === 0 ? (
              <Button className="mt-6" render={<Link href="/assets" />}>
                Go to Asset Studio
              </Button>
            ) : null}
          </div>
        </div>
      ) : activeLane === "all" ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {RISK_LANES.map((lane) => {
            const laneRecords = recordsByLane.get(lane.id) ?? [];
            const Icon = lane.icon;
            return (
              <div key={lane.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 px-1">
                  <Icon className="size-3.5 text-muted-foreground" aria-hidden />
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {lane.label}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    ({laneRecords.length})
                  </span>
                </div>
                <div className="glass-card flex min-h-32 flex-col gap-2 rounded-xl border border-border p-2">
                  {laneRecords.length === 0 ? (
                    <p className="p-2 text-xs text-muted-foreground">
                      {lane.description}
                    </p>
                  ) : (
                    laneRecords.slice(0, 4).map((record) => (
                      <ComplianceRecordCard
                        key={record.id}
                        record={record}
                        compact
                        onClick={() => openRecordDetail(record)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <section className="grid gap-3 lg:grid-cols-2">
          {filteredRecords.map((record) => (
            <ComplianceRecordCard
              key={record.id}
              record={record}
              onClick={() => openRecordDetail(record)}
            />
          ))}
        </section>
      )}

      <Dialog
        open={selectedRecord !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeRecordDetail();
          }
        }}
      >
        {selectedRecord ? (
          <DialogContent
            className={cn(
              "max-h-[90vh] overflow-y-auto sm:max-w-4xl",
              MOBILE_DIALOG_CONTENT_CLASS,
            )}
          >
            <DialogHeader>
              <DialogTitle>
                {selectedRecord.asset?.title ??
                  contentTypeLabel(selectedRecord.content_type)}
              </DialogTitle>
              <DialogDescription>
                Compliance record · {contentTypeLabel(selectedRecord.content_type)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <ComplianceReviewBadge
                  status={
                    selectedRecord.review_status as ComplianceReviewStatus
                  }
                  record={selectedRecord}
                />
                {selectedRecord.ai_generated ? (
                  <ComplianceFlagBadge severity="warning">
                    AI-generated
                  </ComplianceFlagBadge>
                ) : null}
                {selectedRecord.required_disclosure ? (
                  <ComplianceFlagBadge severity="info">
                    Disclosure required
                  </ComplianceFlagBadge>
                ) : null}
              </div>

              {selectedRecord.asset ? (
                <section className="space-y-2">
                  <h4 className="text-sm font-medium">Side-by-side preview</h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <p className="mb-2 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                        Asset content
                      </p>
                      <div className="max-h-48 overflow-y-auto text-sm whitespace-pre-wrap">
                        {selectedRecord.asset.content_text?.trim() ||
                          "No content text on asset."}
                      </div>
                    </div>
                    <div className="rounded-lg border border-dashed border-border bg-card/40 p-3">
                      <p className="mb-2 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                        Compliance overlay (stub)
                      </p>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>
                          Paid-for-by disclaimer placement and state-specific
                          requirements will render here in a future release.
                        </p>
                        {selectedRecord.required_disclosure ? (
                          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-800 dark:text-amber-200">
                            Disclosure required for this asset type.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    render={<Link href="/assets" />}
                  >
                    Open in Asset Studio
                  </Button>
                </section>
              ) : null}

              {Array.isArray(selectedRecord.flags_json) &&
              selectedRecord.flags_json.length > 0 ? (
                <section className="space-y-2">
                  <h4 className="text-sm font-medium">Flags</h4>
                  <ul className="space-y-2">
                    {selectedRecord.flags_json.map((flag, index) => (
                      <li
                        key={`${flag.message}-${index}`}
                        className="flex items-start gap-2 rounded-md border p-2 text-sm"
                      >
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                        <div>
                          <ComplianceFlagBadge
                            severity={flag.severity ?? "info"}
                          >
                            {flag.type === "auto" ? "Auto" : "Review"}
                          </ComplianceFlagBadge>
                          <p className="mt-1">{flag.message}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {autoChecksList(selectedRecord).length > 0 ? (
                <section className="space-y-2">
                  <h4 className="text-sm font-medium">Auto-checks</h4>
                  <ul className="space-y-2">
                    {autoChecksList(selectedRecord).map((check) => (
                      <li
                        key={check.id}
                        className="flex items-start gap-3 rounded-md border p-2 text-sm"
                      >
                        <AutoCheckStatusIcon passed={check.passed} />
                        <div>
                          <p className="font-medium">{check.label}</p>
                          {check.detail ? (
                            <p className="text-muted-foreground">{check.detail}</p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {(selectedRecord.reviewed_at || selectedRecord.review_notes) && (
                <section className="space-y-1 rounded-md border bg-muted/20 p-3 text-sm">
                  <p className="font-medium">Previous review</p>
                  {selectedRecord.reviewed_at ? (
                    <p className="text-muted-foreground">
                      Reviewed {formatDate(selectedRecord.reviewed_at)}
                    </p>
                  ) : null}
                  {selectedRecord.review_notes ? (
                    <p className="whitespace-pre-wrap">
                      {selectedRecord.review_notes}
                    </p>
                  ) : null}
                </section>
              )}

              {canReview ? (
                <section className="space-y-2">
                  <Label htmlFor="review-notes">Reviewer notes</Label>
                  <textarea
                    id="review-notes"
                    className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                    value={reviewNotes}
                    onChange={(event) => setReviewNotes(event.target.value)}
                    placeholder="Optional notes for the team (not legal advice)"
                    rows={3}
                    disabled={isPending}
                  />
                </section>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You have read-only access. Contact an owner, admin, manager, or
                  reviewer to submit a compliance review.
                </p>
              )}

              {actionError ? (
                <p className="text-sm text-destructive">{actionError}</p>
              ) : null}
            </div>

            {canReview ? (
              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                <Button
                  variant="outline"
                  onClick={closeRecordDetail}
                  disabled={isPending}
                >
                  Close
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => runReviewAction("flag")}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Flag data-icon="inline-start" className="size-4" />
                    )}
                    Flag for attention
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => runReviewAction("reject")}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <XCircle data-icon="inline-start" className="size-4" />
                    )}
                    Request changes
                  </Button>
                  <Button
                    onClick={() => runReviewAction("approve")}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 data-icon="inline-start" className="size-4" />
                    )}
                    Mark reviewed
                  </Button>
                </div>
              </DialogFooter>
            ) : (
              <DialogFooter>
                <Button variant="outline" onClick={closeRecordDetail}>
                  Close
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function ComplianceRecordCard({
  record,
  compact = false,
  onClick,
}: {
  record: DbComplianceRecordWithAsset;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border border-border bg-card/70 text-left transition-all hover:-translate-y-px hover:shadow-sm",
        compact ? "p-2.5" : "p-4",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className={cn(
              "truncate font-medium",
              compact ? "text-xs" : "text-sm",
            )}
          >
            {record.asset?.title ?? contentTypeLabel(record.content_type)}
          </p>
          <p className="text-[0.65rem] text-muted-foreground">
            {contentTypeLabel(record.content_type)}
          </p>
        </div>
        {!compact ? (
          <ComplianceReviewBadge
            status={record.review_status as ComplianceReviewStatus}
            record={record}
          />
        ) : null}
      </div>
      {!compact ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {complianceRecordSummary(record)}
        </p>
      ) : null}
      <p className="mt-1 text-[0.6rem] text-muted-foreground">
        {formatDate(record.created_at)}
      </p>
    </button>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Card
      className={cn(
        highlight && "border-amber-300 dark:border-amber-800",
      )}
    >
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
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
