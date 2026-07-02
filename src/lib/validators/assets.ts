import { z } from "zod";

export const assetTypeSchema = z.enum([
  "social_post",
  "flyer",
  "email",
  "logo",
  "brand_kit",
  "speech",
  "press_release",
  "fundraising_email",
  "event_graphic",
  "website_copy",
]);

export type AssetType = z.infer<typeof assetTypeSchema>;

/** MVP asset types for Asset Studio (Phase 3). */
export const M7_ASSET_TYPES = ["social_post", "flyer", "email"] as const satisfies readonly AssetType[];

export type M7AssetType = (typeof M7_ASSET_TYPES)[number];

export const assetStatusSchema = z.enum([
  "draft",
  "needs_review",
  "approved",
  "scheduled",
  "published",
  "archived",
]);

export type AssetStatus = z.infer<typeof assetStatusSchema>;

/** Workflow statuses exposed in the Asset Studio UI. */
export const ASSET_WORKFLOW_STATUSES = ["draft", "needs_review", "approved"] as const satisfies readonly AssetStatus[];

export const complianceReviewStatusSchema = z.enum([
  "not_required",
  "required",
  "pending",
  "approved",
  "rejected",
]);

export type ComplianceReviewStatus = z.infer<typeof complianceReviewStatusSchema>;

export const createAssetSchema = z.object({
  campaignId: z.uuid(),
  assetType: assetTypeSchema,
  title: z.string().trim().min(1, "Title is required").max(200),
  contentText: z.string().trim().min(1, "Content is required"),
  description: z.string().trim().max(500).optional(),
  channel: z.string().trim().max(100).optional(),
  theme: z.string().trim().max(100).optional(),
  issue: z.string().trim().max(100).optional(),
  status: assetStatusSchema.optional(),
  aiGenerated: z.boolean().optional(),
  promptUsed: z.string().optional(),
  modelUsed: z.string().optional(),
  fileUrl: z.string().url().optional(),
  templateUsed: z.string().trim().max(100).optional(),
  createdBy: z.uuid().nullable().optional(),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const updateAssetSchema = z.object({
  id: z.uuid(),
  campaignId: z.uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  contentText: z.string().trim().min(1).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  channel: z.string().trim().max(100).nullable().optional(),
  theme: z.string().trim().max(100).nullable().optional(),
  issue: z.string().trim().max(100).nullable().optional(),
  status: assetStatusSchema.optional(),
  complianceStatus: complianceReviewStatusSchema.optional(),
  approvedBy: z.uuid().nullable().optional(),
  approvedAt: z.string().nullable().optional(),
  fileUrl: z.string().url().nullable().optional(),
  templateUsed: z.string().trim().max(100).nullable().optional(),
});

export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

export const listAssetsFilterSchema = z.object({
  campaignId: z.uuid(),
  assetType: assetTypeSchema.optional(),
  status: assetStatusSchema.optional(),
  complianceStatus: complianceReviewStatusSchema.optional(),
});

export type ListAssetsFilter = z.infer<typeof listAssetsFilterSchema>;

export const generateAssetRequestSchema = z.object({
  assetType: z.enum(M7_ASSET_TYPES),
  theme: z.string().trim().max(100).optional(),
  issue: z.string().trim().max(100).optional(),
  channel: z.string().trim().max(100).optional(),
  audience: z.string().trim().max(200).optional(),
  contentNeed: z.string().trim().max(300).optional(),
  variationHint: z.string().trim().max(200).optional(),
  templateId: z.string().trim().max(100).optional(),
});

export type GenerateAssetRequest = z.infer<typeof generateAssetRequestSchema>;

export const contentDraftBriefSchema = z.object({
  assetType: z.enum(M7_ASSET_TYPES),
  contentNeed: z
    .string()
    .trim()
    .min(3, "Describe what you are creating")
    .max(300),
  theme: z.string().trim().max(100).optional(),
  issue: z.string().trim().max(100).optional(),
  audience: z.string().trim().max(200).optional(),
  channel: z.string().trim().max(100).optional(),
});

export type ContentDraftBrief = z.infer<typeof contentDraftBriefSchema>;

export const contentDraftPreviewSchema = z.object({
  id: z.string().min(1),
  variantLabel: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1),
  theme: z.string().trim().max(100).optional(),
  issue: z.string().trim().max(100).optional(),
  channel: z.string().trim().max(100).optional(),
});

export type ContentDraftPreview = z.infer<typeof contentDraftPreviewSchema>;

export const saveContentDraftSchema = z.object({
  assetType: z.enum(M7_ASSET_TYPES),
  title: z.string().trim().min(1).max(200),
  contentText: z.string().trim().min(1),
  theme: z.string().trim().max(100).optional(),
  issue: z.string().trim().max(100).optional(),
  channel: z.string().trim().max(100).optional(),
  aiGenerated: z.boolean().optional(),
});

export type SaveContentDraftInput = z.infer<typeof saveContentDraftSchema>;

export const ASSET_TYPE_LABELS: Record<M7AssetType, string> = {
  social_post: "Social post",
  flyer: "Flyer copy",
  email: "Email",
};

export const ASSET_STATUS_LABELS: Record<(typeof ASSET_WORKFLOW_STATUSES)[number], string> = {
  draft: "Draft",
  needs_review: "Pending approval",
  approved: "Approved",
};

export const COMPLIANCE_STATUS_LABELS: Record<
  Exclude<ComplianceReviewStatus, "not_required">,
  string
> = {
  required: "Review required",
  pending: "Pending review",
  approved: "Reviewed",
  rejected: "Flagged",
};

export function defaultChannelForAssetType(type: M7AssetType): string {
  switch (type) {
    case "social_post":
      return "social";
    case "email":
      return "email";
    case "flyer":
      return "print";
    default:
      return "general";
  }
}
