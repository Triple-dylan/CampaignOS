import type { DbGraphEdge, DbGraphNode } from "@/lib/db/schema";
import type { GraphNodeType } from "@/lib/validators/enums";
import { GRAPH_NODE_MINIMAP_COLORS } from "@/lib/graph/node-styles";
import {
  CENTER_FOLDER,
  folderAccentColor,
  folderClusterAngles,
  folderForNode,
} from "@/lib/graph/folder-clusters";
import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import {
  enrichGraphNodeData,
  type KnowledgeGraphNodeKind,
} from "@/lib/graph/node-metadata";

export const MAX_DISPLAY_GRAPH_NODES = 200;

export type CampaignGraphNodeData = {
  dbId: string;
  title: string;
  summary: string | null;
  nodeType: GraphNodeType;
  sourceObjectType: string | null;
  sourceObjectId: string | null;
  metadata: Record<string, unknown> | null;
  /** Campaign-knowledge folder this node lives in. */
  folder: CampaignFolderId | null;
  /** True for wiki-llm folder hub / cluster anchor nodes. */
  isFolderHub: boolean;
  /** Relative wiki path (e.g. `research/housing-poll.md`). */
  knowledgePath: string | null;
  knowledgeKind: KnowledgeGraphNodeKind | null;
  /** Number of edges touching this node — drives node size (Obsidian feel). */
  degree: number;
  /** Transient UI flag: node is being "searched" by the assistant. */
  highlighted?: boolean;
  /**
   * Transient UI flag: Obsidian-style folder-focus relevance level. Undefined
   * when no folder is focused (the global graph).
   */
  focusLevel?: GraphFocusLevel;
};

export type GraphViewMode = "all" | "folders" | "entities";

/**
 * Obsidian-style local-graph focus level. When a folder hub is focused, every
 * node is assigned a relevance level that drives its opacity, scale, and edge
 * treatment: the hub pops to `focus`, its children to `foreground`, direct
 * cross-folder neighbours to `midground`, and unrelated context dims to
 * `background`.
 */
export type GraphFocusLevel =
  | "focus"
  | "foreground"
  | "midground"
  | "background";

export type CampaignFlowNode = {
  id: string;
  type: "graphNode";
  position: { x: number; y: number };
  data: CampaignGraphNodeData;
};

export type CampaignFlowEdge = {
  id: string;
  source: string;
  target: string;
  type?: "floating";
  data?: {
    relationshipType: string;
  };
};

export type CampaignGraphFlow = {
  nodes: CampaignFlowNode[];
  edges: CampaignFlowEdge[];
  totalNodeCount: number;
  truncated: boolean;
};

/**
 * Distance from the candidate (centre) to each folder's cluster centre, and the
 * base spacing used to pack nodes within a cluster. Tuned so clusters read as
 * distinct, airy constellations — the Obsidian "folder galaxy" feel.
 */
const CLUSTER_RADIUS = 460;
const INTRA_CLUSTER_SPACING = 118;
const HUB_MEMBER_SPACING = 148;
const CENTER_SPACING = 150;

function isFolderHubNode(node: DbGraphNode): boolean {
  return node.metadata_json?.cluster === true;
}

/** Deterministic pseudo-random in [-1, 1] from a string seed. */
function seededOffset(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return ((hash % 1000) / 1000) * 2 - 1;
}

function readPositionFromMetadata(
  metadata: Record<string, unknown> | null,
): { x: number; y: number } | null {
  if (!metadata) {
    return null;
  }

  const x = metadata.x ?? metadata.positionX;
  const y = metadata.y ?? metadata.positionY;

  if (typeof x === "number" && typeof y === "number") {
    return { x, y };
  }

  return null;
}

/**
 * Place nodes into folder clusters radiating from the candidate. Each folder
 * occupies a stable angular sector; within a sector nodes fan out around their
 * cluster centre. Nodes carrying explicit metadata coordinates keep them, so
 * future drag-to-pin / saved layouts compose cleanly.
 */
