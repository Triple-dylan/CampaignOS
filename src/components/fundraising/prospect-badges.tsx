import type { ProspectStatus, ProspectType } from "@/lib/validators/fundraising";
import {
  CAPACITY_TIER_LABELS,
  PROSPECT_STATUS_LABELS,
  PROSPECT_TYPE_LABELS,
  getCapacityTier,
} from "@/lib/validators/fundraising";

export function ProspectTypeBadge({ type }: { type: ProspectType | string }) {
  const label =
    type in PROSPECT_TYPE_LABELS
      ? PROSPECT_TYPE_LABELS[type as ProspectType]
      : String(type).replace(/_/g, " ");

  return (
    <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
      {label}
    </span>
  );
}

const STATUS_TONES: Record<ProspectStatus, string> = {
  research: "bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-200",
  not_contacted:
    "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-200",
  contacted: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  follow_up: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  pledged:
    "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  donated:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  declined: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
  archived: "bg-muted text-muted-foreground",
};

export function ProspectStatusBadge({
  status,
}: {
  status: ProspectStatus | string;
}) {
  const label =
    status in PROSPECT_STATUS_LABELS
      ? PROSPECT_STATUS_LABELS[status as ProspectStatus]
      : status;

  const tone =
    status in STATUS_TONES
      ? STATUS_TONES[status as ProspectStatus]
      : STATUS_TONES.research;

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}
    >
      {label}
    </span>
  );
}

export function CapacityTierBadge({
  amount,
}: {
  amount: number | null | undefined;
}) {
  const tier = getCapacityTier(amount);
  const label = CAPACITY_TIER_LABELS[tier];

  return (
    <span className="inline-flex rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-900 dark:bg-teal-950 dark:text-teal-200">
      {label}
    </span>
  );
}
