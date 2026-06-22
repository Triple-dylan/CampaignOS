"use server";

import { revalidatePath } from "next/cache";
import { generateProspectOutreachContent } from "@/lib/ai/generate-prospect-outreach";
import { isOpenAiConfigured } from "@/lib/ai/config";
import {
  requireCampaignContext,
  type ModuleActionResult,
} from "@/lib/auth/require-campaign-context";
import { listGraphNodes } from "@/lib/db/campaigns";
import { linkProspectToCampaignGraph } from "@/lib/db/graph";
import {
  computeFundraisingProgress,
  getLatestFundraisingPlan,
  upsertFundraisingPlan,
  updateFundraisingPlan,
} from "@/lib/db/fundraising-plans";
import {
  countFundraisingProspects,
  countTasksByProspectIds,
  createFundraisingProspect,
  deleteFundraisingProspect,
  getFundraisingProspectById,
  listFundraisingProspects,
  updateFundraisingProspect,
} from "@/lib/db/fundraising-prospects";
import { createTask } from "@/lib/db/tasks";
import { campaignDisplayName } from "@/lib/db/schema";
import {
  createFundraisingPlanSchema,
  createFundraisingProspectSchema,
  generateProspectOutreachRequestSchema,
  updateFundraisingPlanSchema,
  updateFundraisingProspectSchema,
  type FundraisingTimelineMilestone,
  type ListFundraisingProspectsFilter,
  type OutreachHistoryEntry,
  type ProspectStatus,
  type ProspectType,
} from "@/lib/validators/fundraising";
import { createTaskSchema } from "@/lib/validators/tasks";
import type { ProspectOutreachOutput } from "@/lib/ai/schemas/fundraising";

export type FundraisingActionResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error: string;
      code?:
        | "missing_org"
        | "missing_campaign"
        | "missing_openai"
        | "unauthorized"
        | "forbidden"
        | "not_found"
        | "validation"
        | "generation_failed";
    };

export type FundraisingPageData =
  | {
      ok: false;
      error: string;
    }
  | {
      ok: true;
      plan: Awaited<ReturnType<typeof getLatestFundraisingPlan>>;
      prospects: Awaited<ReturnType<typeof listFundraisingProspects>>;
      taskCounts: Record<string, number>;
      profileGoal: number | null;
      progress: ReturnType<typeof computeFundraisingProgress>;
      openAiConfigured: boolean;
      topIssues: string[];
      prospectCount: number;
    };

async function finalizeNewProspect(input: {
  campaignId: string;
  candidateName: string;
  prospectId: string;
  prospectName: string;
  prospectType: string;
  status: string;
  relatedIssue?: string | null;
}) {
  const existingNodes = await listGraphNodes(input.campaignId);
  await linkProspectToCampaignGraph({
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    prospectName: input.prospectName,
    prospectType: input.prospectType,
    status: input.status,
    candidateName: input.candidateName,
    relatedIssue: input.relatedIssue,
    existingNodes,
  });
}

export async function getFundraisingDataForCampaign(): Promise<FundraisingPageData> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error };
  }

  const [plan, prospects, prospectCount] = await Promise.all([
    getLatestFundraisingPlan(context.campaign.id),
    listFundraisingProspects({ campaignId: context.campaign.id }),
    countFundraisingProspects(context.campaign.id),
  ]);

  const taskCounts = await countTasksByProspectIds(
    context.campaign.id,
    prospects.map((prospect) => prospect.id),
  );

  const progress = computeFundraisingProgress({
    profileGoal: context.profile?.fundraising_goal,
    planGoal: plan?.goal_amount,
    raisedAmount: plan?.raised_amount,
  });

  return {
    ok: true,
    plan,
    prospects,
    taskCounts,
    profileGoal: context.profile?.fundraising_goal ?? null,
    progress,
    openAiConfigured: isOpenAiConfigured(),
    topIssues: context.profile?.top_issues ?? [],
    prospectCount,
  };
}

export async function saveFundraisingPlan(input: {
  title: string;
  goalAmount?: number | null;
  raisedAmount?: number | null;
  planBody?: string | null;
  timeline?: FundraisingTimelineMilestone[];
  outreachStrategy?: string | null;
  eventStrategy?: string | null;
}): Promise<FundraisingActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const parsed = createFundraisingPlanSchema.safeParse({
    campaignId: context.campaign.id,
    title: input.title,
    goalAmount: input.goalAmount,
    raisedAmount: input.raisedAmount,
    planBody: input.planBody,
    timeline: input.timeline,
    outreachStrategy: input.outreachStrategy,
    eventStrategy: input.eventStrategy,
    createdBy: context.dbUserId,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid plan data",
      code: "validation",
    };
  }

  try {
    const result = await upsertFundraisingPlan(parsed.data);
    if (!result.plan) {
      return {
        ok: false,
        error: "Database is not configured. Plan was not saved.",
        code: "missing_campaign",
      };
    }

    revalidatePath("/fundraising");
    revalidatePath("/dashboard");

    return { ok: true, id: result.plan.id };
  } catch (error) {
    console.error("[saveFundraisingPlan]", error);
    return { ok: false, error: "Failed to save fundraising plan." };
  }
}

