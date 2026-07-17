import { recordActivityEvent } from "@/lib/db/activity";
import { claimNextContentVersion } from "@/lib/db/content-versions";
import { appendKnowledgeLog, writeKnowledgePage } from "@/lib/campaign-knowledge/write";
import type { CampaignFolderId, CampaignKnowledgeRoot } from "@/lib/campaign-knowledge/types";

/**
 * Shared write helper: versions a wiki page, writes content, logs activity.
 * Returns conflict when expectedVersion is stale (Phase C soft concurrency).
 */
export async function writeSharedKnowledgePage(input: {
  root: CampaignKnowledgeRoot;
  organizationId: string;
  campaignId: string;
  folder: CampaignFolderId;
  slug: string;
  frontmatter: Record<string, unknown>;
  body: string;
  expectedVersion?: number;
  actorUserId?: string | null;
  agentId?: string | null;
  activitySummary?: string;
}): Promise<
  | { ok: true; path: string; version: number }
  | { ok: false; code: "conflict"; currentVersion: number }
> {
  const objectId = `${input.folder}/${input.slug}.md`;
  const expectedVersion = input.expectedVersion ?? 0;

  const claimed = await claimNextContentVersion({
    campaignId: input.campaignId,
    objectType: "wiki_page",
    objectId,
    expectedVersion,
    content: input.body,
    contentJson: input.frontmatter,
    createdBy: input.actorUserId,
    agentId: input.agentId,
  });

  if (!claimed.ok) {
    return claimed;
  }

  const path = await writeKnowledgePage({
    root: input.root,
    folder: input.folder,
    slug: input.slug,
    frontmatter: {
      ...input.frontmatter,
      content_version: claimed.version,
    },
    body: input.body,
  });

  await appendKnowledgeLog({
    root: input.root,
    summary: input.activitySummary ?? `Updated ${objectId}`,
    pagesTouched: [path],
    actor: input.agentId ?? input.actorUserId ?? "human",
  });

  await recordActivityEvent({
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    actorKind: input.agentId ? "agent" : "user",
    actorUserId: input.actorUserId,
    agentId: input.agentId,
    action: "wiki.updated",
    objectType: "wiki_page",
    objectId,
    summary: input.activitySummary ?? `Updated ${objectId}`,
    metadata: { path, version: claimed.version },
  });

  return { ok: true, path, version: claimed.version };
}
