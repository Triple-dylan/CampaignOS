"use server";

import { revalidatePath } from "next/cache";
import { canReviewCompliance } from "@/lib/auth/permissions";
import { requireCampaignContext } from "@/lib/auth/require-campaign-context";
import {
  countComplianceRecords,
  getComplianceRecord,
  listComplianceRecords,
  updateComplianceReview,
} from "@/lib/db/compliance";
import type { DbComplianceRecordWithAsset } from "@/lib/db/schema";
import {
  submitComplianceReviewSchema,
  type ListComplianceRecordsFilter,
} from "@/lib/validators/compliance";

export type ComplianceActionResult =
  | { ok: true; recordId: string }
  | {
      ok: false;
      error: string;
      code?:
        | "missing_org"
        | "missing_campaign"
        | "unauthorized"
        | "forbidden"
        | "not_found"
        | "validation";
    };

export async function getComplianceDataForCampaign(
  filters?: Omit<ListComplianceRecordsFilter, "campaignId">,
) {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return {
      ok: false as const,
      error: context.error,
      records: [] as DbComplianceRecordWithAsset[],
      counts: {
        total: 0,
        pendingReview: 0,
        reviewed: 0,
        flagged: 0,
        rejected: 0,
      },
      canReview: false,
    };
  }

  const [records, counts] = await Promise.all([
    listComplianceRecords({
      campaignId: context.campaign.id,
      ...filters,
    }),
    countComplianceRecords(context.campaign.id),
  ]);

  return {
    ok: true as const,
    records,
    counts,
    canReview: context.role ? canReviewCompliance(context.role) : false,
    campaignState: context.campaign.state ?? "WA",
  };
}

export async function getComplianceRecordDetail(recordId: string) {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return {
      ok: false as const,
      error: context.error,
      record: null as DbComplianceRecordWithAsset | null,
      canReview: false,
    };
  }

  const record = await getComplianceRecord({
    campaignId: context.campaign.id,
    recordId,
  });

  if (!record) {
    return {
      ok: false as const,
      error: "Compliance record not found.",
      record: null,
      canReview: false,
    };
  }

  return {
    ok: true as const,
    record,
    canReview: context.role ? canReviewCompliance(context.role) : false,
  };
}

export async function submitComplianceReviewAction(input: {
  recordId: string;
  action: "approve" | "flag" | "reject";
  reviewNotes?: string;
}): Promise<ComplianceActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  if (!context.role || !canReviewCompliance(context.role)) {
    return {
      ok: false,
      error: "You do not have permission to review compliance records.",
      code: "forbidden",
    };
  }

  const parsed = submitComplianceReviewSchema.safeParse({
    recordId: input.recordId,
    campaignId: context.campaign.id,
    action: input.action,
    reviewNotes: input.reviewNotes,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid review submission",
      code: "validation",
    };
  }

  const existing = await getComplianceRecord({
    campaignId: context.campaign.id,
    recordId: parsed.data.recordId,
  });

  if (!existing) {
    return {
      ok: false,
      error: "Compliance record not found.",
      code: "not_found",
    };
  }

  await updateComplianceReview({
    ...parsed.data,
    reviewedBy: context.dbUserId,
  });

  revalidatePath("/compliance");
  revalidatePath("/dashboard");
  revalidatePath("/assets");

  return { ok: true, recordId: parsed.data.recordId };
}

export async function getComplianceDashboardMetrics() {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { pendingReview: 0, total: 0 };
  }

  const counts = await countComplianceRecords(context.campaign.id);
  return {
    pendingReview: counts.pendingReview,
    total: counts.total,
    flagged: counts.flagged,
  };
}
