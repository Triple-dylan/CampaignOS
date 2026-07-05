import {
  readCampaignKnowledgeContext,
  readCampaignKnowledgeIndex,
} from "@/lib/campaign-knowledge/read";
import type { ContextChunk } from "@/lib/harness/types";

export type ListCampaignContextInput = {
  campaignId: string;
  organizationId?: string;
  contextChunks: ContextChunk[];
  /** Wiki-llm paths relative to the campaign knowledge root. */
  contextPaths?: string[];
};

export type ListCampaignContextOutput = {
  campaignId: string;
  chunkCount: number;
  skillMatchCount: number;
  chunks: Array<{
    id: string;
    kind: ContextChunk["kind"];
    title: string;
    source: string;
    priority: number;
    bodyPreview?: string;
  }>;
};

function stripFrontmatter(raw: string): string {
  return raw.replace(/^---[\s\S]*?---\r?\n/, "").trim();
}

/**
 * Deterministic lookup: summarize resolver context and hydrate index + folder
 * _context.md bodies from the live campaign knowledge tree when available.
 */
export async function listCampaignContext(
  input: ListCampaignContextInput,
): Promise<ListCampaignContextOutput> {
  const skillChunks = input.contextChunks.filter((c) => c.kind === "skill");
  const chunks: ListCampaignContextOutput["chunks"] = input.contextChunks.map(
    (chunk) => ({
      id: chunk.id,
      kind: chunk.kind,
      title: chunk.title,
      source: chunk.source,
      priority: chunk.priority,
    }),
  );

  if (input.organizationId) {
    const index = await readCampaignKnowledgeIndex({
      organizationId: input.organizationId,
      campaignId: input.campaignId,
    });
    if (index) {
      chunks.unshift({
        id: "ctx-knowledge-index",
        kind: "module-doc",
        title: "Campaign knowledge index",
        source: "index.md",
        priority: 100,
        bodyPreview: index.slice(0, 1200),
      });
    }

    for (const contextPath of input.contextPaths ?? []) {
      const folderMatch = contextPath.match(/^([a-z-]+)\/_context\.md$/);
      if (!folderMatch) continue;
      const folder = folderMatch[1];
      const body = await readCampaignKnowledgeContext({
        organizationId: input.organizationId,
        campaignId: input.campaignId,
        folder,
      });
      if (!body) continue;
      chunks.unshift({
        id: `ctx-folder-${folder}`,
        kind: "module-doc",
        title: `${folder} folder context`,
        source: contextPath,
        priority: 95,
        bodyPreview: stripFrontmatter(body).slice(0, 800),
      });
    }
  }

  return {
    campaignId: input.campaignId,
    chunkCount: chunks.length,
    skillMatchCount: skillChunks.length,
    chunks,
  };
}
