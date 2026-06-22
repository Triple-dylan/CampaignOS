"use server";

import { revalidatePath } from "next/cache";
import {
  requireCampaignContext,
  type ModuleActionResult,
} from "@/lib/auth/require-campaign-context";
import { listAssets } from "@/lib/db/assets";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEventById,
  listCalendarEvents,
  updateCalendarEvent,
} from "@/lib/db/calendar-events";
import { listGraphNodes } from "@/lib/db/campaigns";
import { linkEventToCampaignGraph } from "@/lib/db/graph";
import { campaignDisplayName } from "@/lib/db/schema";
import {
  createCalendarEventSchema,
  listCalendarEventsFilterSchema,
  updateCalendarEventSchema,
  type CalendarEventType,
  type ListCalendarEventsFilter,
} from "@/lib/validators/calendar-events";

export async function getPlannerData(
  filters?: Omit<ListCalendarEventsFilter, "campaignId">,
) {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return {
      ok: false as const,
      error: context.error,
      events: [],
      approvedAssets: [],
    };
  }

  const [events, approvedAssets] = await Promise.all([
    listCalendarEvents({
      campaignId: context.campaign.id,
      ...filters,
    }),
    listAssets({
      campaignId: context.campaign.id,
      status: "approved",
    }),
  ]);

  return {
    ok: true as const,
    events,
    approvedAssets,
  };
}

export async function createPlannerEvent(input: {
  title: string;
  description?: string;
  eventType: CalendarEventType;
  startTime: string;
  endTime?: string;
  location?: string;
  relatedAssetId?: string | null;
  isMilestone?: boolean;
}): Promise<ModuleActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const parsed = createCalendarEventSchema.safeParse({
    campaignId: context.campaign.id,
    title: input.title,
    description: input.description,
    eventType: input.eventType,
    startTime: input.startTime,
    endTime: input.endTime,
    location: input.location,
    relatedAssetId: input.relatedAssetId,
    isMilestone: input.isMilestone,
    createdBy: context.dbUserId,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid event data",
      code: "validation",
    };
  }

  try {
    const result = await createCalendarEvent(parsed.data);
    if (!result.event) {
      return {
        ok: false,
        error: "Database is not configured. Event was not saved.",
        code: "missing_campaign",
      };
    }

    const existingNodes = await listGraphNodes(context.campaign.id);
    await linkEventToCampaignGraph({
      campaignId: context.campaign.id,
      eventId: result.event.id,
      eventTitle: result.event.title,
      eventType: result.event.event_type,
      candidateName: campaignDisplayName(context.campaign),
      relatedAssetId: result.event.related_asset_id,
      existingNodes,
    });

    revalidatePath("/planner");
    revalidatePath("/dashboard");

    return { ok: true, id: result.event.id };
  } catch (error) {
    console.error("[createPlannerEvent]", error);
    return { ok: false, error: "Failed to create event. Please try again." };
  }
}

export async function updatePlannerEvent(input: {
  eventId: string;
  title?: string;
  description?: string | null;
  eventType?: CalendarEventType;
  startTime?: string;
  endTime?: string | null;
  location?: string | null;
  relatedAssetId?: string | null;
  isMilestone?: boolean;
}): Promise<ModuleActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const existing = await getCalendarEventById(
    context.campaign.id,
    input.eventId,
  );
  if (!existing) {
    return { ok: false, error: "Event not found", code: "not_found" };
  }

  const parsed = updateCalendarEventSchema.safeParse({
    id: input.eventId,
    campaignId: context.campaign.id,
    title: input.title,
    description: input.description,
    eventType: input.eventType,
    startTime: input.startTime,
    endTime: input.endTime,
    location: input.location,
    relatedAssetId: input.relatedAssetId,
    isMilestone: input.isMilestone,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid event data",
      code: "validation",
    };
  }

  try {
    const result = await updateCalendarEvent(parsed.data);
    if (!result.event) {
      return { ok: false, error: "Failed to update event." };
    }

    revalidatePath("/planner");
    revalidatePath("/dashboard");

    return { ok: true, id: result.event.id };
  } catch (error) {
    console.error("[updatePlannerEvent]", error);
    return { ok: false, error: "Failed to update event." };
  }
}

export async function deletePlannerEvent(
  eventId: string,
): Promise<ModuleActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const existing = await getCalendarEventById(
    context.campaign.id,
    eventId,
  );
  if (!existing) {
    return { ok: false, error: "Event not found", code: "not_found" };
  }

  try {
    await deleteCalendarEvent(context.campaign.id, eventId);
    revalidatePath("/planner");
    revalidatePath("/dashboard");
    return { ok: true, id: eventId };
  } catch (error) {
    console.error("[deletePlannerEvent]", error);
    return { ok: false, error: "Failed to delete event." };
  }
}

export async function listPlannerEventsForRange(
  startAfter?: string,
  startBefore?: string,
) {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false as const, error: context.error, events: [] };
  }

  const filter = listCalendarEventsFilterSchema.parse({
    campaignId: context.campaign.id,
    startAfter,
    startBefore,
  });

  const events = await listCalendarEvents(filter);
  return { ok: true as const, events };
}
