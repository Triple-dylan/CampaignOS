import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import { FOLDER_CLUSTER_ORDER } from "@/lib/graph/folder-clusters";
import type { CampaignGraphNodeData } from "@/lib/graph/to-react-flow";

export type KnowledgeGraphNodeKind = "folder_hub" | "document" | "entity";

function isCampaignFolderId(value: unknown): value is CampaignFolderId {
  return (
    typeof value === "string" &&
    FOLDER_CLUSTER_ORDER.includes(value as CampaignFolderId)
  );
}

/** Parse wiki-llm metadata flags from a graph node's `metadata_json`. */
export function parseKnowledgeMetadata(
  metadata: Record<string, unknown> | null | undefined,
): {
  folder: CampaignFolderId | null;
  isFolderHub: boolean;
  knowledgePath: string | null;
  knowledgeKind: KnowledgeGraphNodeKind | null;
} {
  if (!metadata) {
    return {
      folder: null,
      isFolderHub: false,
      knowledgePath: null,
      knowledgeKind: null,
    };
  }

  const folder = isCampaignFolderId(metadata.folder) ? metadata.folder : null;
  const isFolderHub = metadata.cluster === true;
  const knowledgePath =
    typeof metadata.path === "string" ? metadata.path : null;

  let knowledgeKind: KnowledgeGraphNodeKind | null = null;
  if (typeof metadata.knowledgeKind === "string") {
    knowledgeKind = metadata.knowledgeKind as KnowledgeGraphNodeKind;
  } else if (isFolderHub) {
    knowledgeKind = "folder_hub";
  } else if (knowledgePath) {
    knowledgeKind = "document";
  }

  return { folder, isFolderHub, knowledgePath, knowledgeKind };
}

export function enrichGraphNodeData(
  data: Omit<
    CampaignGraphNodeData,
    "folder" | "isFolderHub" | "knowledgePath" | "knowledgeKind"
  >,
): CampaignGraphNodeData {
  const parsed = parseKnowledgeMetadata(data.metadata);
  return { ...data, ...parsed };
}

/** Tooltip line: `messaging/public-safety-framework.md · document` */
export function graphNodeTooltip(data: CampaignGraphNodeData): string {
  const parts: string[] = [];
  if (data.folder) {
    parts.push(
      data.knowledgePath ?? `${data.folder}/`,
    );
  }
  const kind = data.isFolderHub
    ? "folder hub"
    : (data.knowledgeKind ?? data.nodeType);
  parts.push(String(kind));
  return parts.join(" · ");
}
