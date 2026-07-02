import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildCampaignKnowledgeRoot } from "@/lib/campaign-knowledge/paths";

export async function readCampaignKnowledgeIndex(input: {
  organizationId: string;
  campaignId: string;
}): Promise<string | null> {
  const root = buildCampaignKnowledgeRoot(input);
  const indexPath = path.join(process.cwd(), root.rootPath, "index.md");
  try {
    return await readFile(indexPath, "utf8");
  } catch {
    return null;
  }
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
  const contextPath = path.join(
    process.cwd(),
    root.rootPath,
    input.folder,
    "_context.md",
  );
  try {
    return await readFile(contextPath, "utf8");
  } catch {
    return null;
  }
}
