"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import {
  LayoutGrid,
  List,
  Loader2,
  Pencil,
  Plus,
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

const TASK_STATUSES = taskStatusSchema.options;
const TASK_PRIORITIES = taskPrioritySchema.options;

type ViewMode = "list" | "kanban";

type TaskBoardProps = {
  tasks: DbTask[];
  approvedAssets: DbAsset[];
  events: DbCalendarEvent[];
  /** Deep-link from graph — opens the matching task editor. */
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

export function TaskBoard({
  tasks,
  approvedAssets,
  events,
  initialTaskId = null,
}: TaskBoardProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
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

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const weekAhead = new Date(now);
    weekAhead.setDate(weekAhead.getDate() + 7);

    return tasks.filter((task) => {
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
  }, [tasks, statusFilter, priorityFilter, dueFilter]);

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

  function renderTaskLinks(task: DbTask) {
    const links: string[] = [];
    if (task.related_asset_id) {
      links.push(
        `Asset: ${assetTitleById.get(task.related_asset_id) ?? "Linked"}`,
      );
    }
    if (task.related_event_id) {
      links.push(
        `Event: ${eventTitleById.get(task.related_event_id) ?? "Linked"}`,
      );
    }
    if (links.length === 0) return null;
    return (
      <p className="text-xs text-muted-foreground">{links.join(" · ")}</p>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={viewMode === "list" ? "default" : "outline"}
            onClick={() => setViewMode("list")}
          >
            <List data-icon="inline-start" className="size-3.5" />
            List
          </Button>
          <Button
            size="sm"
            variant={viewMode === "kanban" ? "default" : "outline"}
            onClick={() => setViewMode("kanban")}
          >
            <LayoutGrid data-icon="inline-start" className="size-3.5" />
            Kanban
          </Button>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus data-icon="inline-start" className="size-3.5" />
          New task
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          className={`${SELECT_CLASS} max-w-[10rem]`}
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
          className={`${SELECT_CLASS} max-w-[10rem]`}
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
          className={`${SELECT_CLASS} max-w-[10rem]`}
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
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <SquareCheckBig className="size-4 text-muted-foreground" />
              <CardTitle>No tasks yet</CardTitle>
            </div>
            <CardDescription>
              Create tasks for field prep, content reviews, fundraising follow-ups,
              and other campaign work.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus data-icon="inline-start" className="size-3.5" />
              Create your first task
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        <div className="grid gap-3">
          {filteredTasks.map((task) => (
            <Card key={task.id}>
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
                {renderTaskLinks(task)}
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
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {KANBAN_STATUSES.map((status) => (
            <div key={status} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  {TASK_STATUS_LABELS[status]}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {(tasksByStatus.get(status) ?? []).length}
                </span>
              </div>
              <div className="flex min-h-32 flex-col gap-2 rounded-lg border bg-muted/20 p-2">
                {(tasksByStatus.get(status) ?? []).map((task) => (
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
                      {renderTaskLinks(task)}
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
                ))}
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
