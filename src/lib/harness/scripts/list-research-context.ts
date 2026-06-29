import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { CAMPAIGN_KNOWLEDGE_TEMPLATE_ROOT } from "@/lib/campaign-knowledge/paths";

export type ListResearchContextInput = {
  campaignId: string;
  /** Override research folder path (defaults to templates/research). */
  researchPath?: string;
};

export type ResearchContextEntry = {
  path: string;
  filename: string;
  title: string;
  summary: string;
  kind: "readme" | "context" | "document" | "meta";
};

export type ListResearchContextOutput = {
  campaignId: string;
  folder: string;
  entryCount: number;
  entries: ResearchContextEntry[];
  contextBody?: string;
};

const FRONTMATTER_TITLE_RE = /^title:\s*["']?([^"'\n]+)["']?/m;
const FRONTMATTER_SUMMARY_RE = /^summary:\s*["']?([^"'\n]+)["']?/m;

function classifyFile(filename: string): ResearchContextEntry["kind"] {
  if (filename === "README.md") return "readme";
  if (filename === "_context.md") return "context";
  if (filename === "index.md" || filename === "log.md") return "meta";
  return "document";
}

function extractFromFrontmatter(raw: string): { title: string; summary: string } {
  const title = raw.match(FRONTMATTER_TITLE_RE)?.[1]?.trim();
  const summary = raw.match(FRONTMATTER_SUMMARY_RE)?.[1]?.trim();
  return {
    title: title ?? "Untitled",
    summary: summary ?? "",
  };
}

/**
 * Load research/ folder context for the research-brief skill.
 * Wiki-llm pattern: index-first, then _context.md body for agent grounding.
 */
export async function listResearchContext(
  input: ListResearchContextInput,
): Promise<ListResearchContextOutput> {
  const folder = path.join(
    process.cwd(),
    input.researchPath ?? `${CAMPAIGN_KNOWLEDGE_TEMPLATE_ROOT}/research`,
  );

  const entries: ResearchContextEntry[] = [];
  let contextBody: string | undefined;

  try {
    const files = await readdir(folder);
    for (const filename of files.sort()) {
      if (!filename.endsWith(".md")) continue;

      const filePath = path.join(folder, filename);
      const raw = await readFile(filePath, "utf8");
      const { title, summary } = extractFromFrontmatter(raw);
      const kind = classifyFile(filename);

      if (kind === "context") {
        contextBody = raw.replace(/^---[\s\S]*?---\r?\n/, "").trim();
      }

      entries.push({
        path: `research/${filename}`,
        filename,
        title: kind === "readme" ? "Research folder README" : title,
        summary:
          summary ||
          (kind === "context"
            ? "Folder context for research queries"
            : "Research knowledge page"),
        kind,
      });
    }
  } catch {
    entries.push({
      path: "research/README.md",
      filename: "README.md",
      title: "Research",
      summary: "Opposition research, district intel, and issue briefs.",
      kind: "readme",
    });
  }

  return {
    campaignId: input.campaignId,
    folder: "research",
    entryCount: entries.length,
    entries,
    contextBody,
  };
}
