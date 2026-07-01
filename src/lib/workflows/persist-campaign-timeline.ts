import { createPlannerEvent } from "@/actions/planner";
import { createCampaignTask } from "@/actions/tasks";
import type { CampaignTimelineOutput } from "@/lib/ai/schemas/campaign-timeline";
import {
  campaignTimelineEventSchema,
  campaignTimelineTaskSchema,
} from "@/lib/ai/schemas/campaign-timeline";
import type { z } from "zod";

type TimelineEvent = z.infer<typeof campaignTimelineEventSchema>;
type TimelineTask = z.infer<typeof campaignTimelineTaskSchema>;

export async function persistCampaignTimelineItems(input: {
  events: TimelineEvent[];
  tasks: TimelineTask[];
}): Promise<{ eventIds: string[]; taskIds: string[] }> {
  const eventIds: string[] = [];
  const taskIds: string[] = [];

  for (const event of input.events) {
    const created = await createPlannerEvent({
      title: event.title,
      description: event.description,
      eventType: event.event_type,
      startTime: event.start_time,
      isMilestone: event.is_milestone ?? false,
    });
    if (created.ok && created.id) {
      eventIds.push(created.id);
    }
  }

  for (const task of input.tasks) {
    const created = await createCampaignTask({
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.due_date ?? null,
      status: "todo",
    });
    if (created.ok && created.id) {
      taskIds.push(created.id);
    }
  }

  return { eventIds, taskIds };
}

export function buildCampaignTimelineIssuesInput(input: {
  issues: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
}): string {
  const parts = [input.issues.trim()];
  if (input.dateRangeStart || input.dateRangeEnd) {
    const range = [
      input.dateRangeStart ? `Start: ${input.dateRangeStart}` : null,
      input.dateRangeEnd ? `End: ${input.dateRangeEnd}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    parts.push(`Planning horizon: ${range}.`);
  }
  return parts.filter(Boolean).join(" ");
}

export type { CampaignTimelineOutput, TimelineEvent, TimelineTask };
