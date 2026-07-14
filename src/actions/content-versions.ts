"use server";

import { requireCampaignContext } from "@/lib/auth/require-campaign-context";
import { canWriteModule } from "@/lib/auth/permissions";
import {
  claimNextContentVersion,
  getLatestContentVersion,
  listContentVersions,
} from "@/lib/db/content-versions";
import type { DbContentVersion } from "@/lib/db/schema";

/**
 * Phase C foundation: optimistic concurrency without CRDT.
 * Callers pass expectedVersion; conflicts return the current version so UI can reload.
 */
export async function saveVersionedContent(input: {
  objectType: string;
  objectId: string;
  expectedVersion: number;
  content?: string | null;
  contentJson?: Record<string, unknown> | null;
  agentId?: string | null;
}): Promise<
  | { ok: true; version: number }
  | { ok: false; code: "conflict" | "forbidden" | "error"; currentVersion?: number; error?: string }
> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, code: "error", error: context.error };
  }
  if (!context.role || !canWriteModule(context.role, "knowledge")) {
    return { ok: false, code: "forbidden", error: "No write access." };
  }

  const claimed = await claimNextContentVersion({
    campaignId: context.campaign.id,
    objectType: input.objectType,
    objectId: input.objectId,
    expectedVersion: input.expectedVersion,
    content: input.content,
    contentJson: input.contentJson,
    createdBy: context.dbUserId,
    agentId: input.agentId,
  });

  if (!claimed.ok) {
    return {
      ok: false,
      code: "conflict",
      currentVersion: claimed.currentVersion,
      error: `Content changed (now at v${claimed.currentVersion}). Reload and retry.`,
    };
  }

  return { ok: true, version: claimed.version };
}

export async function getContentVersionHistory(input: {
  objectType: string;
  objectId: string;
}): Promise<{
  ok: boolean;
  latest: DbContentVersion | null;
  versions: DbContentVersion[];
  error?: string;
}> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, latest: null, versions: [], error: context.error };
  }

  try {
    const [latest, versions] = await Promise.all([
      getLatestContentVersion(
        context.campaign.id,
        input.objectType,
        input.objectId,
      ),
      listContentVersions(
        context.campaign.id,
        input.objectType,
        input.objectId,
      ),
    ]);
    return { ok: true, latest, versions };
  } catch (error) {
    console.error("[content-versions] history failed", error);
    return { ok: false, latest: null, versions: [], error: "Could not load history." };
  }
}
