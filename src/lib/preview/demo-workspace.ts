import type { CampaignContextValue } from "@/lib/campaign/get-campaign-context";
import type {
  DbCampaign,
  DbCampaignProfile,
} from "@/lib/db/schema";
import { toReactFlowGraph } from "@/lib/graph/to-react-flow";
import type { KnowledgeNode } from "@/lib/campaign-knowledge/types";
import type { WorkspaceMetrics } from "@/components/workspace/workspace-context-panel";
import {
  buildDemoKnowledgeGraph,
  DEMO_GRAPH_NODE_COUNT,
} from "@/lib/preview/build-demo-knowledge-graph";

/**
 * Static, secret-free demo content used only by the development-only
 * /preview/workspace route so the workspace shell can be rendered and
 * screenshotted without real auth, org, or Supabase data.
 */

const NOW = "2026-01-01T00:00:00.000Z";

const { nodes: DEMO_NODES, edges: DEMO_EDGES } = buildDemoKnowledgeGraph();

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
  graphNodeCount: DEMO_GRAPH_NODE_COUNT(),
  assetCount: 4,
  taskCount: 6,
  upcomingEventCount: 2,
  researchBriefCount: 3,
  prospectCount: 12,
};

export { DEMO_NODES, DEMO_EDGES };

export const DEMO_GRAPH = toReactFlowGraph({
  nodes: DEMO_NODES,
  edges: DEMO_EDGES,
});

/**
 * Knowledge steps the preview "Add knowledge" affordance cycles through to show
 * the graph growing organically — each one lands in its folder cluster and
 * wires itself to the cluster hub. Mirrors how a synced campaign-knowledge
 * folder document would map into the live graph.
 */
export const DEMO_GROWTH_STEPS: KnowledgeNode[] = [
  {
    kind: "document",
    path: "fundraising/q3-call-time.md",
    folder: "fundraising",
    title: "Q3 call-time list",
    summary: "Prioritized donor call sheet for the third-quarter push.",
    nodeType: "prospect",
  },
  {
    kind: "document",
    path: "events/ballard-meet-greet.md",
    folder: "events",
    title: "Ballard meet & greet",
    summary: "House party with neighborhood volunteers.",
    nodeType: "event",
  },
  {
    kind: "document",
    path: "social-media/launch-reel-v2.md",
    folder: "social-media",
    title: "Launch reel v2",
    summary: "Updated 30-second vertical video for Instagram and TikTok.",
    nodeType: "asset",
  },
  {
    kind: "document",
    path: "field/turf-plan-north-d3.md",
    folder: "field",
    title: "North D3 turf plan",
    summary: "Persuasion turf cut for suburban moderates.",
    nodeType: "strategic_priority",
  },
  {
    kind: "document",
    path: "people/beacon-hill-leaders.md",
    folder: "people",
    title: "Beacon Hill leaders",
    summary: "Community stakeholders to brief before the town hall.",
    nodeType: "organization",
  },
  {
    kind: "document",
    path: "compliance/pdc-c4-filing.md",
    folder: "compliance",
    title: "PDC C-4 filing",
    summary: "Expenditure disclosure prep for the current period.",
    nodeType: "compliance",
  },
  {
    kind: "document",
    path: "polling/wave-2-topline.md",
    folder: "polling",
    title: "Wave 2 topline",
    summary: "Follow-up poll after launch communications.",
    nodeType: "research",
  },
];

export const DEMO_CONTEXT: CampaignContextValue = {
  orgId: "demo-org",
  orgName: "Alvarez for Seattle",
  campaign: DEMO_CAMPAIGN,
  profile: DEMO_PROFILE,
  isSetupComplete: true,
};