export async function updateFundraisingPlanAction(input: {
  planId: string;
  title?: string;
  goalAmount?: number | null;
  raisedAmount?: number | null;
  planBody?: string | null;
  timeline?: FundraisingTimelineMilestone[];
  outreachStrategy?: string | null;
  eventStrategy?: string | null;
}): Promise<FundraisingActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const parsed = updateFundraisingPlanSchema.safeParse({
    id: input.planId,
    campaignId: context.campaign.id,
    title: input.title,
    goalAmount: input.goalAmount,
    raisedAmount: input.raisedAmount,
    planBody: input.planBody,
    timeline: input.timeline,
    outreachStrategy: input.outreachStrategy,
    eventStrategy: input.eventStrategy,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid plan data",
      code: "validation",
    };
  }

  try {
    const result = await updateFundraisingPlan(parsed.data);
    if (!result.plan) {
      return {
        ok: false,
        error: "Database is not configured. Plan was not saved.",
      };
    }

    revalidatePath("/fundraising");
    revalidatePath("/dashboard");

    return { ok: true, id: result.plan.id };
  } catch (error) {
    console.error("[updateFundraisingPlanAction]", error);
    return { ok: false, error: "Failed to update fundraising plan." };
  }
}

export async function createFundraisingProspectAction(input: {
  name: string;
  prospectType: ProspectType;
  organizationName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  location?: string | null;
  alignmentReason?: string | null;
  relatedIssue?: string | null;
  estimatedCapacity?: number | null;
  status?: ProspectStatus;
  notes?: string | null;
}): Promise<FundraisingActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const parsed = createFundraisingProspectSchema.safeParse({
    campaignId: context.campaign.id,
    name: input.name,
    prospectType: input.prospectType,
    organizationName: input.organizationName,
    email: input.email,
    phone: input.phone,
    website: input.website,
    location: input.location,
    alignmentReason: input.alignmentReason,
    relatedIssue: input.relatedIssue,
    estimatedCapacity: input.estimatedCapacity,
    status: input.status ?? "research",
    notes: input.notes,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid prospect data",
      code: "validation",
    };
  }

  try {
    const result = await createFundraisingProspect(parsed.data);
    if (!result.prospect) {
      return {
        ok: false,
        error: "Database is not configured. Prospect was not saved.",
        code: "missing_campaign",
      };
    }

    await finalizeNewProspect({
      campaignId: context.campaign.id,
      candidateName: campaignDisplayName(context.campaign),
      prospectId: result.prospect.id,
      prospectName: result.prospect.name,
      prospectType: result.prospect.prospect_type,
      status: result.prospect.status,
      relatedIssue: result.prospect.related_issue,
    });

    revalidatePath("/fundraising");
    revalidatePath("/dashboard");

    return { ok: true, id: result.prospect.id };
  } catch (error) {
    console.error("[createFundraisingProspectAction]", error);
    return { ok: false, error: "Failed to create prospect." };
  }
}

export async function updateFundraisingProspectAction(input: {
  prospectId: string;
  name?: string;
  prospectType?: ProspectType;
  organizationName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  location?: string | null;
  alignmentReason?: string | null;
  relatedIssue?: string | null;
  estimatedCapacity?: number | null;
  status?: ProspectStatus;
  notes?: string | null;
  outreachHistory?: OutreachHistoryEntry[];
}): Promise<FundraisingActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const existing = await getFundraisingProspectById(
    context.campaign.id,
    input.prospectId,
  );
  if (!existing) {
    return { ok: false, error: "Prospect not found", code: "not_found" };
  }

  const parsed = updateFundraisingProspectSchema.safeParse({
    id: input.prospectId,
    campaignId: context.campaign.id,
    name: input.name,
    prospectType: input.prospectType,
    organizationName: input.organizationName,
    email: input.email,
    phone: input.phone,
    website: input.website,
    location: input.location,
    alignmentReason: input.alignmentReason,
    relatedIssue: input.relatedIssue,
    estimatedCapacity: input.estimatedCapacity,
    status: input.status,
    notes: input.notes,
    outreachHistory: input.outreachHistory,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid prospect data",
      code: "validation",
    };
  }

  try {
    const result = await updateFundraisingProspect(parsed.data);
    if (!result.prospect) {
      return {
        ok: false,
        error: "Database is not configured. Prospect was not saved.",
      };
    }

    if (
      input.status !== undefined ||
      input.relatedIssue !== undefined ||
      input.name !== undefined
    ) {
      await finalizeNewProspect({
        campaignId: context.campaign.id,
        candidateName: campaignDisplayName(context.campaign),
        prospectId: result.prospect.id,
        prospectName: result.prospect.name,
        prospectType: result.prospect.prospect_type,
        status: result.prospect.status,
        relatedIssue: result.prospect.related_issue,
      });
    }

    revalidatePath("/fundraising");
    revalidatePath("/dashboard");

    return { ok: true, id: result.prospect.id };
  } catch (error) {
    console.error("[updateFundraisingProspectAction]", error);
    return { ok: false, error: "Failed to update prospect." };
  }
}

