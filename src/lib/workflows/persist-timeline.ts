import type { CampaignTimelineOutput } from "@/lib/ai/schemas/campaign-timeline";
import { listGraphNodes } from "@/lib/db/campaigns";
import { linkTaskToCampaignGraph } from "@/lib/db/graph";
import type { DbCampaign } from "@/lib/db/schema";
import { createTask } from "@/lib/db/tasks";
import { persistPlannerEvent } from "@/lib/planner/persist-event";
import { createTaskSchema } from "@/lib/validators/tasks";

export async function persistCampaignTimeline(input: {
  campaign: DbCampaign;
  createdBy: string | null;
  candidateName: string;
  timeline: CampaignTimelineOutput;
}) {
  const eventIds: string[] = [];
  const taskIds: string[] = [];

  for (const event of input.timeline.events) {
    const created = await persistPlannerEvent({
      campaign: input.campaign,
      createdBy: input.createdBy,
      title: event.title,
      description: event.description,
      eventType: event.event_type,
      startTime: event.start_time,
      isMilestone: event.is_milestone ?? false,
    });
    if (created.ok) {
      eventIds.push(created.eventId);
    }
  }

  const existingNodes = await listGraphNodes(input.campaign.id);

  for (const task of input.timeline.tasks) {
    const parsed = createTaskSchema.parse({
      campaignId: input.campaign.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.due_date ?? null,
      status: "todo",
      createdBy: input.createdBy,
    });

    const result = await createTask(parsed);
    if (result.task) {
      taskIds.push(result.task.id);
      await linkTaskToCampaignGraph({
        campaignId: input.campaign.id,
        taskId: result.task.id,
        taskTitle: result.task.title,
        status: result.task.status,
        candidateName: input.candidateName,
        existingNodes,
      });
    }
  }

  return { eventIds, taskIds };
}
