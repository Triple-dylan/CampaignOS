import { buildCampaignKnowledgeRoot } from "@/lib/campaign-knowledge/paths";
import { getKnowledgeStorage } from "@/lib/campaign-knowledge/storage";

export async function readCampaignKnowledgeIndex(input: {
  organizationId: string;
  campaignId: string;
}): Promise<string | null> {
  const root = buildCampaignKnowledgeRoot(input);
  return getKnowledgeStorage(root).readFile("index.md");
}

export async function readCampaignKnowledgeContext(input: {
  organizationId: string;
  campaignId: string;
  folder: string;
}): Promise<string | null> {
  const root = buildCampaignKnowledgeRoot({
    organizationId: input.organizationId,
    campaignId: input.campaignId,
  });
  return getKnowledgeStorage(root).readFile(`${input.folder}/_context.md`);
}
