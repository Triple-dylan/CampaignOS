import type { ResearchBriefStatus, ResearchType } from "@/lib/validators/research-briefs";
import {
  RESEARCH_BRIEF_STATUS_LABELS,
  RESEARCH_TYPE_LABELS,
} from "@/lib/validators/research-briefs";

export function ResearchTypeBadge({ type }: { type: ResearchType | string }) {
  const label =
    type in RESEARCH_TYPE_LABELS
      ? RESEARCH_TYPE_LABELS[type as ResearchType]
      : String(type).replace(/_/g, " ");

  return (
    <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900 dark:bg-sky-950 dark:text-sky-200">
      {label}
    </span>
  );
}

export function ResearchBriefStatusBadge({
  status,
}: {
  status: ResearchBriefStatus | string;
}) {
  const label =
    status in RESEARCH_BRIEF_STATUS_LABELS
      ? RESEARCH_BRIEF_STATUS_LABELS[status as ResearchBriefStatus]
      : status;

  const tone =
    status === "complete"
      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
      : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}
    >
      {label}
    </span>
  );
}
