import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import { updateAsset } from "@/lib/db/assets";
import type {
  ComplianceAutoCheckJson,
  ComplianceFlagJson,
  DbComplianceRecord,
  DbComplianceRecordWithAsset,
} from "@/lib/db/schema";
import {
  complianceReviewStatusSchema,
  type AssetType,
  type ComplianceReviewStatus,
} from "@/lib/validators/assets";
import {
  listComplianceRecordsFilterSchema,
  submitComplianceReviewSchema,
  type ComplianceAutoCheck,
  type ComplianceFlag,
  type ComplianceReviewAction,
  type ListComplianceRecordsFilter,
  type SubmitComplianceReviewInput,
} from "@/lib/validators/compliance";
import { z } from "zod";

const createComplianceRecordSchema = z.object({
  campaignId: z.uuid(),
  relatedAssetId: z.uuid(),
  contentType: z.string().optional(),
  aiGenerated: z.boolean().optional(),
  distributionChannel: z.string().optional(),
  reviewStatus: complianceReviewStatusSchema.optional(),
});

export type CreateComplianceRecordInput = z.infer<
  typeof createComplianceRecordSchema
>;

const COMPLIANCE_RECORD_SELECT = `
  *,
  asset:assets (
    id,
    title,
    asset_type,
    content_text,
    status,
    compliance_status
  )
`;

function mapComplianceRecord(row: Record<string, unknown>): DbComplianceRecord {
  return row as DbComplianceRecord;
}

function mapComplianceRecordWithAsset(
  row: Record<string, unknown>,
): DbComplianceRecordWithAsset {
  const { asset, ...record } = row as DbComplianceRecordWithAsset & {
    asset: DbComplianceRecordWithAsset["asset"] | DbComplianceRecordWithAsset["asset"][];
  };

  return {
    ...(record as DbComplianceRecord),
    asset: Array.isArray(asset) ? (asset[0] ?? null) : (asset ?? null),
  };
}

function flagsList(record: DbComplianceRecord): ComplianceFlagJson[] {
  if (Array.isArray(record.flags_json) && record.flags_json.length) {
    return record.flags_json;
  }
  return [];
}

export function buildAutoFlagsForAsset(input: {
  aiGenerated: boolean;
  assetType?: string;
  requiredDisclosure?: boolean;
  disclosureText?: string | null;
}): ComplianceFlag[] {
  const flags: ComplianceFlag[] = [];

  if (input.aiGenerated) {
    flags.push({
      type: "auto",
      severity: "warning",
      message: "AI-generated content — requires human review",
    });
  }

  flags.push({
    type: "auto",
    severity: "info",
    message: "Verify factual claims before publication",
  });

  if (input.requiredDisclosure !== false && !input.disclosureText?.trim()) {
    flags.push({
      type: "auto",
      severity: "warning",
      message: "Confirm required disclaimers are present for this channel",
    });
  }

  if (input.assetType === "social_post" || input.assetType === "email") {
    flags.push({
      type: "auto",
      severity: "info",
      message: "Washington State campaign communications may require sponsor identification — verify with counsel",
    });
  }

  return flags;
}

export function buildAutoChecksForAsset(input: {
  aiGenerated: boolean;
  requiredDisclosure?: boolean;
  disclosureText?: string | null;
}): ComplianceAutoCheck[] {
  const checks: ComplianceAutoCheck[] = [
    {
      id: "human_review",
      label: "Human review required",
      passed: false,
      detail: input.aiGenerated
        ? "AI-generated asset flagged for reviewer sign-off"
        : "Campaign asset requires compliance review before use",
    },
    {
      id: "factual_claims",
      label: "Factual claims verification",
      passed: false,
      detail: "Reviewer should confirm statements are accurate and supportable",
    },
    {
      id: "disclaimer_present",
      label: "Required disclaimer check",
      passed: Boolean(input.disclosureText?.trim()),
      detail: input.disclosureText?.trim()
        ? "Disclosure text provided on record"
        : "No disclosure text recorded — confirm disclaimers on the asset",
    },
  ];

  return checks;
}

