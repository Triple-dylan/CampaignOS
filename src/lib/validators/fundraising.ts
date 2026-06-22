import { z } from "zod";

export const prospectTypeSchema = z.enum([
  "individual",
  "business",
  "organization",
  "pac",
  "host",
  "peer_campaign",
  "community_leader",
]);

export type ProspectType = z.infer<typeof prospectTypeSchema>;

export const prospectStatusSchema = z.enum([
  "research",
  "not_contacted",
  "contacted",
  "follow_up",
  "pledged",
  "donated",
  "declined",
  "archived",
]);

export type ProspectStatus = z.infer<typeof prospectStatusSchema>;

export const PROSPECT_TYPE_LABELS: Record<ProspectType, string> = {
  individual: "Individual",
  business: "Business",
  organization: "Organization",
  pac: "PAC",
  host: "Event host",
  peer_campaign: "Peer campaign",
  community_leader: "Community leader",
};

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  research: "Research",
  not_contacted: "Not contacted",
  contacted: "Contacted",
  follow_up: "Follow up",
  pledged: "Pledged",
  donated: "Donated",
  declined: "Declined",
  archived: "Archived",
};

export const capacityTierSchema = z.enum([
  "all",
  "unknown",
  "low",
  "mid",
  "high",
  "major",
]);

export type CapacityTier = z.infer<typeof capacityTierSchema>;

export const CAPACITY_TIER_LABELS: Record<
  Exclude<CapacityTier, "all">,
  string
> = {
  unknown: "Unknown",
  low: "Low (< $500)",
  mid: "Mid ($500–$5K)",
  high: "High ($5K–$25K)",
  major: "Major ($25K+)",
};

export function getCapacityTier(
  amount: number | null | undefined,
): Exclude<CapacityTier, "all"> {
  if (amount == null || Number.isNaN(Number(amount))) {
    return "unknown";
  }
  const value = Number(amount);
  if (value < 500) return "low";
  if (value < 5000) return "mid";
  if (value < 25000) return "high";
  return "major";
}

export const outreachHistoryEntrySchema = z.object({
  date: z.string().trim().optional(),
  channel: z.string().trim().optional(),
  summary: z.string().trim().min(1),
  outcome: z.string().trim().optional(),
});

export type OutreachHistoryEntry = z.infer<typeof outreachHistoryEntrySchema>;

export const fundraisingTimelineMilestoneSchema = z.object({
  title: z.string().trim().min(1),
  targetDate: z.string().trim().optional(),
  targetAmount: z.number().nonnegative().optional(),
  notes: z.string().trim().optional(),
});

export type FundraisingTimelineMilestone = z.infer<
  typeof fundraisingTimelineMilestoneSchema
>;

export const createFundraisingPlanSchema = z.object({
  campaignId: z.uuid(),
  title: z.string().trim().min(1, "Title is required").max(200),
  goalAmount: z.number().nonnegative().nullable().optional(),
  raisedAmount: z.number().nonnegative().nullable().optional(),
  planBody: z.string().trim().max(20000).nullable().optional(),
  timeline: z.array(fundraisingTimelineMilestoneSchema).optional(),
  outreachStrategy: z.string().trim().max(10000).nullable().optional(),
  eventStrategy: z.string().trim().max(10000).nullable().optional(),
  aiGenerated: z.boolean().optional(),
  createdBy: z.uuid().nullable().optional(),
});

export type CreateFundraisingPlanInput = z.infer<
  typeof createFundraisingPlanSchema
>;

export const updateFundraisingPlanSchema = z.object({
  id: z.uuid(),
  campaignId: z.uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  goalAmount: z.number().nonnegative().nullable().optional(),
  raisedAmount: z.number().nonnegative().nullable().optional(),
  planBody: z.string().trim().max(20000).nullable().optional(),
  timeline: z.array(fundraisingTimelineMilestoneSchema).optional(),
  outreachStrategy: z.string().trim().max(10000).nullable().optional(),
  eventStrategy: z.string().trim().max(10000).nullable().optional(),
});

export type UpdateFundraisingPlanInput = z.infer<
  typeof updateFundraisingPlanSchema
>;

const optionalEmailSchema = z
  .string()
  .trim()
  .max(320)
  .nullable()
  .optional()
  .refine(
    (value) =>
      value == null || value === "" || z.string().email().safeParse(value).success,
    { message: "Invalid email address" },
  );

export const createFundraisingProspectSchema = z.object({
  campaignId: z.uuid(),
  name: z.string().trim().min(1, "Name is required").max(200),
  prospectType: prospectTypeSchema,
  organizationName: z.string().trim().max(200).nullable().optional(),
  email: optionalEmailSchema,
  phone: z.string().trim().max(50).nullable().optional(),
  website: z.string().trim().max(500).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  alignmentReason: z.string().trim().max(2000).nullable().optional(),
  relatedIssue: z.string().trim().max(200).nullable().optional(),
  estimatedCapacity: z.number().nonnegative().nullable().optional(),
  status: prospectStatusSchema.optional(),
  notes: z.string().trim().max(10000).nullable().optional(),
  outreachHistory: z.array(outreachHistoryEntrySchema).optional(),
});

export type CreateFundraisingProspectInput = z.infer<
  typeof createFundraisingProspectSchema
>;

export const updateFundraisingProspectSchema = z.object({
  id: z.uuid(),
  campaignId: z.uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  prospectType: prospectTypeSchema.optional(),
  organizationName: z.string().trim().max(200).nullable().optional(),
  email: optionalEmailSchema,
  phone: z.string().trim().max(50).nullable().optional(),
  website: z.string().trim().max(500).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  alignmentReason: z.string().trim().max(2000).nullable().optional(),
  relatedIssue: z.string().trim().max(200).nullable().optional(),
  estimatedCapacity: z.number().nonnegative().nullable().optional(),
  status: prospectStatusSchema.optional(),
  notes: z.string().trim().max(10000).nullable().optional(),
  outreachHistory: z.array(outreachHistoryEntrySchema).optional(),
});

export type UpdateFundraisingProspectInput = z.infer<
  typeof updateFundraisingProspectSchema
>;

export const listFundraisingProspectsFilterSchema = z.object({
  campaignId: z.uuid(),
  status: prospectStatusSchema.optional(),
  relatedIssue: z.string().trim().optional(),
});

export type ListFundraisingProspectsFilter = z.infer<
  typeof listFundraisingProspectsFilterSchema
>;

export const generateProspectOutreachRequestSchema = z.object({
  prospectId: z.uuid(),
  outreachGoal: z.string().trim().max(500).optional(),
  channel: z.enum(["email", "phone", "in_person"]).optional(),
});

export type GenerateProspectOutreachRequest = z.infer<
  typeof generateProspectOutreachRequestSchema
>;
