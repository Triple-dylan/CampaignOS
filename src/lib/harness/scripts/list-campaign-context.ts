import { readCampaignKnowledgeIndex } from "@/lib/campaign-knowledge/read";
import type { ContextChunk } from "@/lib/harness/types";

export type ListCampaignContextInput = {
  campaignId: string;
  organizationId?: string;
  contextChunks: ContextChunk[];
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
  }>;
};

/**
 * Stub deterministic lookup: summarize what the resolver would load.
 * Future: hydrate campaign-profile and graph-summary chunks from Supabase.
 */
export async function listCampaignContext(
  input: ListCampaignContextInput,
): Promise<ListCampaignContextOutput> {
  const skillChunks = input.contextChunks.filter((c) => c.kind === "skill");
  const chunks = input.contextChunks.map((chunk) => ({
    id: chunk.id,
    kind: chunk.kind,
    title: chunk.title,
    source: chunk.source,
    priority: chunk.priority,
  }));

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
        source: "campaign-knowledge/index.md",
        priority: 100,
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
