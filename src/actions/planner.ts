"use server";

import { revalidatePath } from "next/cache";
import {
  requireCampaignContext,
  type ModuleActionResult,
} from "@/lib/auth/require-campaign-context";
import { generateContentCalendarContent } from "@/lib/ai/generate-content-calendar";
import { generateCampaignTimelineContent } from "@/lib/ai/generate-campaign-timeline";
import { isOpenAiConfigured } from "@/lib/ai/config";
import { listAssets } from "@/lib/db/assets";
import {
  deleteCalendarEvent,
  getCalendarEventById,
  listCalendarEvents,
  updateCalendarEvent,
} from "@/lib/db/calendar-events";
import { campaignDisplayName } from "@/lib/db/schema";
import { persistPlannerEvent } from "@/lib/planner/persist-event";
import { persistContentCalendar } from "@/lib/workflows/persist-content-calendar";
import { persistCampaignTimeline } from "@/lib/workflows/persist-timeline";
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
  channel?: string | null;
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
    const created = await persistPlannerEvent({
      campaign: context.campaign,
      createdBy: context.dbUserId,
      title: input.title,
      description: input.description,
      eventType: input.eventType,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
      relatedAssetId: input.relatedAssetId,
      isMilestone: input.isMilestone,
      channel: input.channel ?? null,
    });

    if (!created.ok) {
      return {
        ok: false,
        error: "Database is not configured. Event was not saved.",
        code: "missing_campaign",
      };
    }

    revalidatePath("/planner");
    revalidatePath("/brain");
    revalidatePath("/dashboard");

    return { ok: true, id: created.eventId };
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

export async function generatePlannerTimeline(input: {
  districtSegments: string;
  issues: string;
}): Promise<
  ModuleActionResult & {
    eventCount?: number;
    taskCount?: number;
    summary?: string;
  }
> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  if (!isOpenAiConfigured()) {
    return {
      ok: false,
      error:
        "OpenAI is not configured. Add OPENAI_API_KEY to generate a campaign timeline.",
    };
  }

  const districtSegments = input.districtSegments.trim();
  const issues = input.issues.trim();
  if (!districtSegments || !issues) {
    return {
      ok: false,
      error: "District/segments and key issues are required.",
      code: "validation",
    };
  }

  try {
    const timeline = await generateCampaignTimelineContent({
      campaign: context.campaign,
      profile: context.profile,
      campaignId: context.campaign.id,
      userId: context.dbUserId,
      districtSegments,
      issues,
    });

    const { eventIds, taskIds } = await persistCampaignTimeline({
      campaign: context.campaign,
      createdBy: context.dbUserId,
      candidateName: campaignDisplayName(context.campaign),
      timeline,
    });

    revalidatePath("/planner");
    revalidatePath("/tasks");
    revalidatePath("/brain");
    revalidatePath("/dashboard");

    return {
      ok: true,
      id: eventIds[0] ?? taskIds[0] ?? context.campaign.id,
      eventCount: eventIds.length,
      taskCount: taskIds.length,
      summary: timeline.summary,
    };
  } catch (error) {
    console.error("[generatePlannerTimeline]", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Campaign timeline generation failed.",
    };
  }
}

export async function generatePlannerContentCalendar(input: {
  period: string;
  channelsAndCadence: string;
}): Promise<
  ModuleActionResult & {
    eventCount?: number;
    summary?: string;
  }
> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  if (!isOpenAiConfigured()) {
    return {
      ok: false,
      error:
        "OpenAI is not configured. Add OPENAI_API_KEY to generate a content calendar.",
    };
  }

  const period = input.period.trim();
  const channelsAndCadence = input.channelsAndCadence.trim();
  if (!period || !channelsAndCadence) {
    return {
      ok: false,
      error: "Period and channels/cadence are required.",
      code: "validation",
    };
  }

  try {
    const calendar = await generateContentCalendarContent({
      campaign: context.campaign,
      profile: context.profile,
      campaignId: context.campaign.id,
      userId: context.dbUserId,
      period,
      channelsAndCadence,
    });

    const { eventIds } = await persistContentCalendar({
      organizationId: context.campaign.organization_id,
      campaign: context.campaign,
      createdBy: context.dbUserId,
      candidateName: campaignDisplayName(context.campaign),
      calendar,
    });

    revalidatePath("/planner");
    revalidatePath("/brain");
    revalidatePath("/dashboard");

    return {
      ok: true,
      id: eventIds[0] ?? context.campaign.id,
      eventCount: eventIds.length,
      summary: calendar.summary,
    };
  } catch (error) {
    console.error("[generatePlannerContentCalendar]", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Content calendar generation failed.",
    };
  }
}