export async function deleteFundraisingProspectAction(
  prospectId: string,
): Promise<FundraisingActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const existing = await getFundraisingProspectById(
    context.campaign.id,
    prospectId,
  );
  if (!existing) {
    return { ok: false, error: "Prospect not found", code: "not_found" };
  }

  try {
    await deleteFundraisingProspect(context.campaign.id, prospectId);
    revalidatePath("/fundraising");
    revalidatePath("/dashboard");
    return { ok: true, id: prospectId };
  } catch (error) {
    console.error("[deleteFundraisingProspectAction]", error);
    return { ok: false, error: "Failed to delete prospect." };
  }
}

export async function createTaskFromProspect(
  prospectId: string,
  input?: { title?: string; description?: string },
): Promise<ModuleActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const prospect = await getFundraisingProspectById(
    context.campaign.id,
    prospectId,
  );
  if (!prospect) {
    return { ok: false, error: "Prospect not found", code: "not_found" };
  }

  const parsed = createTaskSchema.safeParse({
    campaignId: context.campaign.id,
    title: input?.title?.trim() || `Follow up: ${prospect.name}`,
    description:
      input?.description?.trim() ||
      prospect.notes ||
      `Fundraising follow-up for ${prospect.name}.`,
    status: "todo",
    priority: "medium",
    createdBy: context.dbUserId,
    relatedProspectId: prospectId,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid task data",
      code: "validation",
    };
  }

  try {
    const result = await createTask(parsed.data);
    if (!result.task) {
      return {
        ok: false,
        error: "Database is not configured. Task was not saved.",
        code: "missing_campaign",
      };
    }

    const existingNodes = await listGraphNodes(context.campaign.id);
    const { linkTaskToCampaignGraph } = await import("@/lib/db/graph");
    await linkTaskToCampaignGraph({
      campaignId: context.campaign.id,
      taskId: result.task.id,
      taskTitle: result.task.title,
      status: result.task.status,
      candidateName: campaignDisplayName(context.campaign),
      existingNodes,
    });

    revalidatePath("/tasks");
    revalidatePath("/fundraising");
    revalidatePath("/dashboard");

    return { ok: true, id: result.task.id };
  } catch (error) {
    console.error("[createTaskFromProspect]", error);
    return { ok: false, error: "Failed to create task from prospect." };
  }
}

export type ProspectOutreachActionResult =
  | { ok: true; outreach: ProspectOutreachOutput }
  | {
      ok: false;
      error: string;
      code?:
        | "missing_org"
        | "missing_campaign"
        | "missing_openai"
        | "unauthorized"
        | "forbidden"
        | "not_found"
        | "validation"
        | "generation_failed";
    };

export async function generateProspectOutreach(
  request: Parameters<typeof generateProspectOutreachRequestSchema.parse>[0],
): Promise<ProspectOutreachActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  if (!isOpenAiConfigured()) {
    return {
      ok: false,
      error:
        "OpenAI is not configured. Add OPENAI_API_KEY to draft outreach with AI.",
      code: "missing_openai",
    };
  }

  const parsedRequest = generateProspectOutreachRequestSchema.safeParse(request);
  if (!parsedRequest.success) {
    return {
      ok: false,
      error: parsedRequest.error.issues[0]?.message ?? "Invalid request",
      code: "validation",
    };
  }

  const prospect = await getFundraisingProspectById(
    context.campaign.id,
    parsedRequest.data.prospectId,
  );
  if (!prospect) {
    return { ok: false, error: "Prospect not found", code: "not_found" };
  }

  try {
    const outreach = await generateProspectOutreachContent({
      campaign: context.campaign,
      profile: context.profile,
      prospect,
      campaignId: context.campaign.id,
      userId: context.dbUserId,
      request: parsedRequest.data,
    });

    return { ok: true, outreach };
  } catch (error) {
    console.error("[generateProspectOutreach]", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Outreach generation failed. Please try again.",
      code: "generation_failed",
    };
  }
}

export async function listFundraisingProspectsForCampaign(
  filters?: Omit<ListFundraisingProspectsFilter, "campaignId">,
) {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false as const, error: context.error, prospects: [] };
  }

  const prospects = await listFundraisingProspects({
    campaignId: context.campaign.id,
    ...filters,
  });

  return { ok: true as const, prospects };
}

export async function getFundraisingDashboardMetrics() {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return {
      prospectCount: 0,
      progressPercent: null as number | null,
    };
  }

  const [prospectCount, plan] = await Promise.all([
    countFundraisingProspects(context.campaign.id),
    getLatestFundraisingPlan(context.campaign.id),
  ]);

  const progress = computeFundraisingProgress({
    profileGoal: context.profile?.fundraising_goal,
    planGoal: plan?.goal_amount,
    raisedAmount: plan?.raised_amount,
  });

  return {
    prospectCount,
    progressPercent: progress.progressPercent,
  };
}
