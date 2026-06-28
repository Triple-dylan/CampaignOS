import type { DbGraphEdge, DbGraphNode } from "@/lib/db/schema";
import type { GraphNodeType } from "@/lib/validators/enums";
import { GRAPH_NODE_MINIMAP_COLORS } from "@/lib/graph/node-styles";

export const MAX_DISPLAY_GRAPH_NODES = 200;

export type CampaignGraphNodeData = {
  dbId: string;
  title: string;
  summary: string | null;
  nodeType: GraphNodeType;
  sourceObjectType: string | null;
  sourceObjectId: string | null;
  metadata: Record<string, unknown> | null;
  /** Number of edges touching this node — drives node size (Obsidian feel). */
  degree: number;
  /** Transient UI flag: node is being "searched" by the assistant. */
  highlighted?: boolean;
};

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
 * Concentric "rings" by node type, radiating out from the candidate at the
 * center. This produces the airy, organic web that reads like an Obsidian
 * context graph rather than a rigid top-down tree.
 */
const RING_BY_TYPE: Record<GraphNodeType, number> = {
  candidate: 0,
  strategic_priority: 1,
  issue: 1,
  voter_segment: 1,
  message_theme: 2,
  opponent: 2,
  organization: 2,
  asset: 3,
  event: 3,
  task: 3,
  research: 3,
  prospect: 3,
  donor: 3,
  compliance: 3,
};

const RING_RADIUS = 260;
const MIN_NODE_SPACING = 150;

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

function layoutNodes(nodes: DbGraphNode[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const rings = new Map<number, DbGraphNode[]>();

  for (const node of nodes) {
    const fromMetadata = readPositionFromMetadata(node.metadata_json);
    if (fromMetadata) {
      positions.set(node.id, fromMetadata);
      continue;
    }

    const ring = RING_BY_TYPE[node.node_type] ?? 3;
    const bucket = rings.get(ring) ?? [];
    bucket.push(node);
    rings.set(ring, bucket);
  }

  const sortedRings = [...rings.entries()].sort(([a], [b]) => a - b);

  for (const [ring, ringNodes] of sortedRings) {
    if (ring === 0) {
      // Center the root node(s) at the origin.
      ringNodes.forEach((node, index) => {
        if (!positions.has(node.id)) {
          positions.set(node.id, { x: index * MIN_NODE_SPACING, y: 0 });
        }
      });
      continue;
    }

    const count = ringNodes.length;
    // Grow the radius if a ring is crowded so labels stay readable.
    const circumferenceRadius = (count * MIN_NODE_SPACING) / (2 * Math.PI);
    const radius = Math.max(ring * RING_RADIUS, circumferenceRadius);
    // Offset every other ring so spokes don't visually align.
    const angleOffset = ring * 0.6;

    ringNodes.forEach((node, index) => {
      if (positions.has(node.id)) return;
      const angle = angleOffset + (index / count) * Math.PI * 2;
      const jitter = 1 + seededOffset(node.id) * 0.12;
      positions.set(node.id, {
        x: Math.cos(angle) * radius * jitter,
        y: Math.sin(angle) * radius * jitter,
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
    data: {
      dbId: node.id,
      title: node.title,
      summary: node.summary,
      nodeType: node.node_type,
      sourceObjectType: node.source_object_type,
      sourceObjectId: node.source_object_id,
      metadata: node.metadata_json,
      degree: degreeById.get(node.id) ?? 0,
    },
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
export function getNodeDiameter(degree: number): number {
  return Math.round(Math.min(56, Math.max(18, 18 + degree * 6)));
}
