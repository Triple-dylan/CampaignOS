"use server";

import { revalidatePath } from "next/cache";
import {
  requireCampaignContext,
  type ModuleActionResult,
} from "@/lib/auth/require-campaign-context";
import { listAssets } from "@/lib/db/assets";
import { listCalendarEvents } from "@/lib/db/calendar-events";
import { listGraphNodes } from "@/lib/db/campaigns";
import { linkTaskToCampaignGraph } from "@/lib/db/graph";
import {
  createTask,
  deleteTask,
  getTaskById,
  listTasks,
  updateTask,
} from "@/lib/db/tasks";
import { campaignDisplayName } from "@/lib/db/schema";
import {
  createTaskSchema,
  updateTaskSchema,
  type ListTasksFilter,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/validators/tasks";

export async function getTasksForCampaign(
  filters?: Omit<ListTasksFilter, "campaignId">,
) {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return {
      ok: false as const,
      error: context.error,
      tasks: [],
      approvedAssets: [],
      events: [],
    };
  }

  const [tasks, approvedAssets, events] = await Promise.all([
    listTasks({
      campaignId: context.campaign.id,
      excludeArchived: true,
      ...filters,
    }),
    listAssets({
      campaignId: context.campaign.id,
      status: "approved",
    }),
    listCalendarEvents({ campaignId: context.campaign.id }),
  ]);

  return {
    ok: true as const,
    tasks,
    approvedAssets,
    events,
  };
}

export async function createCampaignTask(input: {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  relatedAssetId?: string | null;
  relatedEventId?: string | null;
}): Promise<ModuleActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const parsed = createTaskSchema.safeParse({
    campaignId: context.campaign.id,
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    dueDate: input.dueDate,
    relatedAssetId: input.relatedAssetId,
    relatedEventId: input.relatedEventId,
    createdBy: context.dbUserId,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid task data",
      code: "validation",
    };
  }

  try {
    const result = await createTask(parsed.data);
    if (!result.task) {
      return {
        ok: false,
        error: "Database is not configured. Task was not saved.",
        code: "missing_campaign",
      };
    }

    const existingNodes = await listGraphNodes(context.campaign.id);
    await linkTaskToCampaignGraph({
      campaignId: context.campaign.id,
      taskId: result.task.id,
      taskTitle: result.task.title,
      status: result.task.status,
      candidateName: campaignDisplayName(context.campaign),
      relatedAssetId: result.task.related_asset_id,
      relatedEventId: result.task.related_event_id,
      existingNodes,
    });

    revalidatePath("/tasks");
    revalidatePath("/dashboard");

    return { ok: true, id: result.task.id };
  } catch (error) {
    console.error("[createCampaignTask]", error);
    return { ok: false, error: "Failed to create task. Please try again." };
  }
}

export async function updateCampaignTask(input: {
  taskId: string;
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  relatedAssetId?: string | null;
  relatedEventId?: string | null;
}): Promise<ModuleActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const existing = await getTaskById(context.campaign.id, input.taskId);
  if (!existing) {
    return { ok: false, error: "Task not found", code: "not_found" };
  }

  const parsed = updateTaskSchema.safeParse({
    id: input.taskId,
    campaignId: context.campaign.id,
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    dueDate: input.dueDate,
    relatedAssetId: input.relatedAssetId,
    relatedEventId: input.relatedEventId,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid task data",
      code: "validation",
    };
  }

  try {
    const result = await updateTask(parsed.data);
    if (!result.task) {
      return { ok: false, error: "Failed to update task." };
    }

    revalidatePath("/tasks");
    revalidatePath("/dashboard");

    return { ok: true, id: result.task.id };
  } catch (error) {
    console.error("[updateCampaignTask]", error);
    return { ok: false, error: "Failed to update task." };
  }
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<ModuleActionResult> {
  return updateCampaignTask({ taskId, status });
}

export async function deleteCampaignTask(
  taskId: string,
): Promise<ModuleActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const existing = await getTaskById(context.campaign.id, taskId);
  if (!existing) {
    return { ok: false, error: "Task not found", code: "not_found" };
  }

  try {
    await deleteTask(context.campaign.id, taskId);
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    return { ok: true, id: taskId };
  } catch (error) {
    console.error("[deleteCampaignTask]", error);
    return { ok: false, error: "Failed to delete task." };
  }
}
