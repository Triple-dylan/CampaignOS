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
  label?: string;
  type?: "default";
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

const NODE_WIDTH = 240;
const NODE_HEIGHT = 110;
const HORIZONTAL_GAP = 48;
const VERTICAL_GAP = 100;

const LAYER_BY_TYPE: Record<GraphNodeType, number> = {
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
  const layers = new Map<number, DbGraphNode[]>();

  for (const node of nodes) {
    const fromMetadata = readPositionFromMetadata(node.metadata_json);
    if (fromMetadata) {
      positions.set(node.id, fromMetadata);
      continue;
    }

    const layer = LAYER_BY_TYPE[node.node_type] ?? 4;
    const bucket = layers.get(layer) ?? [];
    bucket.push(node);
    layers.set(layer, bucket);
  }

  const sortedLayers = [...layers.entries()].sort(([a], [b]) => a - b);

  for (const [layer, layerNodes] of sortedLayers) {
    const rowWidth =
      layerNodes.length * NODE_WIDTH +
      Math.max(0, layerNodes.length - 1) * HORIZONTAL_GAP;
    let x = -rowWidth / 2;

    for (const node of layerNodes) {
      if (!positions.has(node.id)) {
        positions.set(node.id, {
          x,
          y: layer * (NODE_HEIGHT + VERTICAL_GAP),
        });
        x += NODE_WIDTH + HORIZONTAL_GAP;
      }
    }
  }

  return positions;
}

function formatRelationshipLabel(value: string): string {
  return value.replace(/_/g, " ");
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
    },
  }));

  const flowEdges: CampaignFlowEdge[] = input.edges
    .filter(
      (edge) =>
        displayNodeIds.has(edge.source_node_id) &&
        displayNodeIds.has(edge.target_node_id),
    )
    .map((edge) => ({
      id: edge.id,
      source: edge.source_node_id,
      target: edge.target_node_id,
      label: formatRelationshipLabel(edge.relationship_type),
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
