import { z } from "zod";

export const messageFrameworkSchema = z.object({
  valueProposition: z.string().min(1),
  keyMessages: z.array(z.string().min(1)).min(1).max(8),
  toneGuidance: z.string().min(1),
  taglines: z.array(z.string()).optional(),
});

export type MessageFramework = z.infer<typeof messageFrameworkSchema>;

export const issueMapEntrySchema = z.object({
  issue: z.string().min(1),
  strategicNotes: z.string().min(1),
  talkingPoints: z.array(z.string().min(1)).min(1).max(6),
  priorityMessages: z.array(z.string().min(1)).min(1).max(4),
});

export type IssueMapEntry = z.infer<typeof issueMapEntrySchema>;

export const strategicPrioritySchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

export const campaignBrainOutputSchema = z.object({
  summary: z.string().min(1),
  messageFramework: messageFrameworkSchema,
  issueMap: z.array(issueMapEntrySchema).min(1).max(10),
  strategicPriorities: z.array(strategicPrioritySchema).min(1).max(6).optional(),
});

export type CampaignBrainOutput = z.infer<typeof campaignBrainOutputSchema>;
