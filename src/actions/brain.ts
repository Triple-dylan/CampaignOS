"use server";

import {
  requireCampaignContext,
  type CampaignActionCode,
} from "@/lib/auth/require-campaign-context";
import { listGraphEdges, listGraphNodes } from "@/lib/db/campaigns";
import { toReactFlowGraph, type CampaignGraphFlow } from "@/lib/graph/to-react-flow";

export type GetCampaignGraphResult =
  | {
      ok: true;
      graph: CampaignGraphFlow;
      edgeCount: number;
    }
  | {
      ok: false;
      error: string;
      code?: CampaignActionCode;
    };

export async function getCampaignGraph(): Promise<GetCampaignGraphResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return {
      ok: false,
      error: context.error,
      code: context.code,
    };
  }

  const [nodes, edges] = await Promise.all([
    listGraphNodes(context.campaign.id),
    listGraphEdges(context.campaign.id),
  ]);

  return {
    ok: true,
    graph: toReactFlowGraph({ nodes, edges }),
    edgeCount: edges.length,
  };
}

export async function getCampaignGraphNodeCount(): Promise<number> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return 0;
  }

  const nodes = await listGraphNodes(context.campaign.id);
  return nodes.length;
}
