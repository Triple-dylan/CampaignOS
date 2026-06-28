import type { ContextChunk } from "@/lib/harness/types";

export type ListCampaignContextInput = {
  campaignId: string;
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

  return {
    campaignId: input.campaignId,
    chunkCount: input.contextChunks.length,
    skillMatchCount: skillChunks.length,
    chunks: input.contextChunks.map((chunk) => ({
      id: chunk.id,
      kind: chunk.kind,
      title: chunk.title,
      source: chunk.source,
      priority: chunk.priority,
    })),
  };
}
