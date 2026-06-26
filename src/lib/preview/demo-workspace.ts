import type { CampaignContextValue } from "@/lib/campaign/get-campaign-context";
import type {
  DbCampaign,
  DbCampaignProfile,
  DbGraphEdge,
  DbGraphNode,
} from "@/lib/db/schema";
import type { GraphNodeType } from "@/lib/validators/enums";
import { toReactFlowGraph } from "@/lib/graph/to-react-flow";
import type { WorkspaceMetrics } from "@/components/workspace/workspace-context-panel";

/**
 * Static, secret-free demo content used only by the development-only
 * /preview/workspace route so the workspace shell can be rendered and
 * screenshotted without real auth, org, or Supabase data.
 */

const NOW = "2026-01-01T00:00:00.000Z";

export const DEMO_CAMPAIGN: DbCampaign = {
  id: "demo-campaign",
  organization_id: "demo-org",
  candidate_name: "Maria Alvarez",
  office_sought: "Seattle City Council, District 3",
  jurisdiction: "City of Seattle",
  state: "WA",
  district: "3",
  party: "Nonpartisan",
  election_date: "2026-11-03",
  campaign_website: "https://example.org",
  campaign_status: "active",
  created_at: NOW,
  updated_at: NOW,
};

export const DEMO_PROFILE: DbCampaignProfile = {
  id: "demo-profile",
  campaign_id: "demo-campaign",
  candidate_bio:
    "Small-business owner and neighborhood organizer running to make District 3 more affordable and connected.",
  campaign_themes: ["Affordability", "Reliable transit", "Safe neighborhoods"],
  top_issues: ["Affordable housing", "Transit", "Small business"],
  voter_segments: [{ name: "Renters" }, { name: "Young families" }],
  tone_preferences: { voice: "optimistic", formality: "approachable" },
  opponent_names: [],
  fundraising_goal: 250000,
  summary:
    "A District 3 that works for everyone — neighbors, renters, and local businesses alike.",
  message_framework: {
    valueProposition: "A District 3 that works for everyone.",
    keyMessages: [
      "Affordable housing for working families",
      "Transit you can count on",
    ],
    toneGuidance: "Optimistic, practical, neighborly.",
    taglines: ["Alvarez for Seattle"],
  },
  issue_map: null,
  brain_generated_at: NOW,
  created_at: NOW,
  updated_at: NOW,
};

export const DEMO_METRICS: WorkspaceMetrics = {
  graphNodeCount: 9,
  assetCount: 4,
  taskCount: 6,
  upcomingEventCount: 2,
  researchBriefCount: 3,
  prospectCount: 12,
};

function node(
  id: string,
  node_type: GraphNodeType,
  title: string,
  summary: string,
): DbGraphNode {
  return {
    id,
    campaign_id: "demo-campaign",
    node_type,
    title,
    summary,
    source_object_type: null,
    source_object_id: null,
    metadata_json: null,
    embedding: null,
    created_at: NOW,
    updated_at: NOW,
  };
}

function edge(
  id: string,
  source: string,
  target: string,
  relationship_type: DbGraphEdge["relationship_type"],
): DbGraphEdge {
  return {
    id,
    campaign_id: "demo-campaign",
    source_node_id: source,
    target_node_id: target,
    relationship_type,
    confidence: 0.9,
    metadata_json: null,
    created_at: NOW,
  };
}

const DEMO_NODES: DbGraphNode[] = [
  node(
    "n-candidate",
    "candidate",
    "Maria Alvarez",
    "Candidate for Seattle City Council, District 3.",
  ),
  node("n-housing", "issue", "Affordable housing", "Top campaign issue."),
  node("n-transit", "issue", "Transit", "Reliable, frequent transit."),
  node("n-smallbiz", "issue", "Small business", "Support local small business."),
  node("n-renters", "voter_segment", "Renters", "Key audience: renters."),
  node(
    "n-families",
    "voter_segment",
    "Young families",
    "Key audience: young families.",
  ),
  node(
    "n-theme",
    "message_theme",
    "A District 3 that works for everyone",
    "Core message theme.",
  ),
  node(
    "n-asset",
    "asset",
    "Launch email",
    "Campaign launch announcement email.",
  ),
  node("n-event", "event", "Town hall — Beacon Hill", "Community town hall."),
];

const DEMO_EDGES: DbGraphEdge[] = [
  edge("e1", "n-candidate", "n-housing", "supports"),
  edge("e2", "n-candidate", "n-transit", "supports"),
  edge("e3", "n-candidate", "n-smallbiz", "supports"),
  edge("e4", "n-housing", "n-renters", "targets"),
  edge("e5", "n-housing", "n-families", "targets"),
  edge("e6", "n-theme", "n-housing", "aligns_with"),
  edge("e7", "n-asset", "n-theme", "derived_from"),
  edge("e8", "n-event", "n-renters", "targets"),
];

export const DEMO_GRAPH = toReactFlowGraph({
  nodes: DEMO_NODES,
  edges: DEMO_EDGES,
});

export const DEMO_CONTEXT: CampaignContextValue = {
  orgId: "demo-org",
  orgName: "Alvarez for Seattle",
  campaign: DEMO_CAMPAIGN,
  profile: DEMO_PROFILE,
  isSetupComplete: true,
};
