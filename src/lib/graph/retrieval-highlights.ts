import { CAMPAIGN_FOLDER_IDS } from "@/lib/campaign-knowledge/folders";
import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import type { DbGraphNode } from "@/lib/db/schema";
import { folderForNode } from "@/lib/graph/folder-clusters";
import type { CampaignGraphNodeData } from "@/lib/graph/to-react-flow";

function isCampaignFolderId(value: string): value is CampaignFolderId {
  return CAMPAIGN_FOLDER_IDS.includes(value as CampaignFolderId);
}

/** Parse a resolver `contextPaths` entry into a campaign-knowledge folder id. */
export function folderFromContextPath(contextPath: string): CampaignFolderId | null {
  // Runtime knowledge root: campaign/_context.md
  const relativeMatch = contextPath.match(/^([a-z-]+)\/_context\.md$/);
  if (relativeMatch) {
    const slug = relativeMatch[1];
    if (isCampaignFolderId(slug)) return slug;
  }

  // Shipped template / legacy paths
  const match = contextPath.match(
    /(?:campaign-knowledge\/(?:templates|wiki)|wiki)\/([^/]+)/,
  );
  if (!match) return null;
  const slug = match[1];
  if (isCampaignFolderId(slug)) return slug;
  return null;
}

function isMetaKnowledgePath(path: string): boolean {
  const filename = path.split("/").pop() ?? path;
  return (
    filename === "README.md" ||
    filename === "_context.md" ||
    filename === "index.md" ||
    filename === "log.md"
  );
}

function isHubNode(node: DbGraphNode): boolean {
  return node.metadata_json?.cluster === true;
}

/**
 * Resolve specific graph node ids from harness resolver output — context paths
 * and focus folders — instead of lighting up every member of a cluster.
 */
export function resolveRetrievalNodeIds(input: {
  nodes: DbGraphNode[];
  contextPaths: string[];
  graphFolders: CampaignFolderId[];
  focusNodeId?: string;
  /** Cap per-folder picks so dense campaigns stay readable. */
  maxPerFolder?: number;
}): string[] {
  const maxPerFolder = input.maxPerFolder ?? 8;
  const ids = new Set<string>();

  if (input.focusNodeId) {
    const focus = input.nodes.find((node) => node.id === input.focusNodeId);
    if (focus) ids.add(focus.id);
  }

  const foldersFromPaths = input.contextPaths
    .map(folderFromContextPath)
    .filter((folder): folder is CampaignFolderId => folder !== null);
  const targetFolders = new Set<CampaignFolderId>([
    ...input.graphFolders,
    ...foldersFromPaths,
  ]);

  const byFolder = new Map<CampaignFolderId, DbGraphNode[]>();
  for (const node of input.nodes) {
    if (isHubNode(node)) continue;
    const folder = folderForNode({
      nodeType: node.node_type,
      metadata: node.metadata_json,
    });
    if (!targetFolders.has(folder)) continue;
    const bucket = byFolder.get(folder) ?? [];
    bucket.push(node);
    byFolder.set(folder, bucket);
  }

  for (const folder of targetFolders) {
    const members = byFolder.get(folder) ?? [];
    if (members.length === 0) continue;

    const pathMatched = members.filter((node) => {
      const path = node.metadata_json?.path;
      if (typeof path !== "string" || isMetaKnowledgePath(path)) return false;
      return foldersFromPaths.includes(folder);
    });

    const documentLike = members.filter((node) => {
      const kind = node.metadata_json?.knowledgeKind;
      const path = node.metadata_json?.path;
      return kind === "document" || (typeof path === "string" && !isMetaKnowledgePath(path));
    });

    const pool =
      pathMatched.length > 0
        ? pathMatched
        : documentLike.length > 0
          ? documentLike
          : members;

    pool
      .slice()
      .sort((a, b) => scoreRetrievalCandidate(b) - scoreRetrievalCandidate(a))
      .slice(0, maxPerFolder)
      .forEach((node) => ids.add(node.id));
  }

  return [...ids];
}

function scoreRetrievalCandidate(node: DbGraphNode): number {
  let score = 0;
  if (node.metadata_json?.knowledgeKind === "document") score += 4;
  if (typeof node.metadata_json?.path === "string") score += 3;
  if (node.source_object_id) score += 1;
  if (node.node_type === "candidate") score += 2;
  return score;
}

/** Client-side variant — works on React Flow node data already on the canvas. */
export function resolveRetrievalNodeIdsFromFlow(
  nodes: Array<{ id: string; data: CampaignGraphNodeData }>,
  input: {
    contextPaths: string[];
    graphFolders: CampaignFolderId[];
    focusNodeId?: string;
    maxPerFolder?: number;
  },
): string[] {
  const dbLike: DbGraphNode[] = nodes.map((node) => ({
    id: node.id,
    campaign_id: "",
    node_type: node.data.nodeType,
    title: node.data.title,
    summary: node.data.summary,
    source_object_type: node.data.sourceObjectType,
    source_object_id: node.data.sourceObjectId,
    metadata_json: {
      ...(node.data.metadata ?? {}),
      folder: node.data.folder ?? undefined,
      path: node.data.knowledgePath ?? undefined,
      cluster: node.data.isFolderHub ? true : undefined,
      knowledgeKind: node.data.knowledgeKind ?? undefined,
    },
    embedding: null,
    created_at: "",
    updated_at: "",
  }));

  return resolveRetrievalNodeIds({
    nodes: dbLike,
    contextPaths: input.contextPaths,
    graphFolders: input.graphFolders,
    focusNodeId: input.focusNodeId,
    maxPerFolder: input.maxPerFolder,
  });
}
