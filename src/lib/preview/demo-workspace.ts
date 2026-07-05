import type { CampaignContextValue } from "@/lib/campaign/get-campaign-context";
import {
  TEST_CANDIDATE_NAME,
  TEST_CANDIDATE_ORG_NAME,
  buildTestCandidateCampaign,
  buildTestCandidateProfile,
} from "@/lib/campaign/test-candidate";
import type { WorkspaceMetrics } from "@/components/workspace/workspace-context-panel";
import type { WorkspaceDigest } from "@/lib/workspace/digest";
import type { KnowledgeNode } from "@/lib/campaign-knowledge/types";
import { toReactFlowGraph } from "@/lib/graph/to-react-flow";
import { injectFolderHubs } from "@/lib/graph/inject-folder-hubs";
import { injectCampaignCenter } from "@/lib/graph/inject-campaign-center";
import {
  buildDemoKnowledgeGraph,
  DEMO_GRAPH_NODE_COUNT,
} from "@/lib/preview/build-demo-knowledge-graph";

/**
 * Static, secret-free demo content used only by the development-only
 * /preview/workspace route so the workspace shell can be rendered and
 * screenshotted without real auth, org, or Supabase data.
 */

const { nodes: DEMO_NODES, edges: DEMO_EDGES } = buildDemoKnowledgeGraph();

export const DEMO_CAMPAIGN = buildTestCandidateCampaign();

export const DEMO_PROFILE = buildTestCandidateProfile(DEMO_CAMPAIGN.id);

export const DEMO_METRICS: WorkspaceMetrics = {
  graphNodeCount: DEMO_GRAPH_NODE_COUNT(),
  assetCount: 4,
  taskCount: 6,
  upcomingEventCount: 2,
  researchBriefCount: 3,
  prospectCount: 12,
};

export const DEMO_DIGEST: WorkspaceDigest = {
  dueTasks: [
    {
      id: "demo-task-1",
      title: "Finalize Issaquah canvass route",
      priority: "high",
      dueDate: "2026-01-03",
    },
    {
      id: "demo-task-2",
      title: "Approve launch reel copy",
      priority: "medium",
      dueDate: "2026-01-05",
    },
    {
      id: "demo-task-3",
      title: "Call top-20 donor list",
      priority: "high",
      dueDate: "2026-01-06",
    },
  ],
  upcomingEvents: [
    {
      id: "demo-event-1",
      title: "Issaquah meet & greet",
      eventType: "meet_greet",
      startTime: "2026-01-08T18:00:00.000Z",
      location: "Issaquah Community Center",
      isMilestone: false,
    },
    {
      id: "demo-event-2",
      title: "Primary election",
      eventType: "deadline",
      startTime: "2026-08-04T17:00:00.000Z",
      location: null,
      isMilestone: true,
    },
  ],
  reviewAssets: [
    {
      id: "demo-asset-1",
      title: "Launch reel script v2",
      assetType: "social_post",
    },
  ],
  pendingComplianceCount: 1,
  recentActivity: [
    {
      id: "demo-log-1",
      module: "research",
      createdAt: "2025-12-31T22:10:00.000Z",
      createdObjectType: "research_brief",
    },
    {
      id: "demo-log-2",
      module: "assets",
      createdAt: "2025-12-31T19:40:00.000Z",
      createdObjectType: "asset",
    },
  ],
  fundraising: {
    raisedAmount: 102_951,
    effectiveGoal: 500_000,
    progressPercent: 21,
  },
};

export { DEMO_NODES, DEMO_EDGES };

const withHubs = injectFolderHubs({
  nodes: DEMO_NODES,
  edges: DEMO_EDGES,
  campaignId: DEMO_CAMPAIGN.id,
});

const withCenter = injectCampaignCenter({
  nodes: withHubs.nodes,
  edges: withHubs.edges,
  campaign: DEMO_CAMPAIGN,
  campaignId: DEMO_CAMPAIGN.id,
});

export const DEMO_GRAPH = toReactFlowGraph(withCenter);

/** Pre-injected seed for the live dynamic graph in preview mode. */
export const DEMO_LIVE_SEED = {
  nodes: withCenter.nodes,
  edges: withCenter.edges,
};

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
    path: "events/issaquah-meet-greet.md",
    folder: "events",
    title: "Issaquah meet & greet",
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
    path: "field/turf-plan-cd8-eastside.md",
    folder: "field",
    title: "Eastside CD-8 turf plan",
    summary: "Persuasion turf cut for suburban moderates.",
    nodeType: "strategic_priority",
  },
  {
    kind: "document",
    path: "people/veterans-leaders.md",
    folder: "people",
    title: "Veterans community leaders",
    summary: "Stakeholders to brief before the veterans roundtable.",
    nodeType: "organization",
  },
  {
    kind: "document",
    path: "compliance/fec-q2-filing.md",
    folder: "compliance",
    title: "FEC Q2 filing",
    summary: "Quarterly fundraising disclosure prep for the current period.",
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
  orgName: TEST_CANDIDATE_ORG_NAME,
  campaign: DEMO_CAMPAIGN,
  profile: DEMO_PROFILE,
  isSetupComplete: true,
};
