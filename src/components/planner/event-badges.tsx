import { cn } from "@/lib/utils";
import {
  CALENDAR_EVENT_TYPE_LABELS,
  type CalendarEventType,
} from "@/lib/validators/calendar-events";

const eventTypeStyles: Record<CalendarEventType, string> = {
  content: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  fundraiser:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  speech: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  debate: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  volunteer: "bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200",
  canvassing:
    "bg-lime-100 text-lime-900 dark:bg-lime-950 dark:text-lime-200",
  compliance: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  internal: "bg-muted text-muted-foreground",
  public_event:
    "bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200",
};

export function EventTypeBadge({ eventType }: { eventType: string }) {
  const label =
    eventType in CALENDAR_EVENT_TYPE_LABELS
      ? CALENDAR_EVENT_TYPE_LABELS[eventType as CalendarEventType]
      : eventType.replace(/_/g, " ");

  const style =
    eventType in eventTypeStyles
      ? eventTypeStyles[eventType as CalendarEventType]
      : "bg-muted text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        style,
      )}
    >
      {label}
    </span>
  );
}

export function MilestoneBadge() {
  return (
    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
      Milestone
    </span>
  );
}