function layoutNodes(nodes: DbGraphNode[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const byFolder = new Map<CampaignFolderId, DbGraphNode[]>();

  for (const node of nodes) {
    const fromMetadata = readPositionFromMetadata(node.metadata_json);
    if (fromMetadata) {
      positions.set(node.id, fromMetadata);
      continue;
    }

    const folder = folderForNode({
      nodeType: node.node_type,
      metadata: node.metadata_json,
    });
    const bucket = byFolder.get(folder) ?? [];
    bucket.push(node);
    byFolder.set(folder, bucket);
  }

  // Centre cluster (candidate + core campaign nodes) sits at the origin.
  const centerNodes = byFolder.get(CENTER_FOLDER) ?? [];
  const candidateNode = centerNodes.find((node) => node.node_type === "candidate");
  if (candidateNode && !positions.has(candidateNode.id)) {
    positions.set(candidateNode.id, { x: 0, y: 0 });
  }

  const otherCenter = centerNodes.filter((node) => node.id !== candidateNode?.id);
  otherCenter.forEach((node, index) => {
    if (positions.has(node.id)) return;
    const angle = (index / Math.max(otherCenter.length, 1)) * Math.PI * 2;
    positions.set(node.id, {
      x: Math.cos(angle) * CENTER_SPACING,
      y: Math.sin(angle) * CENTER_SPACING,
    });
  });

  const angles = folderClusterAngles(byFolder.keys());

  for (const [folder, clusterAngle] of angles) {
    const clusterNodes = byFolder.get(folder) ?? [];
    const cx = Math.cos(clusterAngle) * CLUSTER_RADIUS;
    const cy = Math.sin(clusterAngle) * CLUSTER_RADIUS;

    const hubs = clusterNodes.filter(isFolderHubNode);
    const members = clusterNodes.filter((node) => !isFolderHubNode(node));

    // Folder hub sits at the cluster centre — the visible container anchor.
    for (const hub of hubs) {
      if (!positions.has(hub.id)) positions.set(hub.id, { x: cx, y: cy });
    }

    const hubCenter =
      hubs.length > 0
        ? (positions.get(hubs[0].id) ?? { x: cx, y: cy })
        : { x: cx, y: cy };

    if (members.length === 0) continue;

    const count = members.length;
    const ringRadius = Math.max(
      HUB_MEMBER_SPACING,
      (count * INTRA_CLUSTER_SPACING) / (2 * Math.PI),
    );

    members.forEach((node, index) => {
      if (positions.has(node.id)) return;
      const spread = (index / count) * Math.PI * 2;
      const jitter = 1 + seededOffset(node.id) * 0.12;
      positions.set(node.id, {
        x: hubCenter.x + Math.cos(clusterAngle + spread) * ringRadius * jitter,
        y: hubCenter.y + Math.sin(clusterAngle + spread) * ringRadius * jitter,
      });
    });
  }

  return positions;
}

export function toReactFlowGraph(input: {
  nodes: DbGraphNode[];
  edges: DbGraphEdge[];
}): CampaignGraphFlow {
  const totalNodeCount = input.nodes.length;
  const truncated = totalNodeCount > MAX_DISPLAY_GRAPH_NODES;
  const displayNodes = truncated
    ? input.nodes.slice(0, MAX_DISPLAY_GRAPH_NODES)
    : input.nodes;

  const displayNodeIds = new Set(displayNodes.map((node) => node.id));
  const positions = layoutNodes(displayNodes);

  const visibleEdges = input.edges.filter(
    (edge) =>
      displayNodeIds.has(edge.source_node_id) &&
      displayNodeIds.has(edge.target_node_id),
  );

  const degreeById = new Map<string, number>();
  for (const edge of visibleEdges) {
    degreeById.set(
      edge.source_node_id,
      (degreeById.get(edge.source_node_id) ?? 0) + 1,
    );
    degreeById.set(
      edge.target_node_id,
      (degreeById.get(edge.target_node_id) ?? 0) + 1,
    );
  }

  const flowNodes: CampaignFlowNode[] = displayNodes.map((node) => ({
    id: node.id,
    type: "graphNode",
    position: positions.get(node.id) ?? { x: 0, y: 0 },
    data: enrichGraphNodeData({
      dbId: node.id,
      title: node.title,
      summary: node.summary,
      nodeType: node.node_type,
      sourceObjectType: node.source_object_type,
      sourceObjectId: node.source_object_id,
      metadata: node.metadata_json,
      degree: degreeById.get(node.id) ?? 0,
    }),
  }));

  const flowEdges: CampaignFlowEdge[] = visibleEdges.map((edge) => ({
    id: edge.id,
    source: edge.source_node_id,
    target: edge.target_node_id,
    type: "floating",
    data: {
      relationshipType: edge.relationship_type,
    },
  }));

  return {
    nodes: flowNodes,
    edges: flowEdges,
    totalNodeCount,
    truncated,
  };
}

export function getMinimapNodeColor(nodeType: GraphNodeType): string {
  return GRAPH_NODE_MINIMAP_COLORS[nodeType] ?? "#94a3b8";
}

/** Accent color (hex) for a node's dot, used by the Obsidian-style node. */
export function getNodeAccentColor(nodeType: GraphNodeType): string {
  return GRAPH_NODE_MINIMAP_COLORS[nodeType] ?? "#94a3b8";
}

/** Diameter (px) of a node's dot, scaled gently by its connection count. */
export function getNodeDiameter(degree: number, isFolderHub = false): number {
  if (isFolderHub) return 44;
  return Math.round(Math.min(52, Math.max(16, 16 + degree * 5)));
}

/** Accent for a node — folder hubs use their cluster colour. */
export function getNodeVisualAccent(data: CampaignGraphNodeData): string {
  if (data.isFolderHub && data.folder) {
    return folderAccentColor(data.folder);
  }
  return getNodeAccentColor(data.nodeType);
}

/**
 * Compute Obsidian-style focus levels for a folder hub focus.
 *
 * - The folder's hub node(s) become `focus`.
 * - Other nodes in the folder become `foreground` (the "popped out" children).
 * - Direct cross-folder neighbours of the focused folder become `midground`.
 * - Everything else dims to `background`.
 *
 * Pure + deterministic so it can be reused by any canvas and unit-tested.
 */
export function computeFolderFocusLevels(input: {
  nodes: CampaignFlowNode[];
  edges: CampaignFlowEdge[];
  focusFolderId: CampaignFolderId;
}): Map<string, GraphFocusLevel> {
  const { nodes, edges, focusFolderId } = input;
  const levels = new Map<string, GraphFocusLevel>();

  const visibleIds = new Set(nodes.map((node) => node.id));
  const folderMembers = new Set<string>();
  const hubIds = new Set<string>();

  for (const node of nodes) {
    if (folderForNode(node.data) === focusFolderId) {
      folderMembers.add(node.id);
      if (node.data.isFolderHub) hubIds.add(node.id);
    }
  }

  // Nothing in this folder is visible — caller should treat focus as inactive.
  if (folderMembers.size === 0) return levels;

  const adjacency = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    let set = adjacency.get(a);
    if (!set) {
      set = new Set<string>();
      adjacency.set(a, set);
    }
    set.add(b);
  };
  for (const edge of edges) {
    if (!visibleIds.has(edge.source) || !visibleIds.has(edge.target)) continue;
    link(edge.source, edge.target);
    link(edge.target, edge.source);
  }

  const midground = new Set<string>();
  for (const memberId of folderMembers) {
    for (const neighbor of adjacency.get(memberId) ?? []) {
      if (!folderMembers.has(neighbor)) midground.add(neighbor);
    }
  }

  for (const node of nodes) {
    if (hubIds.has(node.id)) {
      levels.set(node.id, "focus");
    } else if (folderMembers.has(node.id)) {
      levels.set(node.id, "foreground");
    } else if (midground.has(node.id)) {
      levels.set(node.id, "midground");
    } else {
      levels.set(node.id, "background");
    }
  }

  return levels;
}

/** Filter nodes by folder-hub / entity view mode. */
export function filterNodesByViewMode(
  nodes: CampaignFlowNode[],
  mode: GraphViewMode,
): CampaignFlowNode[] {
  if (mode === "all") return nodes;
  if (mode === "folders") {
    return nodes.filter(
      (node) =>
        node.data.isFolderHub || node.data.nodeType === "candidate",
    );
  }
  return nodes.filter((node) => !node.data.isFolderHub);
}
