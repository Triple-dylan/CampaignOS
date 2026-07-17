"use server";

import { requireCampaignContext } from "@/lib/auth/require-campaign-context";
import { getOrganizationMembersWithUsers } from "@/lib/db/members";
import {
  clearPresenceSession,
  listActivePresence,
  upsertPresenceSession,
} from "@/lib/db/presence";
import type { PresenceAction } from "@/lib/db/schema";
import { listActivityEvents } from "@/lib/db/activity";
import { listUnresolvedThreadObjectIds } from "@/lib/db/comments";

export type PresencePeer = {
  userId: string;
  displayName: string;
  imageUrl: string | null;
  module: string | null;
  objectType: string | null;
  objectId: string | null;
  action: PresenceAction;
  lastSeenAt: string;
  isSelf: boolean;
};

export async function heartbeatPresence(input: {
  module?: string | null;
  objectType?: string | null;
  objectId?: string | null;
  action?: PresenceAction;
}): Promise<{ ok: boolean; peers: PresencePeer[]; error?: string }> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, peers: [], error: context.error };
  }
  if (!context.dbUserId) {
    return { ok: true, peers: [] };
  }

  try {
    await upsertPresenceSession({
      campaignId: context.campaign.id,
      userId: context.dbUserId,
      module: input.module,
      objectType: input.objectType,
      objectId: input.objectId,
      action: input.action ?? "viewing",
    });

    const [sessions, members] = await Promise.all([
      listActivePresence(context.campaign.id),
      getOrganizationMembersWithUsers(context.campaign.organization_id),
    ]);

    const byUser = new Map(
      members.map((member) => [member.user_id, member] as const),
    );

    const peers: PresencePeer[] = sessions.map((session) => {
      const member = byUser.get(session.user_id);
      const firstName = member?.user?.first_name;
      const lastName = member?.user?.last_name;
      const email = member?.user?.email;
      const displayName =
        [firstName, lastName].filter(Boolean).join(" ").trim() ||
        email ||
        "Teammate";
      return {
        userId: session.user_id,
        displayName,
        imageUrl: member?.user?.image_url ?? null,
        module: session.module,
        objectType: session.object_type,
        objectId: session.object_id,
        action: session.action,
        lastSeenAt: session.last_seen_at,
        isSelf: session.user_id === context.dbUserId,
      };
    });

    return { ok: true, peers };
  } catch (error) {
    console.error("[presence] heartbeat failed", error);
    return { ok: false, peers: [], error: "Presence unavailable." };
  }
}

export async function leavePresence(): Promise<{ ok: boolean }> {
  const context = await requireCampaignContext();
  if (!context.ok || !context.dbUserId) {
    return { ok: true };
  }
  try {
    await clearPresenceSession({
      campaignId: context.campaign.id,
      userId: context.dbUserId,
    });
  } catch (error) {
    console.error("[presence] leave failed", error);
  }
  return { ok: true };
}

export async function getFocusRoomSnapshot(input?: {
  objectType?: string;
  objectId?: string;
}): Promise<{
  ok: boolean;
  peers: PresencePeer[];
  recentActivity: Array<{ id: string; summary: string; createdAt: string }>;
  openThreadIds: string[];
  error?: string;
}> {
  const presence = await heartbeatPresence({
    objectType: input?.objectType,
    objectId: input?.objectId,
  });
  if (!presence.ok) {
    return {
      ok: false,
      peers: [],
      recentActivity: [],
      openThreadIds: [],
      error: presence.error,
    };
  }

  const context = await requireCampaignContext();
  if (!context.ok) {
    return {
      ok: false,
      peers: presence.peers,
      recentActivity: [],
      openThreadIds: [],
      error: context.error,
    };
  }

  const [events, threads] = await Promise.all([
    listActivityEvents(context.campaign.id, {
      limit: 12,
      objectType: input?.objectType,
      objectId: input?.objectId,
    }),
    listUnresolvedThreadObjectIds(context.campaign.id, input?.objectType),
  ]);

  return {
    ok: true,
    peers: presence.peers,
    recentActivity: events.map((event) => ({
      id: event.id,
      summary: event.summary,
      createdAt: event.created_at,
    })),
    openThreadIds: threads
      .filter((thread) =>
        input?.objectId ? thread.object_id === input.objectId : true,
      )
      .map((thread) => thread.id),
  };
}
