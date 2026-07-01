import { buildCampaignKnowledgeRoot } from "@/lib/campaign-knowledge/paths";
import { syncCampaignKnowledgeToGraph } from "@/lib/campaign-knowledge/sync-to-graph";

export async function syncKnowledgeAfterWrite(input: {
  organizationId: string;
  campaignId: string;
}): Promise<void> {
  const root = buildCampaignKnowledgeRoot(input);
  await syncCampaignKnowledgeToGraph({
    campaignId: input.campaignId,
    root,
  });
}
