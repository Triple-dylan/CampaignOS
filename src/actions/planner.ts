"use server";

import { revalidatePath } from "next/cache";
import { generateCampaignTimelineContent } from "@/lib/ai/generate-campaign-timeline";
import { isOpenAiConfigured } from "@/lib/ai/config";
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
  campaignTimelineEventSchema,
  campaignTimelineTaskSchema,
  type CampaignTimelineOutput,
} from "@/lib/ai/schemas/campaign-timeline";
import {
  buildCampaignTimelineIssuesInput,
  persistCampaignTimelineItems,
} from "@/lib/workflows/persist-campaign-timeline";
import {
  createCalendarEventSchema,
  listCalendarEventsFilterSchema,
  updateCalendarEventSchema,
  type CalendarEventType,
  type ListCalendarEventsFilter,
} from "@/lib/validators/calendar-events";
import { z } from "zod";

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
    openAiConfigured: isOpenAiConfigured(),
    defaults: {
      districtSegments: [
        context.campaign.jurisdiction,
        context.campaign.office_sought,
      ]
        .filter(Boolean)
        .join(" — "),
      issues: context.profile?.top_issues?.join(", ") ?? "",
      electionDate: context.campaign.election_date,
    },
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

const previewCampaignTimelineSchema = z.object({
  districtSegments: z.string().trim().min(8, "District and segments are required"),
  issues: z.string().trim().min(5, "Key issues are required"),
  dateRangeStart: z.string().trim().optional(),
  dateRangeEnd: z.string().trim().optional(),
});

export type PreviewCampaignTimelineResult =
  | { ok: true; timeline: CampaignTimelineOutput }
  | {
      ok: false;
      error: string;
      code?: "missing_openai" | "missing_campaign" | "validation" | "generation_failed";
    };

export async function previewCampaignTimeline(
  input: z.infer<typeof previewCampaignTimelineSchema>,
): Promise<PreviewCampaignTimelineResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: "missing_campaign" };
  }

  if (!isOpenAiConfigured()) {
    return {
      ok: false,
      error:
        "OpenAI is not configured. Add OPENAI_API_KEY to generate a campaign timeline.",
      code: "missing_openai",
    };
  }

  const parsed = previewCampaignTimelineSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid timeline input",
      code: "validation",
    };
  }

  try {
    const timeline = await generateCampaignTimelineContent({
      campaign: context.campaign,
      profile: context.profile,
      campaignId: context.campaign.id,
      userId: context.dbUserId,
      districtSegments: parsed.data.districtSegments,
      issues: buildCampaignTimelineIssuesInput(parsed.data),
    });

    return { ok: true, timeline };
  } catch (error) {
    console.error("[previewCampaignTimeline]", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Campaign timeline generation failed.",
      code: "generation_failed",
    };
  }
}

const saveCampaignTimelineSchema = z.object({
  events: z.array(campaignTimelineEventSchema).max(12),
  tasks: z.array(campaignTimelineTaskSchema).max(15),
});

export type SaveCampaignTimelineResult =
  | {
      ok: true;
      eventCount: number;
      taskCount: number;
      eventIds: string[];
      taskIds: string[];
    }
  | {
      ok: false;
      error: string;
      code?: "missing_campaign" | "validation" | "generation_failed";
    };

export async function saveCampaignTimelineSelection(
  input: z.infer<typeof saveCampaignTimelineSchema>,
): Promise<SaveCampaignTimelineResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: "missing_campaign" };
  }

  const parsed = saveCampaignTimelineSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid timeline selection",
      code: "validation",
    };
  }

  if (parsed.data.events.length === 0 && parsed.data.tasks.length === 0) {
    return {
      ok: false,
      error: "Select at least one event or task to save.",
      code: "validation",
    };
  }

  try {
    const { eventIds, taskIds } = await persistCampaignTimelineItems(parsed.data);

    revalidatePath("/planner");
    revalidatePath("/tasks");
    revalidatePath("/dashboard");

    return {
      ok: true,
      eventCount: eventIds.length,
      taskCount: taskIds.length,
      eventIds,
      taskIds,
    };
  } catch (error) {
    console.error("[saveCampaignTimelineSelection]", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to save campaign timeline.",
      code: "generation_failed",
    };
  }
}
