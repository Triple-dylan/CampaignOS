import { z } from "zod";

export const calendarEventTypeSchema = z.enum([
  "content",
  "fundraiser",
  "speech",
  "debate",
  "volunteer",
  "canvassing",
  "compliance",
  "internal",
  "public_event",
]);

export type CalendarEventType = z.infer<typeof calendarEventTypeSchema>;

export const CALENDAR_EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  content: "Content",
  fundraiser: "Fundraiser",
  speech: "Speech",
  debate: "Debate",
  volunteer: "Volunteer",
  canvassing: "Canvassing",
  compliance: "Compliance",
  internal: "Internal",
  public_event: "Public event",
};

export const createCalendarEventSchema = z
  .object({
    campaignId: z.uuid(),
    title: z.string().trim().min(1, "Title is required").max(200),
    description: z.string().trim().max(2000).optional(),
    eventType: calendarEventTypeSchema,
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().optional(),
    location: z.string().trim().max(300).optional(),
    relatedAssetId: z.uuid().nullable().optional(),
    isMilestone: z.boolean().optional(),
    createdBy: z.uuid().nullable().optional(),
  })
  .refine(
    (data) => {
      if (!data.endTime) return true;
      return new Date(data.endTime) >= new Date(data.startTime);
    },
    { message: "End time must be after start time", path: ["endTime"] },
  );

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;

export const updateCalendarEventSchema = z
  .object({
    id: z.uuid(),
    campaignId: z.uuid(),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    eventType: calendarEventTypeSchema.optional(),
    startTime: z.string().optional(),
    endTime: z.string().nullable().optional(),
    location: z.string().trim().max(300).nullable().optional(),
    relatedAssetId: z.uuid().nullable().optional(),
    isMilestone: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (!data.startTime || !data.endTime) return true;
      return new Date(data.endTime) >= new Date(data.startTime);
    },
    { message: "End time must be after start time", path: ["endTime"] },
  );

export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;

export const listCalendarEventsFilterSchema = z.object({
  campaignId: z.uuid(),
  startAfter: z.string().optional(),
  startBefore: z.string().optional(),
  eventType: calendarEventTypeSchema.optional(),
});

export type ListCalendarEventsFilter = z.infer<
  typeof listCalendarEventsFilterSchema
>;
