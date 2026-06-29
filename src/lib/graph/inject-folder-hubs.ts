import { getCampaignFolder } from "@/lib/campaign-knowledge/folders";
import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import type { DbGraphEdge, DbGraphNode } from "@/lib/db/schema";
import { CENTER_FOLDER, folderForNode } from "@/lib/graph/folder-clusters";

/**
 * Real-graph folder-hub synthesis.
 *
 * The production graph (`getCampaignGraph`) reads persisted `graph_nodes` /
 * `graph_edges` rows. Most writers (`seedCampaignGraphNodes`,
 * `enrichCampaignBrainGraph`, asset/event/task/research/prospect linkers) create
 * entity rows **without** folder-hub nodes or `folder` metadata, so an
 * authenticated campaign sees a sparse "entity constellation" instead of the
 * wiki-llm folder structure that only existed in the `/preview/workspace` demo.
 *
 * This module closes that gap at render time: it applies the same folder-hub
 * pattern from `build-demo-knowledge-graph.ts` to **real campaign data**. For
 * every folder that has member nodes but no hub, it synthesizes a folder-hub
 * node and `belongs_to` edges (member → hub, hub → candidate). The result is a
 * coherent folder galaxy for any campaign — no DB migration required.
 *
 * It is purely additive and idempotent:
 * - Campaigns that already carry folder hubs / `belongs_to` edges are untouched
 *   (we never duplicate an existing hub or edge).
 * - Synthetic nodes/edges are tagged `metadata_json.synthetic = true` so they
 *   can be told apart from persisted rows and are never written back to the DB.
 */

const SYNTHETIC_HUB_PREFIX = "synthetic-hub:";
const SYNTHETIC_EDGE_PREFIX = "synthetic-edge:";
const EPOCH = new Date(0).toISOString();

/** Stable render-only id for a folder's synthesized hub node. */
export function syntheticHubId(folder: CampaignFolderId): string {
  return `${SYNTHETIC_HUB_PREFIX}${folder}`;
}

export function isSyntheticGraphId(id: string): boolean {
  return (
    id.startsWith(SYNTHETIC_HUB_PREFIX) || id.startsWith(SYNTHETIC_EDGE_PREFIX)
  );
}

function isHubNode(node: DbGraphNode): boolean {
  return node.metadata_json?.cluster === true;
}

function folderOf(node: DbGraphNode): CampaignFolderId {
  return folderForNode({
    nodeType: node.node_type,
    metadata: node.metadata_json,
  });
}

export function injectFolderHubs(input: {
  nodes: DbGraphNode[];
  edges: DbGraphEdge[];
  campaignId?: string;
}): { nodes: DbGraphNode[]; edges: DbGraphEdge[] } {
  const { nodes, edges } = input;
  if (nodes.length === 0) {
    return { nodes, edges };
  }

  const campaignId = input.campaignId ?? nodes[0]?.campaign_id ?? "";
  const candidate = nodes.find((node) => node.node_type === "candidate");

  // Folders that already own a hub, and the id of that hub (so existing members
  // wire to the real hub rather than a duplicate synthetic one).
  const hubIdByFolder = new Map<CampaignFolderId, string>();
  for (const node of nodes) {
    if (!isHubNode(node)) continue;
    const folder = folderOf(node);
    if (!hubIdByFolder.has(folder)) {
      hubIdByFolder.set(folder, node.id);
    }
  }

  // Group every non-hub member by its resolved folder (skip the centre folder —
  // those nodes orbit the candidate directly, with no outer hub).
  const membersByFolder = new Map<CampaignFolderId, DbGraphNode[]>();
  for (const node of nodes) {
    if (isHubNode(node)) continue;
    if (candidate && node.id === candidate.id) continue;
    const folder = folderOf(node);
    if (folder === CENTER_FOLDER) continue;
    const bucket = membersByFolder.get(folder) ?? [];
    bucket.push(node);
    membersByFolder.set(folder, bucket);
  }

  // Synthesize a hub for any folder that has members but no existing hub.
  const newHubs: DbGraphNode[] = [];
  for (const [folder, members] of membersByFolder) {
    if (members.length === 0) continue;
    if (hubIdByFolder.has(folder)) continue;
    const folderDef = getCampaignFolder(folder);
    const nodeType = folderDef.graphNodeTypes[0] ?? "strategic_priority";
    const id = syntheticHubId(folder);
    newHubs.push({
      id,
      campaign_id: campaignId,
      node_type: nodeType,
      title: folderDef.label,
      summary: folderDef.description,
      source_object_type: null,
      source_object_id: null,
      metadata_json: {
        folder,
        cluster: true,
        knowledgeKind: "folder_hub",
        path: `${folderDef.slug}/`,
        synthetic: true,
      },
      embedding: null,
      created_at: EPOCH,
      updated_at: EPOCH,
    });
    hubIdByFolder.set(folder, id);
  }

  // Existing `belongs_to` edges, so we never duplicate a relationship.
  const belongsTo = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (edge.relationship_type !== "belongs_to") continue;
    const set = belongsTo.get(edge.source_node_id) ?? new Set<string>();
    set.add(edge.target_node_id);
    belongsTo.set(edge.source_node_id, set);
  }

  const newEdges: DbGraphEdge[] = [];
  let counter = 0;
  const addBelongsTo = (source: string, target: string) => {
    if (source === target) return;
    if (belongsTo.get(source)?.has(target)) return;
    counter += 1;
    newEdges.push({
      id: `${SYNTHETIC_EDGE_PREFIX}${counter}`,
      campaign_id: campaignId,
      source_node_id: source,
      target_node_id: target,
      relationship_type: "belongs_to",
      confidence: 1,
      metadata_json: { synthetic: true },
      created_at: EPOCH,
    });
    const set = belongsTo.get(source) ?? new Set<string>();
    set.add(target);
    belongsTo.set(source, set);
  };

  // Wire each member to its folder hub.
  for (const [folder, members] of membersByFolder) {
    const hubId = hubIdByFolder.get(folder);
    if (!hubId) continue;
    for (const member of members) {
      addBelongsTo(member.id, hubId);
    }
  }

  // Anchor every hub (existing + synthesized) to the candidate at the centre.
  if (candidate) {
    for (const hubId of hubIdByFolder.values()) {
      addBelongsTo(hubId, candidate.id);
    }
  }

  // Hubs go first so they survive `MAX_DISPLAY_GRAPH_NODES` truncation.
  return {
    nodes: [...newHubs, ...nodes],
    edges: [...edges, ...newEdges],
  };
}
