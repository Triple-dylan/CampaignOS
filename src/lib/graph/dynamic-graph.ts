import * as React from "react";
import type { DbGraphEdge, DbGraphNode } from "@/lib/db/schema";
import type {
  GraphNodeType,
  GraphRelationshipType,
} from "@/lib/validators/enums";
import type {
  CampaignFolderId,
  KnowledgeNode,
} from "@/lib/campaign-knowledge/types";
import { getCampaignFolder } from "@/lib/campaign-knowledge/folders";
import { parseKnowledgeRelativePath } from "@/lib/campaign-knowledge/paths";
import {
  CENTER_FOLDER,
  NODE_TYPE_FOLDER,
  folderForNode,
} from "@/lib/graph/folder-clusters";
import {
  toReactFlowGraph,
  type CampaignGraphFlow,
} from "@/lib/graph/to-react-flow";

/**
 * Client-side dynamic knowledge graph — the runtime model behind the live
 * context graph. It grows as campaign knowledge arrives (a chat turn, a synced
 * folder, a new asset) and keeps existing node positions stable so growth feels
 * like an organic expansion rather than a re-shuffle.
 *
 * This is an MVP: positions are pinned into each node's `metadata_json` (x/y)
 * so `toReactFlowGraph` leaves placed nodes untouched and only ever positions
 * the newcomers. The same shape (DbGraphNode / DbGraphEdge) maps 1:1 to the
 * Supabase `graph_nodes` / `graph_edges` tables, so the real, server-backed
 * graph and this client model are interchangeable.
 */

const NOW_ISO = () => new Date().toISOString();

/** Radius from the candidate to a brand-new cluster, mirrors the static layout. */
const NEW_CLUSTER_RADIUS = 460;
/** How far a new node sits from its cluster's current centroid. */
const NEW_NODE_OFFSET = 138;

let counter = 0;
function makeId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

function hashAngle(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return ((hash % 360) / 360) * Math.PI * 2;
}

type GraphPosition = { x: number; y: number };

function readPosition(node: DbGraphNode): GraphPosition | null {
  const meta = node.metadata_json;
  if (!meta) return null;
  const x = meta.x ?? meta.positionX;
  const y = meta.y ?? meta.positionY;
  if (typeof x === "number" && typeof y === "number") return { x, y };
  return null;
}

function withPosition(node: DbGraphNode, position: GraphPosition): DbGraphNode {
  return {
    ...node,
    metadata_json: { ...(node.metadata_json ?? {}), x: position.x, y: position.y },
  };
}

export type AddNodeInput = {
  nodeType: GraphNodeType;
  title: string;
  summary?: string | null;
  folder?: CampaignFolderId;
  sourceObjectType?: string | null;
  sourceObjectId?: string | null;
  metadata?: Record<string, unknown> | null;
  /** Optionally connect to an existing node on creation. */
  connectTo?: { nodeId: string; relationship: GraphRelationshipType };
};

/**
 * A mutable graph builder. Construct from raw db nodes/edges (or empty), mutate
 * with `addNode` / `addEdge` / `mergeFromFolderPath` / `syncFromKnowledgeFile`,
 * then read `toFlow()` for React Flow. All mutations return new ids so callers
 * can wire follow-on edges or highlights.
 */
export class DynamicCampaignGraph {
  private nodes: DbGraphNode[];
  private edges: DbGraphEdge[];
  private campaignId: string;

  constructor(input: {
    campaignId: string;
    nodes?: DbGraphNode[];
    edges?: DbGraphEdge[];
  }) {
    this.campaignId = input.campaignId;
    this.edges = [...(input.edges ?? [])];
    // Pin initial positions once so future growth never disturbs them.
    const seeded = input.nodes ?? [];
    const placed = toReactFlowGraph({ nodes: seeded, edges: this.edges });
    const positionById = new Map(
      placed.nodes.map((node) => [node.id, node.position] as const),
    );
    this.nodes = seeded.map((node) => {
      const position = readPosition(node) ?? positionById.get(node.id);
      return position ? withPosition(node, position) : node;
    });
  }

  getNodes(): DbGraphNode[] {
    return this.nodes;
  }

  getEdges(): DbGraphEdge[] {
    return this.edges;
  }

  hasNode(id: string): boolean {
    return this.nodes.some((node) => node.id === id);
  }

  /** Find an existing node by type + (case-insensitive) title. */
  findNode(nodeType: GraphNodeType, title: string): DbGraphNode | undefined {
    const needle = title.trim().toLowerCase();
    return this.nodes.find(
      (node) =>
        node.node_type === nodeType &&
        node.title.trim().toLowerCase() === needle,
    );
  }

