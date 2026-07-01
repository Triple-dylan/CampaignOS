import type { ContentCalendarOutput } from "@/lib/ai/schemas/content-calendar";
import { listGraphNodes } from "@/lib/db/campaigns";
import {
  getGraphNodeBySourceObject,
  linkContentCalendarToCampaignGraph,
} from "@/lib/db/graph";
import type { DbCampaign } from "@/lib/db/schema";
import { persistPlannerEvent } from "@/lib/planner/persist-event";

export async function persistContentCalendar(input: {
  campaign: DbCampaign;
  createdBy: string | null;
  candidateName: string;
  calendar: ContentCalendarOutput;
}) {
  const eventIds: string[] = [];
  const contentEventNodeIds: string[] = [];

  for (const slot of input.calendar.slots) {
    const description = [
      slot.description,
      slot.theme ? `Theme: ${slot.theme}` : null,
      slot.issue ? `Issue: ${slot.issue}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const created = await persistPlannerEvent({
      campaign: input.campaign,
      createdBy: input.createdBy,
      title: slot.title,
      description: description || undefined,
      eventType: "content",
      startTime: slot.start_time,
      isMilestone: false,
      channel: slot.channel,
    });

    if (created.ok) {
      eventIds.push(created.eventId);

      const graphNode = await getGraphNodeBySourceObject({
        campaignId: input.campaign.id,
        sourceObjectType: "calendar_event",
        sourceObjectId: created.eventId,
      });
      if (graphNode) {
        contentEventNodeIds.push(graphNode.id);
      }
    }
  }

  const existingNodes = await listGraphNodes(input.campaign.id);
  await linkContentCalendarToCampaignGraph({
    campaignId: input.campaign.id,
    calendarTitle: input.calendar.calendar_title,
    summary: input.calendar.summary,
    candidateName: input.candidateName,
    contentEventNodeIds,
    existingNodes,
  });

  return { eventIds, contentEventNodeIds };
}
