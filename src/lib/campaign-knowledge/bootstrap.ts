import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  buildCampaignKnowledgeRoot,
  CAMPAIGN_KNOWLEDGE_TEMPLATE_ROOT,
} from "@/lib/campaign-knowledge/paths";
import { appendKnowledgeLog, buildIssueKnowledgePage, writeKnowledgePage } from "@/lib/campaign-knowledge/write";
import { slugifyKnowledgeTitle } from "@/lib/campaign-knowledge/slug";
import type { DbCampaign } from "@/lib/db/schema";
import { campaignDisplayName } from "@/lib/db/schema";

export type BootstrapCampaignKnowledgeInput = {
  organizationId: string;
  campaignId: string;
  campaign: DbCampaign;
  topIssues: string[];
  voterSegments: Array<{ name: string; description?: string }>;
};

export async function bootstrapCampaignKnowledge(
  input: BootstrapCampaignKnowledgeInput,
): Promise<{ rootPath: string; bootstrapped: boolean }> {
  const root = buildCampaignKnowledgeRoot({
    organizationId: input.organizationId,
    campaignId: input.campaignId,
  });
  const absoluteRoot = path.join(process.cwd(), root.rootPath);
  const templateRoot = path.join(process.cwd(), CAMPAIGN_KNOWLEDGE_TEMPLATE_ROOT);

  await mkdir(absoluteRoot, { recursive: true });
  await cp(templateRoot, absoluteRoot, { recursive: true, force: false });

  const profileBody = [
    `# ${campaignDisplayName(input.campaign)}`,
    "",
    input.campaign.office_sought
      ? `**Office:** ${input.campaign.office_sought}`
      : "",
    input.campaign.jurisdiction
      ? `**Jurisdiction:** ${input.campaign.jurisdiction}`
      : "",
    input.campaign.election_date
      ? `**Election date:** ${input.campaign.election_date}`
      : "",
    "",
    "_Seeded from onboarding._",
  ]
    .filter(Boolean)
    .join("\n");

  await writeKnowledgePage({
    root,
    folder: "campaign",
    slug: "profile",
    frontmatter: {
      title: campaignDisplayName(input.campaign),
      node_type: "candidate",
      summary: "Campaign profile seeded from onboarding",
      folder: "campaign",
      source_object_type: "campaign",
      source_object_id: input.campaignId,
      status: "verified",
    },
    body: profileBody,
  });

  const pagesTouched = ["campaign/profile.md"];

  for (const issue of input.topIssues) {
    const page = buildIssueKnowledgePage({ issue });
    await writeKnowledgePage({
      root,
      folder: "messaging",
      slug: page.slug,
      frontmatter: page.frontmatter,
      body: page.body,
    });
    pagesTouched.push(`messaging/${page.slug}.md`);
  }

  for (const segment of input.voterSegments) {
    const slug = slugifyKnowledgeTitle(segment.name);
    if (!slug) continue;
    await writeKnowledgePage({
      root,
      folder: "people",
      slug,
      frontmatter: {
        title: segment.name,
        node_type: "voter_segment",
        summary: segment.description ?? "Voter segment from onboarding",
        folder: "people",
        status: "verified",
      },
      body: [`# ${segment.name}`, "", segment.description ?? "_Voter segment._"].join(
        "\n",
      ),
    });
    pagesTouched.push(`people/${slug}.md`);
  }

  await appendKnowledgeLog({
    root,
    summary: "Bootstrap campaign knowledge tree from onboarding",
    pagesTouched,
    actor: "system",
  });

  return { rootPath: root.rootPath, bootstrapped: true };
}
