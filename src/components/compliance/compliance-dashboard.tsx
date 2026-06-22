"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Flag,
  Loader2,
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
import { Label } from "@/components/ui/label";
import {
  autoChecksList,
  recordHasAttentionFlag,
} from "@/lib/db/compliance";
import type { DbComplianceRecordWithAsset } from "@/lib/db/schema";
import {
  type ComplianceReviewStatus,
} from "@/lib/validators/assets";
import {
  COMPLIANCE_FILTER_BUCKET_LABELS,
  COMPLIANCE_RECORD_TYPE_LABELS,
  contentTypeLabel,
  type ComplianceFilterBucket,
} from "@/lib/validators/compliance";
import type { ComplianceRecordCounts } from "@/lib/db/compliance";

type ComplianceDashboardProps = {
  records: DbComplianceRecordWithAsset[];
  counts: ComplianceRecordCounts;
  canReview: boolean;
  campaignState: string;
};

type RecordFilters = {
  status: ComplianceFilterBucket;
  contentType: string;
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
    hour: "numeric",
    minute: "2-digit",
  });
}

function matchesStatusBucket(
  record: DbComplianceRecordWithAsset,
  bucket: ComplianceFilterBucket,
): boolean {
  if (bucket === "all") {
    return true;
  }
  if (bucket === "pending") {
    return (
      record.review_status === "pending" ||
      record.review_status === "required"
    );
  }
  if (bucket === "reviewed") {
    return record.review_status === "approved";
  }
  if (bucket === "rejected") {
    return record.review_status === "rejected";
  }
  if (bucket === "flagged") {
    return (
      recordHasAttentionFlag(record) &&
      record.review_status !== "approved" &&
      record.review_status !== "rejected"
    );
  }
  return true;
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
  const [filters, setFilters] = useState<RecordFilters>({
    status: "all",
    contentType: "all",
    dateRange: "all",
  });

  const contentTypes = useMemo(
    () => contentTypesFromRecords(records),
    [records],
  );

  const filteredRecords = useMemo(() => {
    const cutoffDate =
      filters.dateRange === "all"
        ? null
        : (() => {
            const date = new Date();
            date.setDate(date.getDate() - (filters.dateRange === "7d" ? 7 : 30));
            return date;
          })();

    return records.filter((record) => {
      if (!matchesStatusBucket(record, filters.status)) {
        return false;
      }
      if (
        filters.contentType !== "all" &&
        record.content_type !== filters.contentType
      ) {
        return false;
      }
      if (cutoffDate !== null) {
        const created = new Date(record.created_at);
        if (Number.isNaN(created.getTime()) || created < cutoffDate) {
          return false;
        }
      }
      return true;
    });
  }, [records, filters]);

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
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30">
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
            <div>
              <CardTitle className="text-base">
                Workflow & recordkeeping only — not legal advice
              </CardTitle>
              <CardDescription className="mt-1 text-amber-900/80 dark:text-amber-200/80">
                CampaignOS helps your team track content review and compliance
                metadata. It does not provide legal advice or guidance on election
                law, filing requirements, or regulatory compliance. Consult
                qualified counsel for legal decisions. This workspace is configured
                for {campaignState} campaigns — verify state and local requirements
                independently.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending review"
          value={counts.pendingReview}
          highlight={counts.pendingReview > 0}
        />
        <StatCard label="Flagged" value={counts.flagged} />
        <StatCard label="Reviewed" value={counts.reviewed} />
        <StatCard label="Changes requested" value={counts.rejected} />
      </section>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {records.length} compliance record{records.length === 1 ? "" : "s"} for
          this campaign
        </p>
        <Button variant="outline" size="sm" render={<Link href="/assets" />}>
          Open Asset Studio
          <ExternalLink data-icon="inline-end" className="size-3.5" />
        </Button>
      </div>

      <section className="flex flex-wrap gap-3">
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(value) =>
            setFilters((current) => ({
              ...current,
              status: value as ComplianceFilterBucket,
            }))
          }
          options={Object.entries(COMPLIANCE_FILTER_BUCKET_LABELS).map(
            ([value, label]) => ({ value, label }),
          )}
        />
        <FilterSelect
          label="Type"
          value={filters.contentType}
          onChange={(value) =>
            setFilters((current) => ({ ...current, contentType: value }))
          }
          options={[
            { value: "all", label: "All types" },
            ...contentTypes.map((type) => ({
              value: type,
              label:
                COMPLIANCE_RECORD_TYPE_LABELS[type] ??
                contentTypeLabel(type),
            })),
          ]}
        />
        <FilterSelect
          label="Date"
          value={filters.dateRange}
          onChange={(value) =>
            setFilters((current) => ({
              ...current,
              dateRange: value as RecordFilters["dateRange"],
            }))
          }
          options={[
            { value: "all", label: "All time" },
            { value: "7d", label: "Last 7 days" },
            { value: "30d", label: "Last 30 days" },
          ]}
        />
      </section>

      {filteredRecords.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No compliance records yet</CardTitle>
            <CardDescription>
              Records are created automatically when you add assets in Asset
              Studio. Create a social post, flyer, or email to populate this
              review queue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/assets" />}>Go to Asset Studio</Button>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {filteredRecords.map((record) => (
            <Card
              key={record.id}
              className="cursor-pointer transition-colors hover:bg-muted/30"
              onClick={() => openRecordDetail(record)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="truncate text-base">
                      {record.asset?.title ??
                        contentTypeLabel(record.content_type)}
                    </CardTitle>
                    <CardDescription>
                      {contentTypeLabel(record.content_type)}
                      {record.distribution_channel
                        ? ` · ${record.distribution_channel}`
                        : ""}
                    </CardDescription>
                  </div>
                  <ComplianceReviewBadge
                    status={
                      record.review_status as ComplianceReviewStatus
                    }
                    record={record}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  {complianceRecordSummary(record)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Created {formatDate(record.created_at)}
                  {record.ai_generated ? " · AI-generated" : ""}
                </p>
              </CardContent>
            </Card>
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
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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
                  <h4 className="text-sm font-medium">Linked asset preview</h4>
                  <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                    {selectedRecord.asset.content_text?.trim() ||
                      "No content text on asset."}
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
    <Card className={highlight ? "border-amber-300 dark:border-amber-800" : undefined}>
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
