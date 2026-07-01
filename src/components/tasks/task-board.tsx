"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import {
  Calendar,
  FileText,
  LayoutGrid,
  Lightbulb,
  List,
  Loader2,
  MapPin,
  Pencil,
  PiggyBank,
  Plus,
  ShieldCheck,
  SquareCheckBig,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  deleteCampaignTask,
  updateTaskStatus,
} from "@/actions/tasks";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
} from "@/components/tasks/task-badges";
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
import { SELECT_CLASS } from "@/lib/form/datetime";
import type { DbAsset, DbCalendarEvent, DbTask } from "@/lib/db/schema";
import {
  KANBAN_STATUSES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  taskPrioritySchema,
  taskStatusSchema,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/validators/tasks";
import { cn } from "@/lib/utils";

const TASK_STATUSES = taskStatusSchema.options;
const TASK_PRIORITIES = taskPrioritySchema.options;

type ViewMode = "list" | "kanban";

type WorkflowCategory =
  | "all"
  | "field"
  | "content"
  | "fundraising"
  | "compliance"
  | "research";

const WORKFLOW_TABS: Array<{
  id: WorkflowCategory;
  label: string;
  icon: typeof MapPin;
}> = [
  { id: "all", label: "All", icon: SquareCheckBig },
  { id: "field", label: "Field", icon: MapPin },
  { id: "content", label: "Content", icon: FileText },
  { id: "fundraising", label: "Fundraising", icon: PiggyBank },
  { id: "compliance", label: "Compliance", icon: ShieldCheck },
  { id: "research", label: "Research", icon: Lightbulb },
];

type TaskBoardProps = {
  tasks: DbTask[];
  approvedAssets: DbAsset[];
  events: DbCalendarEvent[];
  initialTaskId?: string | null;
};

function formatDueDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function inferWorkflowCategory(task: DbTask): Exclude<WorkflowCategory, "all"> {
  if (task.related_event_id) return "field";
  if (task.related_asset_id) return "content";
  if (task.related_prospect_id) return "fundraising";
  if (task.related_research_id) return "research";

  const text = `${task.title} ${task.description ?? ""}`.toLowerCase();
  if (/compliance|disclosure|fec|legal|review queue/.test(text)) {
    return "compliance";
  }
  if (/fundraising|donor|call time|pledge|prospect/.test(text)) {
    return "fundraising";
  }
  if (/field|canvass|door|volunteer|gotv|knock/.test(text)) {
    return "field";
  }
  if (/research|brief|opposition|intel/.test(text)) {
    return "research";
  }
  if (/content|asset|post|mailer|graphic|social/.test(text)) {
    return "content";
  }
  return "field";
}

type TaskSourceLink = {
  type: "asset" | "event" | "research" | "prospect";
  label: string;
};

function getTaskSourceLinks(
  task: DbTask,
  assetTitleById: Map<string, string>,
  eventTitleById: Map<string, string>,
): TaskSourceLink[] {
  const links: TaskSourceLink[] = [];
  if (task.related_asset_id) {
    links.push({
      type: "asset",
      label: assetTitleById.get(task.related_asset_id) ?? "Linked asset",
    });
  }
  if (task.related_event_id) {
    links.push({
      type: "event",
      label: eventTitleById.get(task.related_event_id) ?? "Linked event",
    });
  }
  if (task.related_research_id) {
    links.push({ type: "research", label: "Research brief" });
  }
  if (task.related_prospect_id) {
    links.push({ type: "prospect", label: "Fundraising prospect" });
  }
  return links;
}

const SOURCE_ICONS = {
  asset: FileText,
  event: Calendar,
  research: Lightbulb,
  prospect: PiggyBank,
} as const;

const SOURCE_LABELS = {
  asset: "Asset",
  event: "Event",
  research: "Research",
  prospect: "Prospect",
} as const;

function TaskSourceBadges({ links }: { links: TaskSourceLink[] }) {
  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {links.map((link) => {
        const Icon = SOURCE_ICONS[link.type];
        return (
          <span
            key={`${link.type}-${link.label}`}
            className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-card/60 px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground"
          >
            <Icon className="size-3 shrink-0" aria-hidden />
            <span className="text-foreground/80">{SOURCE_LABELS[link.type]}</span>
            <span className="truncate text-muted-foreground">· {link.label}</span>
          </span>
        );
      })}
    </div>
  );
}

