import { z } from "zod";

export const taskStatusSchema = z.enum([
  "todo",
  "in_progress",
  "blocked",
  "needs_review",
  "done",
  "archived",
]);

export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const taskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

export type TaskPriority = z.infer<typeof taskPrioritySchema>;

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  needs_review: "Needs review",
  done: "Done",
  archived: "Archived",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

/** Kanban columns for the task board UI. */
export const KANBAN_STATUSES = [
  "todo",
  "in_progress",
  "blocked",
  "done",
] as const satisfies readonly TaskStatus[];

export const createTaskSchema = z.object({
  campaignId: z.uuid(),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: z.string().nullable().optional(),
  ownerUserId: z.uuid().nullable().optional(),
  relatedAssetId: z.uuid().nullable().optional(),
  relatedEventId: z.uuid().nullable().optional(),
  relatedResearchId: z.uuid().nullable().optional(),
  relatedProspectId: z.uuid().nullable().optional(),
  createdBy: z.uuid().nullable().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  id: z.uuid(),
  campaignId: z.uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: z.string().nullable().optional(),
  ownerUserId: z.uuid().nullable().optional(),
  relatedAssetId: z.uuid().nullable().optional(),
  relatedEventId: z.uuid().nullable().optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const listTasksFilterSchema = z.object({
  campaignId: z.uuid(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueBefore: z.string().optional(),
  dueAfter: z.string().optional(),
  excludeArchived: z.boolean().optional(),
});

export type ListTasksFilter = z.infer<typeof listTasksFilterSchema>;
