"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { createCampaignTask, updateCampaignTask } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fromDateInputValue,
  SELECT_CLASS,
  TEXTAREA_CLASS,
  toDateInputValue,
} from "@/lib/form/datetime";
import type { DbAsset, DbCalendarEvent, DbTask } from "@/lib/db/schema";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  taskPrioritySchema,
  taskStatusSchema,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/validators/tasks";

const TASK_STATUSES = taskStatusSchema.options;
const TASK_PRIORITIES = taskPrioritySchema.options;

type TaskFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approvedAssets: DbAsset[];
  events: DbCalendarEvent[];
  task?: DbTask | null;
  onSuccess?: () => void;
};

type TaskFormContentProps = {
  approvedAssets: DbAsset[];
  events: DbCalendarEvent[];
  task?: DbTask | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

function TaskFormContent({
  approvedAssets,
  events,
  task,
  onOpenChange,
  onSuccess,
}: TaskFormContentProps) {
  const isEdit = Boolean(task);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(
    (task?.status as TaskStatus) ?? "todo",
  );
  const [priority, setPriority] = useState<TaskPriority>(
    (task?.priority as TaskPriority) ?? "medium",
  );
  const [dueDate, setDueDate] = useState(toDateInputValue(task?.due_date));
  const [relatedAssetId, setRelatedAssetId] = useState(
    task?.related_asset_id ?? "",
  );
  const [relatedEventId, setRelatedEventId] = useState(
    task?.related_event_id ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);

    const dueIso = fromDateInputValue(dueDate);

    startTransition(async () => {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        dueDate: dueIso,
        relatedAssetId: relatedAssetId || null,
        relatedEventId: relatedEventId || null,
      };

      const result = isEdit && task
        ? await updateCampaignTask({
            taskId: task.id,
            ...payload,
            description: description.trim() || null,
          })
        : await createCampaignTask(payload);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      onSuccess?.();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit task" : "Create task"}</DialogTitle>
        <DialogDescription>
          Track campaign work items. Link approved assets or calendar events
          when relevant.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="task-title">Title</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Draft canvass walk script"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="task-status">Status</Label>
            <select
              id="task-status"
              className={SELECT_CLASS}
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
            >
              {TASK_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {TASK_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-priority">Priority</Label>
            <select
              id="task-priority"
              className={SELECT_CLASS}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              {TASK_PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {TASK_PRIORITY_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-due">Due date (optional)</Label>
          <Input
            id="task-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-description">Description (optional)</Label>
          <textarea
            id="task-description"
            className={TEXTAREA_CLASS}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Acceptance criteria, owners, or blockers…"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="task-asset">Related asset (optional)</Label>
            <select
              id="task-asset"
              className={SELECT_CLASS}
              value={relatedAssetId}
              onChange={(e) => setRelatedAssetId(e.target.value)}
            >
              <option value="">None</option>
              {approvedAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-event">Related event (optional)</Label>
            <select
              id="task-event"
              className={SELECT_CLASS}
              value={relatedEventId}
              onChange={(e) => setRelatedEventId(e.target.value)}
            >
              <option value="">None</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !title.trim()}>
            {isPending ? (
              <>
                <Loader2
                  data-icon="inline-start"
                  className="size-4 animate-spin"
                />
                Saving…
              </>
            ) : isEdit ? (
              "Save changes"
            ) : (
              "Create task"
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function TaskFormDialog({
  open,
  onOpenChange,
  approvedAssets,
  events,
  task,
  onSuccess,
}: TaskFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open ? (
          <TaskFormContent
            key={task?.id ?? "create"}
            approvedAssets={approvedAssets}
            events={events}
            task={task}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
