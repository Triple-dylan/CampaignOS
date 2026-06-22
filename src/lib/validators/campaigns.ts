import { z } from "zod";
import { campaignStatusSchema } from "@/lib/validators/enums";

export const createCampaignSchema = z.object({
  organizationId: z.uuid(),
  candidateName: z.string().min(1).optional(),
  officeSought: z.string().optional(),
  jurisdiction: z.string().optional(),
  state: z.string().length(2).default("WA"),
  district: z.string().optional(),
  party: z.string().optional(),
  electionDate: z.string().date().optional(),
  campaignWebsite: z.union([z.url(), z.literal("")]).optional(),
  campaignStatus: campaignStatusSchema.default("draft"),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = createCampaignSchema
  .partial()
  .omit({ organizationId: true })
  .extend({
    id: z.uuid(),
  });

export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

const messageFrameworkSchema = z.object({
  valueProposition: z.string().optional(),
  keyMessages: z.array(z.string()).optional(),
  toneGuidance: z.string().optional(),
  taglines: z.array(z.string()).optional(),
});

const issueMapEntrySchema = z.object({
  issue: z.string().optional(),
  strategicNotes: z.string().optional(),
  talkingPoints: z.array(z.string()).optional(),
  priorityMessages: z.array(z.string()).optional(),
});

export const upsertCampaignProfileSchema = z.object({
  campaignId: z.uuid(),
  candidateBio: z.string().optional(),
  campaignThemes: z.array(z.string()).optional(),
  topIssues: z.array(z.string()).optional(),
  voterSegments: z.array(z.record(z.string(), z.unknown())).optional(),
  tonePreferences: z.record(z.string(), z.unknown()).optional(),
  opponentNames: z.array(z.string()).optional(),
  fundraisingGoal: z.number().nonnegative().nullable().optional(),
  summary: z.string().optional(),
  messageFramework: messageFrameworkSchema.optional(),
  issueMap: z.array(issueMapEntrySchema).optional(),
  brainGeneratedAt: z.iso.datetime().optional(),
});

export type UpsertCampaignProfileInput = z.infer<
  typeof upsertCampaignProfileSchema
>;
