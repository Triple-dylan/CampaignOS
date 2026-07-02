import { z } from "zod";

export const contentCalendarSlotSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional(),
  channel: z.string().trim().min(1).max(50),
  start_time: z.string().min(1),
  theme: z.string().trim().max(100).optional(),
  issue: z.string().trim().max(100).optional(),
});

export const contentCalendarOutputSchema = z.object({
  summary: z.string().trim().min(1),
  calendar_title: z.string().trim().min(1).max(200),
  slots: z.array(contentCalendarSlotSchema).min(1).max(20),
});

export type ContentCalendarOutput = z.infer<typeof contentCalendarOutputSchema>;
