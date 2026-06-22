import type { DbGraphEdge, DbGraphNode } from "@/lib/db/schema";

export type CampaignGraph = {
  nodes: DbGraphNode[];
  edges: DbGraphEdge[];
  isLoading: boolean;
};

export function emptyCampaignGraph(): CampaignGraph {
  return {
    nodes: [],
    edges: [],
    isLoading: false,
  };
}

// Server-side graph loading: getCampaignGraph() in @/actions/brain
// DB helpers: listGraphNodes, listGraphEdges, countGraphNodes in @/lib/db/campaigns
