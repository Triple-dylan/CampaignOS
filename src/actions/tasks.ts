"use server";

import { revalidatePath } from "next/cache";
import { listTeamMembers, type TeamMemberSummary } from "@/actions/team";
import { recordActivityEvent } from "@/lib/db/activity";
import {
  requireCampaignContext,
  type ModuleActionResult,
} from "@/lib/auth/require-campaign-context";
import { canWriteModule } from "@/lib/auth/permissions";
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
      members: [] as TeamMemberSummary[],
    };
  }

  const [tasks, approvedAssets, events, team] = await Promise.all([
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
    listTeamMembers(),
  ]);

  return {
    ok: true as const,
    tasks,
    approvedAssets,
    events,
    members: team.members,
  };
}

export async function createCampaignTask(input: {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  ownerUserId?: string | null;
  relatedAssetId?: string | null;
  relatedEventId?: string | null;
}): Promise<ModuleActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }
  if (context.role && !canWriteModule(context.role, "tasks")) {
    return {
      ok: false,
      error: "You do not have permission to create tasks.",
      code: "forbidden",
    };
  }

  const parsed = createTaskSchema.safeParse({
    campaignId: context.campaign.id,
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    dueDate: input.dueDate,
    ownerUserId: input.ownerUserId,
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

    await recordActivityEvent({
      organizationId: context.campaign.organization_id,
      campaignId: context.campaign.id,
      actorUserId: context.dbUserId,
      action: "task.created",
      objectType: "task",
      objectId: result.task.id,
      summary: result.task.owner_user_id
        ? `Created task “${result.task.title}” and assigned it`
        : `Created task “${result.task.title}”`,
      metadata: { ownerUserId: result.task.owner_user_id },
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
  ownerUserId?: string | null;
  relatedAssetId?: string | null;
  relatedEventId?: string | null;
}): Promise<ModuleActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }
  if (context.role && !canWriteModule(context.role, "tasks")) {
    return {
      ok: false,
      error: "You do not have permission to update tasks.",
      code: "forbidden",
    };
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
    ownerUserId: input.ownerUserId,
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

    const assigneeChanged =
      input.ownerUserId !== undefined &&
      input.ownerUserId !== existing.owner_user_id;

    await recordActivityEvent({
      organizationId: context.campaign.organization_id,
      campaignId: context.campaign.id,
      actorUserId: context.dbUserId,
      action: assigneeChanged ? "task.assigned" : "task.updated",
      objectType: "task",
      objectId: result.task.id,
      summary: assigneeChanged
        ? `Assigned task “${result.task.title}”`
        : `Updated task “${result.task.title}”`,
      metadata: {
        ownerUserId: result.task.owner_user_id,
        status: result.task.status,
      },
    });

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
  if (context.role && !canWriteModule(context.role, "tasks")) {
    return {
      ok: false,
      error: "You do not have permission to delete tasks.",
      code: "forbidden",
    };
  }

  const existing = await getTaskById(context.campaign.id, taskId);
  if (!existing) {
    return { ok: false, error: "Task not found", code: "not_found" };
  }

  try {
    await deleteTask(context.campaign.id, taskId);
    await recordActivityEvent({
      organizationId: context.campaign.organization_id,
      campaignId: context.campaign.id,
      actorUserId: context.dbUserId,
      action: "task.deleted",
      objectType: "task",
      objectId: taskId,
      summary: `Deleted task “${existing.title}”`,
    });
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    return { ok: true, id: taskId };
  } catch (error) {
    console.error("[deleteCampaignTask]", error);
    return { ok: false, error: "Failed to delete task." };
  }
}
