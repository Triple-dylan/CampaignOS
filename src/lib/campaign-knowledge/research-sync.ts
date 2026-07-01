import {
  appendKnowledgeLog,
  buildResearchBriefKnowledgePage,
  writeKnowledgePage,
} from "@/lib/campaign-knowledge/write";
import { buildCampaignKnowledgeRoot } from "@/lib/campaign-knowledge/paths";
import { syncKnowledgeAfterWrite } from "@/lib/campaign-knowledge/sync-after-write";

export async function writeResearchBriefToCampaignKnowledge(input: {
  organizationId: string;
  campaignId: string;
  briefId: string;
  title: string;
  summary: string;
  body: string;
  researchType: string;
}): Promise<string | null> {
  const root = buildCampaignKnowledgeRoot({
    organizationId: input.organizationId,
    campaignId: input.campaignId,
  });
  const page = buildResearchBriefKnowledgePage({
    title: input.title,
    summary: input.summary,
    body: input.body,
    briefId: input.briefId,
    researchType: input.researchType,
  });

  const relativePath = await writeKnowledgePage({
    root,
    folder: "research",
    slug: page.slug,
    frontmatter: page.frontmatter,
    body: page.body,
  });

  await appendKnowledgeLog({
    root,
    summary: `Research brief synced: ${input.title}`,
    pagesTouched: [relativePath],
  });

  await syncKnowledgeAfterWrite({
    organizationId: input.organizationId,
    campaignId: input.campaignId,
  });

  return relativePath;
}
