import { access } from "node:fs/promises";
import path from "node:path";
import { buildCampaignKnowledgeRoot } from "@/lib/campaign-knowledge/paths";

/** Returns true when the campaign knowledge root already exists on disk. */
export async function campaignKnowledgeExists(input: {
  organizationId: string;
  campaignId: string;
}): Promise<boolean> {
  const root = buildCampaignKnowledgeRoot(input);
  try {
    await access(path.join(process.cwd(), root.rootPath, "index.md"));
    return true;
  } catch {
    return false;
  }
}
