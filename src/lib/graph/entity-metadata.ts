import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import type { KnowledgeGraphNodeKind } from "@/lib/graph/node-metadata";

export function buildEntityGraphMetadata(input: {
  folder: CampaignFolderId;
  path?: string;
  source: string;
  knowledgeKind?: KnowledgeGraphNodeKind;
  extra?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    source: input.source,
    folder: input.folder,
    ...(input.path ? { path: input.path } : {}),
    knowledgeKind: input.knowledgeKind ?? "entity",
    ...input.extra,
  };
}
