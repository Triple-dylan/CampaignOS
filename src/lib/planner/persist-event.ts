import { createCalendarEvent } from "@/lib/db/calendar-events";
import { listGraphNodes } from "@/lib/db/campaigns";
import { linkEventToCampaignGraph } from "@/lib/db/graph";
import { campaignDisplayName } from "@/lib/db/schema";
import type { DbCampaign } from "@/lib/db/schema";
import {
  createCalendarEventSchema,
  type CalendarEventType,
} from "@/lib/validators/calendar-events";

export async function persistPlannerEvent(input: {
  campaign: DbCampaign;
  createdBy: string | null;
  title: string;
  description?: string;
  eventType: CalendarEventType;
  startTime: string;
  endTime?: string;
  location?: string;
  relatedAssetId?: string | null;
  isMilestone?: boolean;
  channel?: string | null;
}) {
  const parsed = createCalendarEventSchema.parse({
    campaignId: input.campaign.id,
    title: input.title,
    description: input.description,
    eventType: input.eventType,
    startTime: input.startTime,
    endTime: input.endTime,
    location: input.location,
    relatedAssetId: input.relatedAssetId,
    isMilestone: input.isMilestone,
    createdBy: input.createdBy,
  });

  const result = await createCalendarEvent(parsed);
  if (!result.event) {
    return { ok: false as const, error: "Database is not configured." };
  }

  const existingNodes = await listGraphNodes(input.campaign.id);
  await linkEventToCampaignGraph({
    campaignId: input.campaign.id,
    eventId: result.event.id,
    eventTitle: result.event.title,
    eventType: result.event.event_type,
    candidateName: campaignDisplayName(input.campaign),
    relatedAssetId: result.event.related_asset_id,
    channel: input.channel ?? null,
    existingNodes,
  });

  return { ok: true as const, eventId: result.event.id };
}
