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
  isCampaignCenter: boolean;
  electionCountdown: string | null;
  knowledgePath: string | null;
  knowledgeKind: KnowledgeGraphNodeKind | null;
} {
  if (!metadata) {
    return {
      folder: null,
      isFolderHub: false,
      isCampaignCenter: false,
      electionCountdown: null,
      knowledgePath: null,
      knowledgeKind: null,
    };
  }

  const folder = isCampaignFolderId(metadata.folder) ? metadata.folder : null;
  const isFolderHub = metadata.cluster === true;
  const knowledgePath =
    typeof metadata.path === "string"
      ? metadata.path
      : typeof metadata.knowledgePath === "string"
        ? metadata.knowledgePath
        : null;

  let knowledgeKind: KnowledgeGraphNodeKind | null = null;
  if (typeof metadata.knowledgeKind === "string") {
    knowledgeKind = metadata.knowledgeKind as KnowledgeGraphNodeKind;
  } else if (isFolderHub) {
    knowledgeKind = "folder_hub";
  } else if (knowledgePath) {
    knowledgeKind = "document";
  }

  const isCampaignCenter = metadata.campaignCenter === true;
  const electionCountdown =
    typeof metadata.electionCountdown === "string"
      ? metadata.electionCountdown
      : null;

  return {
    folder,
    isFolderHub,
    isCampaignCenter,
    electionCountdown,
    knowledgePath,
    knowledgeKind,
  };
}

export function enrichGraphNodeData(
  data: Omit<
    CampaignGraphNodeData,
    | "folder"
    | "isFolderHub"
    | "isCampaignCenter"
    | "electionCountdown"
    | "knowledgePath"
    | "knowledgeKind"
  >,
): CampaignGraphNodeData {
  const parsed = parseKnowledgeMetadata(data.metadata);
  return { ...data, ...parsed };
}

/** Tooltip line: `messaging/public-safety-framework.md · document` */
export function graphNodeTooltip(data: CampaignGraphNodeData): string {
  if (data.isCampaignCenter) {
    const parts = [data.title];
    if (data.electionCountdown) parts.push(data.electionCountdown);
    return parts.join(" · ");
  }
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
