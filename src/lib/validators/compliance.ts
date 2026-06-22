import { z } from "zod";
import { complianceReviewStatusSchema } from "@/lib/validators/assets";

export const complianceFlagSchema = z.object({
  type: z.enum(["auto", "attention", "manual"]),
  severity: z.enum(["info", "warning", "error"]).optional(),
  message: z.string().trim().min(1),
  flagged_at: z.string().optional(),
});

export type ComplianceFlag = z.infer<typeof complianceFlagSchema>;

export const complianceAutoCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  passed: z.boolean(),
  detail: z.string().optional(),
});

export type ComplianceAutoCheck = z.infer<typeof complianceAutoCheckSchema>;

export const complianceReviewActionSchema = z.enum([
  "approve",
  "flag",
  "reject",
]);

export type ComplianceReviewAction = z.infer<typeof complianceReviewActionSchema>;

export const listComplianceRecordsFilterSchema = z.object({
  campaignId: z.uuid(),
  reviewStatus: complianceReviewStatusSchema.optional(),
  contentType: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type ListComplianceRecordsFilter = z.infer<
  typeof listComplianceRecordsFilterSchema
>;

export const submitComplianceReviewSchema = z.object({
  recordId: z.uuid(),
  campaignId: z.uuid(),
  action: complianceReviewActionSchema,
  reviewNotes: z.string().trim().max(2000).optional(),
});

export type SubmitComplianceReviewInput = z.infer<
  typeof submitComplianceReviewSchema
>;

/** Dashboard filter buckets (map to underlying review_status values). */
export const complianceFilterBucketSchema = z.enum([
  "all",
  "pending",
  "reviewed",
  "flagged",
  "rejected",
]);

export type ComplianceFilterBucket = z.infer<
  typeof complianceFilterBucketSchema
>;

export const COMPLIANCE_FILTER_BUCKET_LABELS: Record<
  ComplianceFilterBucket,
  string
> = {
  all: "All statuses",
  pending: "Pending review",
  reviewed: "Reviewed",
  flagged: "Flagged",
  rejected: "Changes requested",
};

export const COMPLIANCE_RECORD_TYPE_LABELS: Record<string, string> = {
  campaign_asset: "Campaign asset",
  social_post: "Social post",
  flyer: "Flyer copy",
  email: "Email",
};

export function contentTypeLabel(contentType: string | null | undefined): string {
  if (!contentType) {
    return "Unknown";
  }
  return COMPLIANCE_RECORD_TYPE_LABELS[contentType] ?? contentType.replace(/_/g, " ");
}