  private folderCentroid(folder: CampaignFolderId): GraphPosition | null {
    const members = this.nodes
      .map((node) => ({ node, pos: readPosition(node) }))
      .filter(
        (entry) =>
          entry.pos !== null &&
          folderForNode({
            nodeType: entry.node.node_type,
            metadata: entry.node.metadata_json,
          }) === folder,
      );
    if (members.length === 0) return null;
    const sum = members.reduce(
      (acc, entry) => ({ x: acc.x + entry.pos!.x, y: acc.y + entry.pos!.y }),
      { x: 0, y: 0 },
    );
    return { x: sum.x / members.length, y: sum.y / members.length };
  }

  private positionFor(folder: CampaignFolderId, seed: string): GraphPosition {
    if (folder === CENTER_FOLDER) {
      const angle = hashAngle(seed);
      return { x: Math.cos(angle) * 150, y: Math.sin(angle) * 150 };
    }

    const centroid = this.folderCentroid(folder);
    const angle = hashAngle(seed);
    if (centroid) {
      // Tuck the newcomer just outside the cluster's current centroid.
      return {
        x: centroid.x + Math.cos(angle) * NEW_NODE_OFFSET,
        y: centroid.y + Math.sin(angle) * NEW_NODE_OFFSET,
      };
    }
    // Brand-new cluster: seat it on the cluster ring at a stable angle.
    const clusterAngle = hashAngle(folder);
    return {
      x: Math.cos(clusterAngle) * NEW_CLUSTER_RADIUS,
      y: Math.sin(clusterAngle) * NEW_CLUSTER_RADIUS,
    };
  }

  addNode(input: AddNodeInput): string {
    const folder =
      input.folder ?? NODE_TYPE_FOLDER[input.nodeType] ?? CENTER_FOLDER;
    const id = makeId("dyn");
    const position = this.positionFor(folder, id);

    const node: DbGraphNode = withPosition(
      {
        id,
        campaign_id: this.campaignId,
        node_type: input.nodeType,
        title: input.title,
        summary: input.summary ?? null,
        source_object_type: input.sourceObjectType ?? null,
        source_object_id: input.sourceObjectId ?? null,
        metadata_json: { ...(input.metadata ?? {}), folder },
        embedding: null,
        created_at: NOW_ISO(),
        updated_at: NOW_ISO(),
      },
      position,
    );

    this.nodes = [...this.nodes, node];

    if (input.connectTo && this.hasNode(input.connectTo.nodeId)) {
      this.addEdge({
        source: id,
        target: input.connectTo.nodeId,
        relationship: input.connectTo.relationship,
      });
    }

    return id;
  }

  addEdge(input: {
    source: string;
    target: string;
    relationship: GraphRelationshipType;
    confidence?: number;
    metadata?: Record<string, unknown> | null;
  }): string | null {
    if (!this.hasNode(input.source) || !this.hasNode(input.target)) {
      return null;
    }
    const exists = this.edges.some(
      (edge) =>
        edge.source_node_id === input.source &&
        edge.target_node_id === input.target &&
        edge.relationship_type === input.relationship,
    );
    if (exists) return null;

    const id = makeId("dye");
    this.edges = [
      ...this.edges,
      {
        id,
        campaign_id: this.campaignId,
        source_node_id: input.source,
        target_node_id: input.target,
        relationship_type: input.relationship,
        confidence: input.confidence ?? 0.85,
        metadata_json: input.metadata ?? null,
        created_at: NOW_ISO(),
      },
    ];
    return id;
  }

  /** Connect a node to the campaign's candidate (if one exists). */
  private linkToCandidate(nodeId: string, relationship: GraphRelationshipType) {
    const candidate = this.nodes.find((node) => node.node_type === "candidate");
    if (candidate) {
      this.addEdge({ source: nodeId, target: candidate.id, relationship });
    }
  }

  /**
   * Ensure a folder's hub node exists in the graph, linking it to the
   * candidate. Accepts either a folder id or a knowledge path (e.g.
   * `fundraising/q2-call-time.md`). Returns the hub node id.
   */
  mergeFromFolderPath(folderOrPath: CampaignFolderId | string): string {
    const folderId = this.resolveFolder(folderOrPath);
    const folder = getCampaignFolder(folderId);
    const nodeType = folder.graphNodeTypes[0] ?? "strategic_priority";

    const existing = this.nodes.find(
      (node) =>
        node.metadata_json?.cluster === true &&
        node.metadata_json?.folder === folderId,
    );
    if (existing) return existing.id;

    const id = this.addNode({
      nodeType,
      title: folder.label,
      summary: folder.description,
      folder: folderId,
      metadata: { cluster: true, knowledgeKind: "folder_hub" },
    });
    this.linkToCandidate(id, "belongs_to");
    return id;
  }

