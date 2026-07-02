import {
  appendKnowledgeLog,
  buildAssetKnowledgePage,
  writeKnowledgePage,
} from "@/lib/campaign-knowledge/write";
import { buildCampaignKnowledgeRoot } from "@/lib/campaign-knowledge/paths";
import { syncKnowledgeAfterWrite } from "@/lib/campaign-knowledge/sync-after-write";
import { resolveAssetKnowledgeFolder } from "@/lib/graph/folder-routing";
import type { DbAsset } from "@/lib/db/schema";

export async function writeAssetToCampaignKnowledge(input: {
  organizationId: string;
  campaignId: string;
  asset: DbAsset;
  status: "draft" | "approved";
}): Promise<string | null> {
  const root = buildCampaignKnowledgeRoot({
    organizationId: input.organizationId,
    campaignId: input.campaignId,
  });
  const folder = resolveAssetKnowledgeFolder({
    assetType: input.asset.asset_type,
    channel: input.asset.channel,
  });
  const page = buildAssetKnowledgePage({
    title: input.asset.title,
    contentText: input.asset.content_text ?? "",
    assetType: input.asset.asset_type,
    channel: input.asset.channel,
    theme: input.asset.theme,
    issue: input.asset.issue,
    status: input.status,
    assetId: input.asset.id,
    folder,
  });

  const relativePath = await writeKnowledgePage({
    root,
    folder,
    slug: page.slug,
    frontmatter: page.frontmatter,
    body: page.body,
  });

  await appendKnowledgeLog({
    root,
    summary: `${input.status} asset synced to knowledge: ${input.asset.title}`,
    pagesTouched: [relativePath],
  });

  await syncKnowledgeAfterWrite({
    organizationId: input.organizationId,
    campaignId: input.campaignId,
  });

  return relativePath;
}
