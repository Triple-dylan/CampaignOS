import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import { listActivityEvents } from "@/lib/db/activity";
import { listAssets } from "@/lib/db/assets";
import { listCalendarEvents } from "@/lib/db/calendar-events";
import { countPendingComplianceReviews } from "@/lib/db/compliance";
import {
  computeFundraisingProgress,
  getLatestFundraisingPlan,
} from "@/lib/db/fundraising-plans";
import { listTasks } from "@/lib/db/tasks";
import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";

/** A task surfaced in the right-rail digest (due soonest first). */
export type DigestTask = {
  id: string;
  title: string;
  priority: string;
  dueDate: string | null;
  ownerUserId?: string | null;
};

export type DigestEvent = {
  id: string;
  title: string;
  eventType: string;
  startTime: string;
  location: string | null;
  isMilestone: boolean;
};

export type DigestReviewAsset = {
  id: string;
  title: string;
  assetType: string;
};

export type DigestActivity = {
  id: string;
  module: string;
  summary?: string;
  createdAt: string;
  createdObjectType: string | null;
  actorKind?: "user" | "agent" | "system" | "ai";
};

export type WorkspaceDigest = {
  dueTasks: DigestTask[];
  upcomingEvents: DigestEvent[];
  reviewAssets: DigestReviewAsset[];
  pendingComplianceCount: number;
  recentActivity: DigestActivity[];
  fundraising: {
    raisedAmount: number;
    effectiveGoal: number | null;
    progressPercent: number | null;
  };
};

const OPEN_TASK_STATUSES = new Set(["todo", "in_progress", "blocked"]);

async function listRecentAiActivity(
  campaignId: string,
  limit: number,
): Promise<DigestActivity[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_generation_logs")
    .select("id, module, created_at, created_object_type")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    module: row.module as string,
    createdAt: row.created_at as string,
    createdObjectType: (row.created_object_type as string | null) ?? null,
    actorKind: "ai" as const,
  }));
}

async function listRecentTeamActivity(
  campaignId: string,
  limit: number,
): Promise<DigestActivity[]> {
  try {
    const events = await listActivityEvents(campaignId, { limit });
    return events.map((event) => ({
      id: event.id,
      module: event.object_type,
      summary: event.summary,
      createdAt: event.created_at,
      createdObjectType: event.object_type,
      actorKind: event.actor_kind,
    }));
  } catch {
    return [];
  }
}

/**
 * Gathers the actionable digest shown in the workspace right rail: what's due,
 * what's coming up, what needs the user's review, and recent team/agent activity.
 */
export async function getWorkspaceDigest(
  campaign: DbCampaign,
  profile: DbCampaignProfile | null,
): Promise<WorkspaceDigest> {
  const now = new Date();
  const twoWeeksOut = new Date(now);
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);

  const [
    tasks,
    events,
    reviewAssets,
    pendingComplianceCount,
    plan,
    teamActivity,
    aiActivity,
  ] = await Promise.all([
    listTasks({ campaignId: campaign.id, excludeArchived: true }),
    listCalendarEvents({
      campaignId: campaign.id,
      startAfter: now.toISOString(),
      startBefore: twoWeeksOut.toISOString(),
    }),
    listAssets({ campaignId: campaign.id, status: "needs_review" }),
    countPendingComplianceReviews(campaign.id),
    getLatestFundraisingPlan(campaign.id),
    listRecentTeamActivity(campaign.id, 8),
    listRecentAiActivity(campaign.id, 4),
  ]);

  const dueTasks = tasks
    .filter((task) => OPEN_TASK_STATUSES.has(task.status))
    .sort((a, b) => {
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    })
    .slice(0, 5)
    .map((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      dueDate: task.due_date,
      ownerUserId: task.owner_user_id,
    }));

  const progress = computeFundraisingProgress({
    profileGoal: profile?.fundraising_goal,
    planGoal: plan?.goal_amount,
    raisedAmount: plan?.raised_amount,
  });

  const recentActivity = [...teamActivity, ...aiActivity]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  return {
    dueTasks,
    upcomingEvents: events.slice(0, 4).map((event) => ({
      id: event.id,
      title: event.title,
      eventType: event.event_type,
      startTime: event.start_time,
      location: event.location,
      isMilestone: event.is_milestone,
    })),
    reviewAssets: reviewAssets.slice(0, 4).map((asset) => ({
      id: asset.id,
      title: asset.title,
      assetType: asset.asset_type,
    })),
    pendingComplianceCount,
    recentActivity,
    fundraising: {
      raisedAmount: progress.raisedAmount,
      effectiveGoal: progress.effectiveGoal,
      progressPercent: progress.progressPercent,
    },
  };
}
