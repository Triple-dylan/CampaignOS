import { cn } from "@/lib/utils";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/validators/tasks";

const statusStyles: Record<TaskStatus, string> = {
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  blocked: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  needs_review:
    "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  done: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  archived: "bg-muted text-muted-foreground",
};

const priorityStyles: Record<TaskPriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  high: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  urgent: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

export function TaskStatusBadge({ status }: { status: string }) {
  const label =
    status in TASK_STATUS_LABELS
      ? TASK_STATUS_LABELS[status as TaskStatus]
      : status.replace(/_/g, " ");

  const style =
    status in statusStyles
      ? statusStyles[status as TaskStatus]
      : "bg-muted text-muted-foreground";

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

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const label =
    priority in TASK_PRIORITY_LABELS
      ? TASK_PRIORITY_LABELS[priority as TaskPriority]
      : priority;

  const style =
    priority in priorityStyles
      ? priorityStyles[priority as TaskPriority]
      : "bg-muted text-muted-foreground";

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
