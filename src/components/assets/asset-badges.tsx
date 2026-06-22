import { cn } from "@/lib/utils";
import {
  ASSET_STATUS_LABELS,
  COMPLIANCE_STATUS_LABELS,
  type AssetStatus,
  type ComplianceReviewStatus,
} from "@/lib/validators/assets";

const statusStyles: Record<"draft" | "needs_review" | "approved", string> = {
  draft: "bg-muted text-muted-foreground",
  needs_review: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  approved: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
};

const complianceStyles: Record<
  Exclude<ComplianceReviewStatus, "not_required">,
  string
> = {
  required: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  approved: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  if (status !== "draft" && status !== "needs_review" && status !== "approved") {
    return (
      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">
        {status.replace("_", " ")}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        statusStyles[status],
      )}
    >
      {ASSET_STATUS_LABELS[status]}
    </span>
  );
}

export function ComplianceStatusBadge({
  status,
}: {
  status: ComplianceReviewStatus;
}) {
  if (status === "not_required") {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        complianceStyles[status],
      )}
    >
      {COMPLIANCE_STATUS_LABELS[status]}
    </span>
  );
}
