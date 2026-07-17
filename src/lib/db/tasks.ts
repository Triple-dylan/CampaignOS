import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import type { DbTask } from "@/lib/db/schema";
import {
  createTaskSchema,
  listTasksFilterSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type ListTasksFilter,
  type UpdateTaskInput,
} from "@/lib/validators/tasks";

function mapTask(row: Record<string, unknown>): DbTask {
  return row as DbTask;
}

export async function createTask(input: CreateTaskInput) {
  const parsed = createTaskSchema.parse(input);

  if (!isSupabaseConfigured()) {
    console.info("[tasks] Supabase not configured — skipping task create");
    return { synced: false as const, task: null };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      campaign_id: parsed.campaignId,
      title: parsed.title,
      description: parsed.description ?? null,
      status: parsed.status ?? "todo",
      priority: parsed.priority ?? "medium",
      due_date: parsed.dueDate ?? null,
      owner_user_id: parsed.ownerUserId ?? null,
      related_asset_id: parsed.relatedAssetId ?? null,
      related_event_id: parsed.relatedEventId ?? null,
      related_research_id: parsed.relatedResearchId ?? null,
      related_prospect_id: parsed.relatedProspectId ?? null,
      created_by: parsed.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    task: mapTask(data),
  };
}

export async function updateTask(input: UpdateTaskInput) {
  const parsed = updateTaskSchema.parse(input);

  if (!isSupabaseConfigured()) {
    return { synced: false as const, task: null };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.title !== undefined) updates.title = parsed.title;
  if (parsed.description !== undefined) updates.description = parsed.description;
  if (parsed.status !== undefined) updates.status = parsed.status;
  if (parsed.priority !== undefined) updates.priority = parsed.priority;
  if (parsed.dueDate !== undefined) updates.due_date = parsed.dueDate;
  if (parsed.ownerUserId !== undefined) {
    updates.owner_user_id = parsed.ownerUserId;
  }
  if (parsed.relatedAssetId !== undefined) {
    updates.related_asset_id = parsed.relatedAssetId;
  }
  if (parsed.relatedEventId !== undefined) {
    updates.related_event_id = parsed.relatedEventId;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", parsed.id)
    .eq("campaign_id", parsed.campaignId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    task: mapTask(data),
  };
}

export async function getTaskById(
  campaignId: string,
  taskId: string,
): Promise<DbTask | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapTask(data) : null;
}

export async function listTasks(filter: ListTasksFilter): Promise<DbTask[]> {
  const parsed = listTasksFilterSchema.parse(filter);

  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("campaign_id", parsed.campaignId)
    .order("updated_at", { ascending: false });

  if (parsed.status) {
    query = query.eq("status", parsed.status);
  }
  if (parsed.priority) {
    query = query.eq("priority", parsed.priority);
  }
  if (parsed.dueBefore) {
    query = query.lte("due_date", parsed.dueBefore);
  }
  if (parsed.dueAfter) {
    query = query.gte("due_date", parsed.dueAfter);
  }
  if (parsed.excludeArchived) {
    query = query.neq("status", "archived");
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapTask);
}

export async function countActiveTasks(campaignId: string): Promise<number> {
  if (!isSupabaseConfigured()) {
    return 0;
  }

  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .neq("status", "archived")
    .neq("status", "done");

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function deleteTask(campaignId: string, taskId: string) {
  if (!isSupabaseConfigured()) {
    return { synced: false as const };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("id", taskId);

  if (error) {
    throw error;
  }

  return { synced: true as const };
}
