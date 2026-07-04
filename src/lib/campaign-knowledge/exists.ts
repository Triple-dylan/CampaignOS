import { buildCampaignKnowledgeRoot } from "@/lib/campaign-knowledge/paths";
import { getKnowledgeStorage } from "@/lib/campaign-knowledge/storage";

/** Returns true when the campaign knowledge root already exists in storage. */
export async function campaignKnowledgeExists(input: {
  organizationId: string;
  campaignId: string;
}): Promise<boolean> {
  const root = buildCampaignKnowledgeRoot(input);
  return getKnowledgeStorage(root).exists("index.md");
}
