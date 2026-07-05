import {
  daysUntilElection,
  formatElectionCountdown,
  formatElectionDate,
} from "@/lib/campaign/utils";
import type { DbCampaign, DbGraphEdge, DbGraphNode } from "@/lib/db/schema";

/**
 * Render-time synthesis of the campaign goal node — the gravitational centre of
 * the knowledge graph. Folder clusters orbit this hub (election date +
 * countdown + candidate name) rather than scattering around a generic dot.
 *
 * Purely additive and idempotent: if a centre node already exists, edges are
 * rewired but the node is not duplicated.
 */

export const CAMPAIGN_CENTER_ID = "synthetic-center:campaign";
const SYNTHETIC_EDGE_PREFIX = "synthetic-center-edge:";
const EPOCH = new Date(0).toISOString();

/** Small offset so the candidate node orbits just outside the pinned centre. */
const CANDIDATE_ORBIT_OFFSET = 120;

function isCampaignCenterNode(node: DbGraphNode): boolean {
  return node.metadata_json?.campaignCenter === true;
}

export function injectCampaignCenter(input: {
  nodes: DbGraphNode[];
  edges: DbGraphEdge[];
  campaign: Pick<
    DbCampaign,
    "id" | "candidate_name" | "election_date" | "office_sought"
  > | null;
  campaignId?: string;
}): { nodes: DbGraphNode[]; edges: DbGraphEdge[] } {
  const { nodes, edges, campaign } = input;
  if (nodes.length === 0 || !campaign) {
    return { nodes, edges };
  }

  const campaignId = input.campaignId ?? nodes[0]?.campaign_id ?? campaign.id;
  const candidate = nodes.find((node) => node.node_type === "candidate");
  const existingCenter = nodes.find(isCampaignCenterNode);

  const days = daysUntilElection(campaign.election_date);
  const dateLabel = formatElectionDate(campaign.election_date);
  const countdown = formatElectionCountdown(days);
  const candidateName =
    campaign.candidate_name?.trim() || "Campaign goal";

  const centerNode: DbGraphNode = existingCenter ?? {
    id: CAMPAIGN_CENTER_ID,
    campaign_id: campaignId,
    node_type: "candidate",
    title: dateLabel !== "—" ? dateLabel : candidateName,
    summary: `${countdown} · ${candidateName}`,
    source_object_type: null,
    source_object_id: null,
    metadata_json: {
      campaignCenter: true,
      electionDate: campaign.election_date,
      electionCountdown: countdown,
      candidateName,
      synthetic: true,
      x: 0,
      y: 0,
    },
    embedding: null,
    created_at: EPOCH,
    updated_at: EPOCH,
  };

  // Nudge the candidate off the origin so it orbits the pinned centre.
  const adjustedNodes = nodes.map((node) => {
    if (!candidate || node.id !== candidate.id) return node;
    const meta = node.metadata_json ?? {};
    if (typeof meta.x === "number" && typeof meta.y === "number") {
      const dist = Math.hypot(meta.x, meta.y);
      if (dist > 40) return node;
    }
    return {
      ...node,
      metadata_json: {
        ...meta,
        x: CANDIDATE_ORBIT_OFFSET,
        y: CANDIDATE_ORBIT_OFFSET * 0.35,
      },
    };
  });

  const centerPresent = adjustedNodes.some((n) => n.id === centerNode.id);
  const allNodes = centerPresent
    ? adjustedNodes.map((n) => (n.id === centerNode.id ? centerNode : n))
    : [centerNode, ...adjustedNodes];

  const hubIds = new Set(
    allNodes
      .filter((node) => node.metadata_json?.cluster === true)
      .map((node) => node.id),
  );

  // Rewire folder-hub → candidate edges to point at the campaign centre.
  const adjustedEdges = edges.map((edge) => {
    if (
      edge.relationship_type !== "belongs_to" ||
      !candidate ||
      edge.target_node_id !== candidate.id ||
      !hubIds.has(edge.source_node_id)
    ) {
      return edge;
    }
    return { ...edge, target_node_id: centerNode.id };
  });

  const belongsTo = new Map<string, Set<string>>();
  for (const edge of adjustedEdges) {
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

  if (candidate) {
    addBelongsTo(candidate.id, centerNode.id);
  }

  return {
    nodes: allNodes,
    edges: [...adjustedEdges, ...newEdges],
  };
}
