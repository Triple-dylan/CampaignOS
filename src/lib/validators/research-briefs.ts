import { z } from "zod";

export const researchTypeSchema = z.enum([
  "district",
  "issue",
  "opponent",
  "voter_segment",
  "media",
  "donor",
  "organization",
  "policy",
]);

export type ResearchType = z.infer<typeof researchTypeSchema>;

export const researchBriefStatusSchema = z.enum(["draft", "complete"]);

export type ResearchBriefStatus = z.infer<typeof researchBriefStatusSchema>;

export const RESEARCH_TYPE_LABELS: Record<ResearchType, string> = {
  district: "District",
  issue: "Issue",
  opponent: "Opponent",
  voter_segment: "Voter segment",
  media: "Media",
  donor: "Donor",
  organization: "Organization",
  policy: "Policy",
};

export const RESEARCH_BRIEF_STATUS_LABELS: Record<ResearchBriefStatus, string> = {
  draft: "Draft",
  complete: "Complete",
};

export const researchSourceSchema = z.object({
  url: z.string().trim().min(1),
  title: z.string().trim().min(1),
  snippet: z.string().trim().optional(),
});

export type ResearchSource = z.infer<typeof researchSourceSchema>;

export const createResearchBriefSchema = z.object({
  campaignId: z.uuid(),
  researchType: researchTypeSchema,
  title: z.string().trim().min(1, "Title is required").max(200),
  topic: z.string().trim().max(300).optional(),
  summary: z.string().trim().max(5000).optional(),
  body: z.string().trim().max(20000).optional(),
  keyFindings: z.array(z.string().trim().min(1)).optional(),
  sources: z.array(researchSourceSchema).optional(),
  status: researchBriefStatusSchema.optional(),
  aiGenerated: z.boolean().optional(),
  promptUsed: z.string().optional(),
  modelUsed: z.string().optional(),
  confidenceLevel: z.number().min(0).max(1).optional(),
  createdBy: z.uuid().nullable().optional(),
});

export type CreateResearchBriefInput = z.infer<typeof createResearchBriefSchema>;

export const updateResearchBriefSchema = z.object({
  id: z.uuid(),
  campaignId: z.uuid(),
  researchType: researchTypeSchema.optional(),
  title: z.string().trim().min(1).max(200).optional(),
  topic: z.string().trim().max(300).nullable().optional(),
  summary: z.string().trim().max(5000).nullable().optional(),
  body: z.string().trim().max(20000).nullable().optional(),
  keyFindings: z.array(z.string().trim().min(1)).optional(),
  sources: z.array(researchSourceSchema).optional(),
  status: researchBriefStatusSchema.optional(),
});

export type UpdateResearchBriefInput = z.infer<typeof updateResearchBriefSchema>;

export const listResearchBriefsFilterSchema = z.object({
  campaignId: z.uuid(),
  researchType: researchTypeSchema.optional(),
  status: researchBriefStatusSchema.optional(),
  createdAfter: z.string().optional(),
  createdBefore: z.string().optional(),
});

export type ListResearchBriefsFilter = z.infer<
  typeof listResearchBriefsFilterSchema
>;

export const generateResearchBriefRequestSchema = z.object({
  researchType: researchTypeSchema,
  topic: z.string().trim().min(3, "Topic must be at least 3 characters").max(500),
  relatedIssues: z.array(z.string().trim().min(1)).max(5).optional(),
});

export type GenerateResearchBriefRequest = z.infer<
  typeof generateResearchBriefRequestSchema
>;
