import { buildCenterDisplayContent, type CenterDisplayMode } from "@/lib/graph/center-display";
import { CAMPAIGN_CENTER_ID } from "@/lib/graph/inject-campaign-center";
import type { CampaignGraphFlow } from "@/lib/graph/to-react-flow";
import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";
import type { WorkspaceDigest } from "@/lib/workspace/digest";

/** Patch the synthetic centre node's title/summary from live campaign data. */
export function applyCenterDisplayToGraph(
  graph: CampaignGraphFlow | null,
  input: {
    displayMode: CenterDisplayMode;
    customLabel?: string;
    customSubtitle?: string;
    campaign: Pick<
      DbCampaign,
      | "candidate_name"
      | "election_date"
      | "office_sought"
      | "jurisdiction"
      | "state"
      | "district"
    > | null;
    profile?: DbCampaignProfile | null;
    digest?: WorkspaceDigest | null;
  },
): CampaignGraphFlow | null {
  if (!graph) return null;

  const content = buildCenterDisplayContent({
    mode: input.displayMode,
    customLabel: input.customLabel,
    customSubtitle: input.customSubtitle,
    campaign: input.campaign,
    profile: input.profile,
    digest: input.digest,
  });

  let changed = false;
  const nodes = graph.nodes.map((node) => {
    if (
      !node.data.isCampaignCenter &&
      node.id !== CAMPAIGN_CENTER_ID
    ) {
      return node;
    }
    if (
      node.data.title === content.title &&
      node.data.summary === content.summary &&
      node.data.electionCountdown === content.electionCountdown
    ) {
      return node;
    }
    changed = true;
    return {
      ...node,
      data: {
        ...node.data,
        title: content.title,
        summary: content.summary,
        electionCountdown: content.electionCountdown,
      },
    };
  });

  if (!changed) return graph;
  return { ...graph, nodes };
}
