import type { ContentCalendarOutput } from "@/lib/ai/schemas/content-calendar";
import {
  appendKnowledgeLog,
  buildContentCalendarKnowledgePage,
  writeKnowledgePage,
} from "@/lib/campaign-knowledge/write";
import { buildCampaignKnowledgeRoot } from "@/lib/campaign-knowledge/paths";
import { syncKnowledgeAfterWrite } from "@/lib/campaign-knowledge/sync-after-write";
import { slugifyKnowledgeTitle } from "@/lib/campaign-knowledge/slug";
import { listGraphNodes } from "@/lib/db/campaigns";
import {
  getGraphNodeBySourceObject,
  linkContentCalendarToCampaignGraph,
} from "@/lib/db/graph";
import type { DbCampaign } from "@/lib/db/schema";
import { persistPlannerEvent } from "@/lib/planner/persist-event";

export async function persistContentCalendar(input: {
  organizationId: string;
  campaign: DbCampaign;
  createdBy: string | null;
  candidateName: string;
  calendar: ContentCalendarOutput;
}) {
  const eventIds: string[] = [];
  const contentEventNodeIds: string[] = [];
  const slotPaths: string[] = [];

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
      slotPaths.push(
        `social-media/${slugifyKnowledgeTitle(slot.title)}.md`,
      );

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

  const root = buildCampaignKnowledgeRoot({
    organizationId: input.organizationId,
    campaignId: input.campaign.id,
  });
  const calendarPage = buildContentCalendarKnowledgePage({
    calendarTitle: input.calendar.calendar_title,
    summary: input.calendar.summary,
    slotPaths,
  });
  const calendarPath = await writeKnowledgePage({
    root,
    folder: "social-media",
    slug: calendarPage.slug,
    frontmatter: calendarPage.frontmatter,
    body: calendarPage.body,
  });
  await appendKnowledgeLog({
    root,
    summary: `Content calendar saved: ${input.calendar.calendar_title}`,
    pagesTouched: [calendarPath, ...slotPaths],
  });
  await syncKnowledgeAfterWrite({
    organizationId: input.organizationId,
    campaignId: input.campaign.id,
  });

  return { eventIds, contentEventNodeIds };
}
