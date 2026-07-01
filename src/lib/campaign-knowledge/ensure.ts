import {
  bootstrapCampaignKnowledge,
  type BootstrapCampaignKnowledgeInput,
} from "@/lib/campaign-knowledge/bootstrap";
import { campaignKnowledgeExists } from "@/lib/campaign-knowledge/exists";
import { buildCampaignKnowledgeRoot } from "@/lib/campaign-knowledge/paths";

export type { BootstrapCampaignKnowledgeInput };

export async function ensureCampaignKnowledgeBootstrapped(
  input: BootstrapCampaignKnowledgeInput,
): Promise<{ rootPath: string; bootstrapped: boolean }> {
  const exists = await campaignKnowledgeExists({
    organizationId: input.organizationId,
    campaignId: input.campaignId,
  });

  if (exists) {
    return {
      rootPath: buildCampaignKnowledgeRoot({
        organizationId: input.organizationId,
        campaignId: input.campaignId,
      }).rootPath,
      bootstrapped: false,
    };
  }

  const result = await bootstrapCampaignKnowledge(input);
  const { syncKnowledgeAfterWrite } = await import(
    "@/lib/campaign-knowledge/sync-after-write"
  );
  await syncKnowledgeAfterWrite({
    organizationId: input.organizationId,
    campaignId: input.campaignId,
  });
  return result;
}
