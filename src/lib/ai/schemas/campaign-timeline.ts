import { z } from "zod";
import { calendarEventTypeSchema } from "@/lib/validators/calendar-events";
import { taskPrioritySchema } from "@/lib/validators/tasks";

export const campaignTimelineEventSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional(),
  event_type: calendarEventTypeSchema,
  start_time: z.string().min(1),
  is_milestone: z.boolean().optional(),
});

export const campaignTimelineTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional(),
  priority: taskPrioritySchema.optional(),
  due_date: z.string().optional(),
});

export const campaignTimelineOutputSchema = z.object({
  summary: z.string().trim().min(1),
  events: z.array(campaignTimelineEventSchema).min(1).max(12),
  tasks: z.array(campaignTimelineTaskSchema).min(1).max(15),
});

export type CampaignTimelineOutput = z.infer<
  typeof campaignTimelineOutputSchema
>;
