import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CampaignFolderId, CampaignKnowledgeRoot } from "@/lib/campaign-knowledge/types";
import { slugifyKnowledgeTitle } from "@/lib/campaign-knowledge/slug";

export type KnowledgePageInput = {
  root: CampaignKnowledgeRoot;
  folder: CampaignFolderId;
  slug: string;
  frontmatter: Record<string, unknown>;
  body: string;
};

function serializeFrontmatter(data: Record<string, unknown>): string {
  const lines = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        if (typeof item === "object" && item !== null) {
          lines.push(`  - path: ${(item as { path?: string }).path ?? ""}`);
          const rel = (item as { relationship?: string }).relationship;
          if (rel) lines.push(`    relationship: ${rel}`);
        } else {
          lines.push(`  - ${JSON.stringify(item)}`);
        }
      }
    } else if (typeof value === "string") {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    } else {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    }
  }
  lines.push("---", "");
  return lines.join("\n");
}

export async function writeKnowledgePage(input: KnowledgePageInput): Promise<string> {
  const relativePath = `${input.folder}/${input.slug}.md`;
  const absolutePath = path.join(process.cwd(), input.root.rootPath, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });

  const content = `${serializeFrontmatter(input.frontmatter)}${input.body.trim()}\n`;
  await writeFile(absolutePath, content, "utf8");
  return relativePath;
}

export async function appendKnowledgeLog(input: {
  root: CampaignKnowledgeRoot;
  summary: string;
  pagesTouched: string[];
  actor?: string;
}): Promise<void> {
  const logPath = path.join(process.cwd(), input.root.rootPath, "log.md");
  const date = new Date().toISOString().slice(0, 10);
  const entry = [
    "",
    `## [${date}] sync | ${input.summary}`,
    "",
    `- **Actor:** ${input.actor ?? "agent"}`,
    `- **Summary:** ${input.summary}`,
    `- **Pages touched:** ${input.pagesTouched.join(", ") || "—"}`,
    "",
  ].join("\n");

  let existing = "";
  try {
    existing = await readFile(logPath, "utf8");
  } catch {
    existing = "---\ntitle: Campaign knowledge log\ntype: log\n---\n\n# Log\n";
  }

  await writeFile(logPath, `${existing.trimEnd()}${entry}`, "utf8");
}

export function buildAssetKnowledgePage(input: {
  title: string;
  contentText: string;
  assetType: string;
  channel?: string | null;
  theme?: string | null;
  issue?: string | null;
  status: string;
  assetId: string;
  folder: CampaignFolderId;
}): { slug: string; frontmatter: Record<string, unknown>; body: string } {
  const slug = slugifyKnowledgeTitle(input.title) || `asset-${input.assetId.slice(0, 8)}`;
  return {
    slug,
    frontmatter: {
      title: input.title,
      node_type: "asset",
      summary: `${input.assetType} asset (${input.status})`,
      folder: input.folder,
      status: input.status,
      source_object_type: "asset",
      source_object_id: input.assetId,
      ...(input.channel ? { channel: input.channel } : {}),
      ...(input.theme ? { theme: input.theme } : {}),
      ...(input.issue ? { issue: input.issue } : {}),
    },
    body: [
      `# ${input.title}`,
      "",
      input.contentText,
      "",
      `_Synced from Asset Studio._`,
    ].join("\n"),
  };
}

export function buildContentCalendarKnowledgePage(input: {
  calendarTitle: string;
  summary: string;
  slotPaths: string[];
}): { slug: string; frontmatter: Record<string, unknown>; body: string } {
  const slug = slugifyKnowledgeTitle(input.calendarTitle) || "content-calendar";
  return {
    slug,
    frontmatter: {
      title: input.calendarTitle,
      node_type: "message_theme",
      summary: input.summary,
      folder: "social-media",
      status: "draft",
      related: input.slotPaths.map((slotPath) => ({
        path: slotPath,
        relationship: "connected_to",
      })),
    },
    body: [
      `# ${input.calendarTitle}`,
      "",
      input.summary,
      "",
      "## Content beats",
      "",
      ...input.slotPaths.map((p) => `- [[${p.replace(/\.md$/, "")}]]`),
      "",
      `_Synced from Planner content calendar workflow._`,
    ].join("\n"),
  };
}

export function buildResearchBriefKnowledgePage(input: {
  title: string;
  summary: string;
  body: string;
  briefId: string;
  researchType: string;
}): { slug: string; frontmatter: Record<string, unknown>; body: string } {
  const slug = slugifyKnowledgeTitle(input.title) || `brief-${input.briefId.slice(0, 8)}`;
  return {
    slug,
    frontmatter: {
      title: input.title,
      node_type: "research",
      summary: input.summary,
      folder: "research",
      status: "draft",
      source_object_type: "research_brief",
      source_object_id: input.briefId,
      research_type: input.researchType,
    },
    body: [`# ${input.title}`, "", input.body.trim()].join("\n"),
  };
}

export function buildIssueKnowledgePage(input: {
  issue: string;
  summary?: string;
}): { slug: string; frontmatter: Record<string, unknown>; body: string } {
  const slug = slugifyKnowledgeTitle(input.issue);
  return {
    slug,
    frontmatter: {
      title: input.issue,
      node_type: "issue",
      summary: input.summary ?? "Campaign issue",
      folder: "messaging",
      status: "verified",
    },
    body: [`# ${input.issue}`, "", input.summary ?? "_Top campaign issue._"].join("\n"),
  };
}
