import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  COMPLIANCE_STATUS_LABELS,
  type ComplianceReviewStatus,
} from "@/lib/validators/assets";
import {
  autoChecksList,
  recordHasAttentionFlag,
} from "@/lib/db/compliance";
import type { DbComplianceRecord } from "@/lib/db/schema";

const complianceStyles: Record<
  Exclude<ComplianceReviewStatus, "not_required">,
  string
> = {
  required: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  approved: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

export function ComplianceReviewBadge({
  status,
  record,
}: {
  status: ComplianceReviewStatus;
  record?: DbComplianceRecord;
}) {
  if (status === "not_required") {
    return null;
  }

  const hasAttention = record ? recordHasAttentionFlag(record) : false;
  const label =
    hasAttention && status !== "rejected" && status !== "approved"
      ? "Flagged"
      : status === "rejected"
        ? "Changes requested"
        : COMPLIANCE_STATUS_LABELS[status];

  const style =
    hasAttention && status !== "rejected" && status !== "approved"
      ? "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200"
      : complianceStyles[status];

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        style,
      )}
    >
      {label}
    </span>
  );
}

export function ComplianceFlagBadge({
  severity = "info",
  children,
}: {
  severity?: "info" | "warning" | "error";
  children: ReactNode;
}) {
  const styles = {
    info: "bg-muted text-muted-foreground",
    warning:
      "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    error: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-1 text-xs font-medium",
        styles[severity],
      )}
    >
      {children}
    </span>
  );
}

export function AutoCheckStatusIcon({ passed }: { passed: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex size-5 items-center justify-center rounded-full text-xs font-bold",
        passed
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
      )}
      aria-label={passed ? "Check passed" : "Check needs review"}
    >
      {passed ? "✓" : "!"}
    </span>
  );
}

export function complianceRecordSummary(record: DbComplianceRecord): string {
  const checks = autoChecksList(record);
  const failedChecks = checks.filter((check) => !check.passed).length;
  const flagCount = Array.isArray(record.flags_json) ? record.flags_json.length : 0;

  if (failedChecks > 0) {
    return `${failedChecks} auto-check${failedChecks === 1 ? "" : "s"} need review`;
  }
  if (flagCount > 0) {
    return `${flagCount} flag${flagCount === 1 ? "" : "s"} on record`;
  }
  return "Ready for review";
}
