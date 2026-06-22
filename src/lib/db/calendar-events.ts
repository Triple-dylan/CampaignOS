import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import type { DbCalendarEvent } from "@/lib/db/schema";
import {
  createCalendarEventSchema,
  listCalendarEventsFilterSchema,
  updateCalendarEventSchema,
  type CreateCalendarEventInput,
  type ListCalendarEventsFilter,
  type UpdateCalendarEventInput,
} from "@/lib/validators/calendar-events";

function mapCalendarEvent(row: Record<string, unknown>): DbCalendarEvent {
  return {
    ...(row as DbCalendarEvent),
    is_milestone: Boolean(row.is_milestone),
  };
}

export async function createCalendarEvent(input: CreateCalendarEventInput) {
  const parsed = createCalendarEventSchema.parse(input);

  if (!isSupabaseConfigured()) {
    console.info(
      "[calendar-events] Supabase not configured — skipping event create",
    );
    return { synced: false as const, event: null };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      campaign_id: parsed.campaignId,
      title: parsed.title,
      description: parsed.description ?? null,
      event_type: parsed.eventType,
      start_time: parsed.startTime,
      end_time: parsed.endTime ?? null,
      location: parsed.location ?? null,
      related_asset_id: parsed.relatedAssetId ?? null,
      is_milestone: parsed.isMilestone ?? false,
      created_by: parsed.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    event: mapCalendarEvent(data),
  };
}

export async function updateCalendarEvent(input: UpdateCalendarEventInput) {
  const parsed = updateCalendarEventSchema.parse(input);

  if (!isSupabaseConfigured()) {
    return { synced: false as const, event: null };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.title !== undefined) updates.title = parsed.title;
  if (parsed.description !== undefined) updates.description = parsed.description;
  if (parsed.eventType !== undefined) updates.event_type = parsed.eventType;
  if (parsed.startTime !== undefined) updates.start_time = parsed.startTime;
  if (parsed.endTime !== undefined) updates.end_time = parsed.endTime;
  if (parsed.location !== undefined) updates.location = parsed.location;
  if (parsed.relatedAssetId !== undefined) {
    updates.related_asset_id = parsed.relatedAssetId;
  }
  if (parsed.isMilestone !== undefined) updates.is_milestone = parsed.isMilestone;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("calendar_events")
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
    event: mapCalendarEvent(data),
  };
}

export async function getCalendarEventById(
  campaignId: string,
  eventId: string,
): Promise<DbCalendarEvent | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapCalendarEvent(data) : null;
}

export async function listCalendarEvents(
  filter: ListCalendarEventsFilter,
): Promise<DbCalendarEvent[]> {
  const parsed = listCalendarEventsFilterSchema.parse(filter);

  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("calendar_events")
    .select("*")
    .eq("campaign_id", parsed.campaignId)
    .order("start_time", { ascending: true });

  if (parsed.startAfter) {
    query = query.gte("start_time", parsed.startAfter);
  }
  if (parsed.startBefore) {
    query = query.lte("start_time", parsed.startBefore);
  }
  if (parsed.eventType) {
    query = query.eq("event_type", parsed.eventType);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapCalendarEvent);
}

export async function countUpcomingCalendarEvents(
  campaignId: string,
  daysAhead = 7,
): Promise<number> {
  if (!isSupabaseConfigured()) {
    return 0;
  }

  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + daysAhead);

  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("calendar_events")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .gte("start_time", now.toISOString())
    .lte("start_time", end.toISOString());

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function deleteCalendarEvent(
  campaignId: string,
  eventId: string,
) {
  if (!isSupabaseConfigured()) {
    return { synced: false as const };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("id", eventId);

  if (error) {
    throw error;
  }

  return { synced: true as const };
}
