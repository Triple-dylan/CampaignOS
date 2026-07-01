"use server";

import {
  requireCampaignContext,
  type CampaignActionCode,
} from "@/lib/auth/require-campaign-context";
import { listGraphEdges, listGraphNodes } from "@/lib/db/campaigns";
import { injectFolderHubs } from "@/lib/graph/inject-folder-hubs";
import { injectWikiPages } from "@/lib/graph/inject-wiki-pages";
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

  // Real campaigns persist entity rows without folder hubs or `folder`
  // metadata. Synthesize the wiki-llm folder structure at render time so an
  // authenticated campaign shows the same coherent folder galaxy as the demo —
  // not a sparse constellation of peer dots. Purely additive + idempotent.
  const withWiki = injectWikiPages({
    nodes,
    edges,
    campaignId: context.campaign.id,
    campaign: context.campaign,
    profile: context.profile,
  });

  const withHubs = injectFolderHubs({
    nodes: withWiki.nodes,
    edges: withWiki.edges,
    campaignId: context.campaign.id,
  });

  return {
    ok: true,
    graph: toReactFlowGraph(withHubs),
    edgeCount: withHubs.edges.length,
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