  private resolveFolder(folderOrPath: CampaignFolderId | string): CampaignFolderId {
    const parsed = parseKnowledgeRelativePath(folderOrPath);
    if (parsed.folder) return parsed.folder;
    // Treat the bare value as a folder id when it isn't a recognizable path.
    return (folderOrPath as CampaignFolderId) ?? CENTER_FOLDER;
  }

  /**
   * Map a knowledge-layer node (a markdown doc resolved by the campaign
   * knowledge layer) into the graph, attaching it to its folder cluster hub.
   */
  syncFromKnowledgeFile(knowledge: KnowledgeNode): string | null {
    if (knowledge.kind === "meta") return null;

    if (knowledge.kind === "cluster") {
      return this.mergeFromFolderPath(knowledge.folder);
    }

    const hubId = this.mergeFromFolderPath(knowledge.folder);
    const nodeType =
      knowledge.nodeType ??
      getCampaignFolder(knowledge.folder).graphNodeTypes[0] ??
      "research";

    const id = this.addNode({
      nodeType,
      title: knowledge.title,
      summary: knowledge.summary ?? null,
      folder: knowledge.folder,
      sourceObjectType: knowledge.sourceObjectType ?? null,
      sourceObjectId: knowledge.sourceObjectId ?? null,
      metadata: {
        ...(knowledge.metadata ?? {}),
        path: knowledge.path,
        knowledgeKind: "document",
      },
      connectTo: { nodeId: hubId, relationship: "belongs_to" },
    });
    return id;
  }

  toFlow(): CampaignGraphFlow {
    return toReactFlowGraph({ nodes: this.nodes, edges: this.edges });
  }
}

export type DynamicGraphController = {
  graph: CampaignGraphFlow;
  /** Most recently added node ids (for staggered enter highlights). */
  lastAddedIds: string[];
  addNode: (input: AddNodeInput) => string;
  addEdge: (input: {
    source: string;
    target: string;
    relationship: GraphRelationshipType;
  }) => string | null;
  mergeFromFolderPath: (folderOrPath: CampaignFolderId | string) => string;
  syncFromKnowledgeFile: (knowledge: KnowledgeNode) => string | null;
  reset: () => void;
};

/**
 * React hook wrapping {@link DynamicCampaignGraph} for client components. The
 * graph instance is held in a ref; each mutation produces a fresh flow snapshot
 * via state so React Flow re-renders (and animates the newcomers).
 */
export function useDynamicCampaignGraph(input: {
  campaignId: string;
  nodes: DbGraphNode[];
  edges: DbGraphEdge[];
}): DynamicGraphController {
  const { campaignId, nodes, edges } = input;

  // The mutable graph instance lives in state (not a ref) so the lazy flow
  // initializer can read it during render without tripping the refs lint, and
  // `reset` can swap in a fresh instance.
  const [instance, setInstance] = React.useState(
    () => new DynamicCampaignGraph({ campaignId, nodes, edges }),
  );
  const [flow, setFlow] = React.useState<CampaignGraphFlow>(() =>
    instance.toFlow(),
  );
  const [lastAddedIds, setLastAddedIds] = React.useState<string[]>([]);

  const commit = React.useCallback(
    (added: string[]) => {
      setLastAddedIds(added.filter(Boolean));
      setFlow(instance.toFlow());
    },
    [instance],
  );

  const addNode = React.useCallback(
    (nodeInput: AddNodeInput) => {
      const id = instance.addNode(nodeInput);
      commit([id]);
      return id;
    },
    [instance, commit],
  );

  const addEdge = React.useCallback(
    (edgeInput: {
      source: string;
      target: string;
      relationship: GraphRelationshipType;
    }) => {
      const id = instance.addEdge(edgeInput);
      commit([]);
      return id;
    },
    [instance, commit],
  );

  const mergeFromFolderPath = React.useCallback(
    (folderOrPath: CampaignFolderId | string) => {
      const id = instance.mergeFromFolderPath(folderOrPath);
      commit([id]);
      return id;
    },
    [instance, commit],
  );

  const syncFromKnowledgeFile = React.useCallback(
    (knowledge: KnowledgeNode) => {
      const id = instance.syncFromKnowledgeFile(knowledge);
      commit(id ? [id] : []);
      return id;
    },
    [instance, commit],
  );

  const reset = React.useCallback(() => {
    const next = new DynamicCampaignGraph({ campaignId, nodes, edges });
    setInstance(next);
    setLastAddedIds([]);
    setFlow(next.toFlow());
  }, [campaignId, nodes, edges]);

  return {
    graph: flow,
    lastAddedIds,
    addNode,
    addEdge,
    mergeFromFolderPath,
    syncFromKnowledgeFile,
    reset,
  };
}
