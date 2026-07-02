import { rebuildKnowledgeIndex } from "@/lib/campaign-knowledge/index-maintenance";
import { buildCampaignKnowledgeRoot } from "@/lib/campaign-knowledge/paths";
import { syncCampaignKnowledgeToGraph } from "@/lib/campaign-knowledge/sync-to-graph";
import { seedFolderHubsForCampaign } from "@/lib/db/graph";

export async function syncKnowledgeAfterWrite(input: {
  organizationId: string;
  campaignId: string;
}): Promise<void> {
  const root = buildCampaignKnowledgeRoot(input);
  await rebuildKnowledgeIndex(root);
  await syncCampaignKnowledgeToGraph({
    campaignId: input.campaignId,
    root,
  });
  await seedFolderHubsForCampaign(input.campaignId);
}
