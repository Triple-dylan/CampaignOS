import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCampaignKnowledgeRoot,
  CAMPAIGN_KNOWLEDGE_TEMPLATE_ROOT,
} from "@/lib/campaign-knowledge/paths";
import { getKnowledgeStorage } from "@/lib/campaign-knowledge/storage";
import { appendKnowledgeLog, buildIssueKnowledgePage, writeKnowledgePage } from "@/lib/campaign-knowledge/write";
import { slugifyKnowledgeTitle } from "@/lib/campaign-knowledge/slug";
import type { DbCampaign } from "@/lib/db/schema";
import { campaignDisplayName } from "@/lib/db/schema";

async function walkTemplateFiles(
  templateRoot: string,
  dir = templateRoot,
): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkTemplateFiles(templateRoot, fullPath)));
    } else if (entry.isFile()) {
      files.push(
        path.relative(templateRoot, fullPath).split(path.sep).join("/"),
      );
    }
  }
  return files;
}

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
  const storage = getKnowledgeStorage(root);
  const templateRoot = path.join(process.cwd(), CAMPAIGN_KNOWLEDGE_TEMPLATE_ROOT);

  // Copy the shipped empty template tree into storage without clobbering any
  // page that already exists (mirrors the old `cp --force=false` semantics).
  for (const relativePath of await walkTemplateFiles(templateRoot)) {
    if (await storage.exists(relativePath)) continue;
    const content = await readFile(path.join(templateRoot, relativePath), "utf8");
    await storage.writeFile(relativePath, content);
  }

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