export async function createComplianceRecordForAsset(
  input: CreateComplianceRecordInput,
) {
  const parsed = createComplianceRecordSchema.parse(input);

  if (!isSupabaseConfigured()) {
    console.info(
      "[compliance] Supabase not configured — skipping compliance record",
    );
    return { synced: false as const, record: null };
  }

  const supabase = getSupabaseAdmin();
  const reviewStatus: ComplianceReviewStatus =
    parsed.reviewStatus ?? (parsed.aiGenerated ? "pending" : "required");
  const flags = buildAutoFlagsForAsset({
    aiGenerated: parsed.aiGenerated ?? false,
    assetType: parsed.contentType,
    requiredDisclosure: true,
  });
  const autoChecks = buildAutoChecksForAsset({
    aiGenerated: parsed.aiGenerated ?? false,
    requiredDisclosure: true,
  });

  const { data, error } = await supabase
    .from("compliance_records")
    .insert({
      campaign_id: parsed.campaignId,
      related_asset_id: parsed.relatedAssetId,
      content_type: parsed.contentType ?? "campaign_asset",
      ai_generated: parsed.aiGenerated ?? false,
      distribution_channel: parsed.distributionChannel ?? null,
      review_status: reviewStatus,
      required_disclosure: true,
      flags_json: flags,
      auto_checks_json: autoChecks,
      metadata_json: {
        source: "asset_studio",
        assetType: parsed.contentType,
      },
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    record: mapComplianceRecord(data),
  };
}

export async function listComplianceRecords(
  filters: ListComplianceRecordsFilter,
): Promise<DbComplianceRecordWithAsset[]> {
  const parsed = listComplianceRecordsFilterSchema.parse(filters);

  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("compliance_records")
    .select(COMPLIANCE_RECORD_SELECT)
    .eq("campaign_id", parsed.campaignId)
    .order("created_at", { ascending: false });

  if (parsed.reviewStatus) {
    query = query.eq("review_status", parsed.reviewStatus);
  }
  if (parsed.contentType) {
    query = query.eq("content_type", parsed.contentType);
  }
  if (parsed.dateFrom) {
    query = query.gte("created_at", parsed.dateFrom);
  }
  if (parsed.dateTo) {
    query = query.lte("created_at", parsed.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) =>
    mapComplianceRecordWithAsset(row as Record<string, unknown>),
  );
}

export async function getComplianceRecord(input: {
  campaignId: string;
  recordId: string;
}): Promise<DbComplianceRecordWithAsset | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("compliance_records")
    .select(COMPLIANCE_RECORD_SELECT)
    .eq("campaign_id", input.campaignId)
    .eq("id", input.recordId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapComplianceRecordWithAsset(data as Record<string, unknown>);
}

function reviewStatusForAction(
  action: ComplianceReviewAction,
): ComplianceReviewStatus {
  switch (action) {
    case "approve":
      return "approved";
    case "flag":
      return "required";
    case "reject":
      return "rejected";
    default:
      return "pending";
  }
}

export async function updateComplianceReview(
  input: SubmitComplianceReviewInput & {
    reviewedBy: string | null;
  },
) {
  const { reviewedBy, ...reviewInput } = input;
  const parsed = submitComplianceReviewSchema.parse(reviewInput);

  if (!isSupabaseConfigured()) {
    return { synced: false as const, record: null };
  }

  const existing = await getComplianceRecord({
    campaignId: parsed.campaignId,
    recordId: parsed.recordId,
  });

  if (!existing) {
    throw new Error("Compliance record not found");
  }

  const reviewStatus = reviewStatusForAction(parsed.action);
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    review_status: reviewStatus,
    reviewed_by: reviewedBy,
    reviewed_at: reviewedBy ? now : null,
    review_notes: parsed.reviewNotes?.trim() || null,
  };

  if (parsed.action === "flag") {
    const attentionFlag: ComplianceFlagJson = {
      type: "attention",
      severity: "warning",
      message: parsed.reviewNotes?.trim() || "Flagged for compliance attention",
      flagged_at: now,
    };
    updates.flags_json = [...flagsList(existing), attentionFlag];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("compliance_records")
    .update(updates)
    .eq("id", parsed.recordId)
    .eq("campaign_id", parsed.campaignId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  if (existing.related_asset_id) {
    await updateAsset({
      id: existing.related_asset_id,
      campaignId: parsed.campaignId,
      complianceStatus: reviewStatus,
    });
  }

  return {
    synced: true as const,
    record: mapComplianceRecord(data),
  };
}

export async function updateComplianceRecordForAsset(input: {
  assetId: string;
  reviewStatus: ComplianceReviewStatus;
  reviewedBy?: string | null;
}) {
  if (!isSupabaseConfigured()) {
    return { synced: false as const };
  }

  const supabase = getSupabaseAdmin();
  const updates: Record<string, unknown> = {
    review_status: input.reviewStatus,
  };

  if (input.reviewedBy !== undefined) {
    updates.reviewed_by = input.reviewedBy;
    updates.reviewed_at = input.reviewedBy ? new Date().toISOString() : null;
  }

  const { error } = await supabase
    .from("compliance_records")
    .update(updates)
    .eq("related_asset_id", input.assetId);

  if (error) {
    throw error;
  }

  return { synced: true as const };
}

export type ComplianceRecordCounts = {
  total: number;
  pendingReview: number;
  reviewed: number;
  flagged: number;
  rejected: number;
};

export async function countComplianceRecords(
  campaignId: string,
): Promise<ComplianceRecordCounts> {
  if (!isSupabaseConfigured()) {
    return {
      total: 0,
      pendingReview: 0,
      reviewed: 0,
      flagged: 0,
      rejected: 0,
    };
  }

  const records = await listComplianceRecords({ campaignId });

  let pendingReview = 0;
  let reviewed = 0;
  let flagged = 0;
  let rejected = 0;

  for (const record of records) {
    if (record.review_status === "approved") {
      reviewed += 1;
    } else if (record.review_status === "rejected") {
      rejected += 1;
    } else if (
      record.review_status === "pending" ||
      record.review_status === "required"
    ) {
      pendingReview += 1;
    }

    if (
      flagsList(record).some((flag) => flag.type === "attention") &&
      record.review_status !== "approved" &&
      record.review_status !== "rejected"
    ) {
      flagged += 1;
    }
  }

  return {
    total: records.length,
    pendingReview,
    reviewed,
    flagged,
    rejected,
  };
}

export async function countPendingComplianceReviews(
  campaignId: string,
): Promise<number> {
  const counts = await countComplianceRecords(campaignId);
  return counts.pendingReview;
}

export function complianceStatusForAssetType(
  _assetType: AssetType,
  aiGenerated: boolean,
): ComplianceReviewStatus {
  return aiGenerated ? "pending" : "required";
}

export function recordHasAttentionFlag(record: DbComplianceRecord): boolean {
  return flagsList(record).some((flag) => flag.type === "attention");
}

export function autoChecksList(
  record: DbComplianceRecord,
): ComplianceAutoCheckJson[] {
  if (
    Array.isArray(record.auto_checks_json) &&
    record.auto_checks_json.length
  ) {
    return record.auto_checks_json;
  }
  return [];
}