export function TaskBoard({
  tasks,
  approvedAssets,
  events,
  initialTaskId = null,
}: TaskBoardProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [workflowFilter, setWorkflowFilter] = useState<WorkflowCategory>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<DbTask | null>(
    () => tasks.find((task) => task.id === initialTaskId) ?? null,
  );
  const [deleteTarget, setDeleteTarget] = useState<DbTask | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">(
    "all",
  );
  const [dueFilter, setDueFilter] = useState<"all" | "overdue" | "week">("all");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const assetTitleById = useMemo(
    () => new Map(approvedAssets.map((a) => [a.id, a.title])),
    [approvedAssets],
  );

  const eventTitleById = useMemo(
    () => new Map(events.map((e) => [e.id, e.title])),
    [events],
  );

  const workflowCounts = useMemo(() => {
    const counts: Record<WorkflowCategory, number> = {
      all: tasks.length,
      field: 0,
      content: 0,
      fundraising: 0,
      compliance: 0,
      research: 0,
    };
    for (const task of tasks) {
      counts[inferWorkflowCategory(task)] += 1;
    }
    return counts;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const weekAhead = new Date(now);
    weekAhead.setDate(weekAhead.getDate() + 7);

    return tasks.filter((task) => {
      if (
        workflowFilter !== "all" &&
        inferWorkflowCategory(task) !== workflowFilter
      ) {
        return false;
      }
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }
      if (dueFilter === "all") return true;
      if (!task.due_date) return false;

      const due = new Date(task.due_date);
      if (Number.isNaN(due.getTime())) return false;

      if (dueFilter === "overdue") {
        return due < now && task.status !== "done";
      }
      if (dueFilter === "week") {
        return due >= now && due <= weekAhead;
      }
      return true;
    });
  }, [tasks, workflowFilter, statusFilter, priorityFilter, dueFilter]);

  const tasksByStatus = useMemo(() => {
    const map = new Map<TaskStatus, DbTask[]>();
    for (const status of KANBAN_STATUSES) {
      map.set(status, []);
    }
    for (const task of filteredTasks) {
      const status = KANBAN_STATUSES.includes(
        task.status as (typeof KANBAN_STATUSES)[number],
      )
        ? (task.status as TaskStatus)
        : "todo";
      const list = map.get(status) ?? [];
      list.push(task);
      map.set(status, list);
    }
    return map;
  }, [filteredTasks]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  function changeStatus(taskId: string, status: TaskStatus) {
    setActionError(null);
    startTransition(async () => {
      const result = await updateTaskStatus(taskId, status);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      refresh();
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    setActionError(null);

    startTransition(async () => {
      const result = await deleteCampaignTask(deleteTarget.id);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setDeleteTarget(null);
      refresh();
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-3 md:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 snap-x snap-mandatory md:flex-wrap md:overflow-visible md:snap-none md:pb-0">
          {WORKFLOW_TABS.map((tab) => {
            const Icon = tab.icon;
            const count =
              tab.id === "all" ? workflowCounts.all : workflowCounts[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setWorkflowFilter(tab.id)}
                className={cn(
                  "inline-flex shrink-0 snap-start items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  workflowFilter === tab.id
                    ? "border-primary/40 bg-primary/5 text-foreground shadow-sm"
                    : "border-transparent bg-card/60 text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {tab.label}
                <span className="tabular-nums text-[0.65rem] opacity-70">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-card/60 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                viewMode === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="size-3.5" aria-hidden />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                viewMode === "kanban"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="size-3.5" aria-hidden />
              Kanban
            </button>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" className="size-3.5" />
            New task
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <select
          className={`${SELECT_CLASS} w-full sm:max-w-[10rem]`}
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as TaskStatus | "all")
          }
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {TASK_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <select
          className={`${SELECT_CLASS} w-full sm:max-w-[10rem]`}
          value={priorityFilter}
          onChange={(e) =>
            setPriorityFilter(e.target.value as TaskPriority | "all")
          }
          aria-label="Filter by priority"
        >
          <option value="all">All priorities</option>
          {TASK_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {TASK_PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>
        <select
          className={`${SELECT_CLASS} w-full sm:max-w-[10rem]`}
          value={dueFilter}
          onChange={(e) =>
            setDueFilter(e.target.value as "all" | "overdue" | "week")
          }
          aria-label="Filter by due date"
        >
          <option value="all">All due dates</option>
          <option value="overdue">Overdue</option>
          <option value="week">Due this week</option>
        </select>
      </div>

      {actionError ? (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      {filteredTasks.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="glass-card w-full max-w-2xl rounded-2xl border border-border p-8 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-border bg-card/70">
              <SquareCheckBig className="size-6 text-muted-foreground" aria-hidden />
            </div>
            <h2 className="font-heading text-lg font-semibold">No tasks yet</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Create tasks for field prep, content reviews, fundraising
              follow-ups, and other campaign work.
            </p>
            <Button className="mt-6" onClick={() => setCreateOpen(true)}>
              <Plus data-icon="inline-start" className="size-3.5" />
              Create your first task
            </Button>
          </div>
        </div>
      ) : viewMode === "list" ? (
        <div className="grid gap-3">
          {filteredTasks.map((task) => {
            const sourceLinks = getTaskSourceLinks(
              task,
              assetTitleById,
              eventTitleById,
            );
            return (
              <Card
                key={task.id}
                className="transition-shadow hover:shadow-[var(--glass-shadow-pop)]"
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base">{task.title}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <TaskStatusBadge status={task.status} />
                      <TaskPriorityBadge priority={task.priority} />
                    </div>
                  </div>
                  <CardDescription>Due {formatDueDate(task.due_date)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {task.description ? (
                    <p className="text-sm text-muted-foreground">
                      {task.description}
                    </p>
                  ) : null}
                  <TaskSourceBadges links={sourceLinks} />
                  <div className="flex flex-wrap gap-2">
                    <select
                      className={`${SELECT_CLASS} max-w-[10rem]`}
                      value={task.status}
                      onChange={(e) =>
                        changeStatus(task.id, e.target.value as TaskStatus)
                      }
                      disabled={isPending}
                      aria-label={`Change status for ${task.title}`}
                    >
                      {TASK_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {TASK_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditTask(task)}
                    >
                      <Pencil data-icon="inline-start" className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteTarget(task)}
                    >
                      <Trash2 data-icon="inline-start" className="size-3.5" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-2 md:overflow-visible md:pb-0 xl:grid-cols-4">
          {KANBAN_STATUSES.map((status) => (
            <div
              key={status}
              className="flex w-[min(85vw,20rem)] shrink-0 snap-start flex-col gap-3 md:w-auto md:shrink"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  {TASK_STATUS_LABELS[status]}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {(tasksByStatus.get(status) ?? []).length}
                </span>
              </div>
              <div className="glass-card flex min-h-32 flex-col gap-2 rounded-xl border border-border p-2">
                {(tasksByStatus.get(status) ?? []).map((task) => {
                  const sourceLinks = getTaskSourceLinks(
                    task,
                    assetTitleById,
                    eventTitleById,
                  );
                  return (
                    <Card key={task.id} className="shadow-sm">
                      <CardHeader className="gap-1 p-3 pb-2">
                        <CardTitle className="text-sm leading-snug">
                          {task.title}
                        </CardTitle>
                        <div className="flex flex-wrap gap-1">
                          <TaskPriorityBadge priority={task.priority} />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 p-3 pt-0">
                        <p className="text-xs text-muted-foreground">
                          Due {formatDueDate(task.due_date)}
                        </p>
                        <TaskSourceBadges links={sourceLinks} />
                        <div className="flex flex-wrap gap-1">
                          {KANBAN_STATUSES.filter((s) => s !== status).map(
                            (nextStatus) => (
                              <Button
                                key={nextStatus}
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                disabled={isPending}
                                onClick={() => changeStatus(task.id, nextStatus)}
                              >
                                → {TASK_STATUS_LABELS[nextStatus]}
                              </Button>
                            ),
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => setEditTask(task)}
                          >
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        approvedAssets={approvedAssets}
        events={events}
        onSuccess={refresh}
      />

      <TaskFormDialog
        open={Boolean(editTask)}
        onOpenChange={(open) => {
          if (!open) setEditTask(null);
        }}
        approvedAssets={approvedAssets}
        events={events}
        task={editTask}
        onSuccess={() => {
          setEditTask(null);
          refresh();
        }}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setActionError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete task?</DialogTitle>
            <DialogDescription>
              This removes &ldquo;{deleteTarget?.title}&rdquo; from your task
              board. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {actionError ? (
            <p className="text-sm text-destructive" role="alert">
              {actionError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2
                    data-icon="inline-start"
                    className="size-4 animate-spin"
                  />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
