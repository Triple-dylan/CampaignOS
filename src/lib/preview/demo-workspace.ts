import type { CampaignContextValue } from "@/lib/campaign/get-campaign-context";
import type {
  DbCampaign,
  DbCampaignProfile,
  DbGraphEdge,
  DbGraphNode,
} from "@/lib/db/schema";
import type { GraphNodeType } from "@/lib/validators/enums";
import { toReactFlowGraph } from "@/lib/graph/to-react-flow";
import type {
  CampaignFolderId,
  KnowledgeNode,
} from "@/lib/campaign-knowledge/types";
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
  graphNodeCount: 44,
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
  /**
   * Pins the node into a specific campaign-knowledge folder cluster. When set,
   * `folderForNode` uses it directly so the node lands in the right sector with
   * its cluster's accent colour — keeping the graph aligned with the wiki-llm
   * folder taxonomy instead of guessing from node type alone.
   */
  folder?: CampaignFolderId,
  options?: { cluster?: boolean; path?: string },
): DbGraphNode {
  const metadata: Record<string, unknown> | null = folder
    ? {
        folder,
        ...(options?.cluster ? { cluster: true } : {}),
        ...(options?.path ? { path: options.path } : {}),
      }
    : null;
  return {
    id,
    campaign_id: "demo-campaign",
    node_type,
    title,
    summary,
    source_object_type: null,
    source_object_id: null,
    metadata_json: metadata,
    embedding: null,
    created_at: NOW,
    updated_at: NOW,
  };
}

/** A folder hub node — the visible anchor for a campaign-knowledge cluster. */
function hub(
  id: string,
  node_type: GraphNodeType,
  folder: CampaignFolderId,
  title: string,
  summary: string,
): DbGraphNode {
  return node(id, node_type, title, summary, folder, { cluster: true });
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

/**
 * Demo knowledge graph, organized to mirror the real `campaign-knowledge`
 * wiki-llm folder taxonomy. Every node carries its folder so it lands in the
 * right cluster (and accent colour), and each cluster has a visible folder
 * *hub* node — the same shape the live `DynamicCampaignGraph.mergeFromFolderPath`
 * produces — so the folder structure and the Gbrain skills layer are actually
 * present in the visualization, not just implied.
 */
export const DEMO_NODES: DbGraphNode[] = [
  // ── Campaign (centre) ──────────────────────────────────────────────
  node(
    "n-candidate",
    "candidate",
    "Maria Alvarez",
    "Candidate for Seattle City Council, District 3.",
    "campaign",
  ),

  // ── Messaging: issues + message themes ─────────────────────────────
  hub(
    "hub-messaging",
    "message_theme",
    "messaging",
    "Messaging",
    "Message framework, issue positions, talking points, and taglines.",
  ),
  node("n-housing", "issue", "Affordable housing", "Top campaign issue — build more, protect renters.", "messaging"),
  node("n-transit", "issue", "Transit", "Reliable, frequent transit across District 3.", "messaging"),
  node("n-safety", "issue", "Public safety", "Community-centered public safety and response times.", "messaging"),
  node("n-smallbiz", "issue", "Small business", "Support local main-street small businesses.", "messaging"),
  node(
    "n-theme",
    "message_theme",
    "A District 3 that works for everyone",
    "Core value-proposition message theme.",
    "messaging",
  ),
  node(
    "n-theme2",
    "message_theme",
    "Build more, commute less",
    "Housing + transit message theme.",
    "messaging",
  ),

  // ── People: voter segments & audiences ─────────────────────────────
  hub(
    "hub-people",
    "voter_segment",
    "people",
    "People",
    "Voter segments, endorsers, and community stakeholders.",
  ),
  node("n-renters", "voter_segment", "Renters", "Key audience: cost-burdened renters.", "people"),
  node("n-families", "voter_segment", "Young families", "Key audience: young families.", "people"),
  node("n-seniors", "voter_segment", "Seniors", "Key audience: older, high-turnout voters.", "people"),
  node("n-latino", "voter_segment", "Latino community", "Spanish-language outreach audience.", "people"),

  // ── Field: turf & contact universes ────────────────────────────────
  hub(
    "hub-field",
    "voter_segment",
    "field",
    "Field",
    "Canvass turf, contact universes, and door-knock plans.",
  ),
  node(
    "n-turf",
    "strategic_priority",
    "District 3 turf plan",
    "Canvass turf cut for the first GOTV weekend.",
    "field",
  ),
  node("n-union", "voter_segment", "Union households", "Labor-endorsed turnout universe.", "field"),
  node("n-suburban", "voter_segment", "Suburban moderates", "Persuasion universe in north District 3.", "field"),

  // ── Research: polling intel & opposition ───────────────────────────
  hub(
    "hub-research",
    "research",
    "research",
    "Research",
    "District intel, issue briefs, and opposition research.",
  ),
  node("n-poll", "research", "Housing poll", "District-wide affordability poll.", "research"),
  node("n-oppo", "research", "Opponent record", "Incumbent voting-record brief.", "research"),
  node("n-opp", "opponent", "Dan Pike (incumbent)", "Two-term incumbent council member.", "research"),

  // ── Assets: creative & collateral ──────────────────────────────────
  hub(
    "hub-assets",
    "asset",
    "assets",
    "Assets",
    "Drafted emails, mailers, one-pagers, and approved exports.",
  ),
  node("n-email", "asset", "Launch email", "Campaign launch announcement email.", "assets"),
  node("n-onepager", "asset", "Housing one-pager", "Affordable-housing plan explainer.", "assets"),
  node("n-video", "asset", "Transit explainer", "60-second transit explainer video.", "assets"),

  // ── Events: calendar & turnout moments ─────────────────────────────
  hub(
    "hub-events",
    "event",
    "events",
    "Events",
    "Town halls, house parties, and calendar milestones.",
  ),
  node("n-townhall", "event", "Town hall — Beacon Hill", "Community town hall.", "events"),
  node("n-roundtable", "event", "Renters roundtable", "Listening session with renters.", "events"),

  // ── Fundraising: donors & call time ────────────────────────────────
  hub(
    "hub-fundraising",
    "donor",
    "fundraising",
    "Fundraising",
    "Donor prospects, call-time scripts, and ask strategy.",
  ),
  node("n-donor", "donor", "A. Chen", "Maxed-out early donor and event host.", "fundraising"),
  node("n-calltime", "prospect", "Q2 call-time list", "Prioritized donor call sheet.", "fundraising"),

  // ── Team: staff, volunteers & coalition ────────────────────────────
  hub(
    "hub-team",
    "organization",
    "team",
    "Team",
    "Staff, consultants, volunteers, and coalition partners.",
  ),
  node("n-chamber", "organization", "Beacon Hill Chamber", "Local small-business coalition.", "team"),
  node("n-volunteers", "organization", "Volunteer captains", "Neighborhood canvass leads.", "team"),

  // ── Skills: Gbrain harness playbooks ───────────────────────────────
  hub(
    "hub-skills",
    "task",
    "skills",
    "Skills",
    "Reusable agent skills the harness resolves per request.",
  ),
  node("n-skill-asset", "task", "Asset Studio drafting", "Skill: draft on-brand creative and copy.", "skills", { path: "skills/asset-studio/SKILL.md" }),
  node("n-skill-compliance", "task", "Compliance review", "Skill: PDC/FEC review of content.", "skills", { path: "skills/compliance-review/SKILL.md" }),
  node("n-skill-research", "task", "Research brief", "Skill: synthesize district & opponent intel.", "skills", { path: "skills/research-brief/SKILL.md" }),
  node("n-skill-fund", "task", "Fundraising outreach", "Skill: build call-time lists and asks.", "skills", { path: "skills/fundraising-outreach/SKILL.md" }),

  // ── Initiatives: strategic programs ────────────────────────────────
  hub(
    "hub-initiatives",
    "strategic_priority",
    "initiatives",
    "Initiatives",
    "Strategic programs — persuasion, GOTV, and coalition building.",
  ),
  node("n-earlyvote", "strategic_priority", "Win the early vote", "Bank votes in the first mailing window.", "initiatives"),
  node("n-gotv", "strategic_priority", "GOTV weekend", "Final-weekend turnout program.", "initiatives"),

  // ── Compliance: disclosure & review ────────────────────────────────
  hub(
    "hub-compliance",
    "compliance",
    "compliance",
    "Compliance",
    "PDC disclosure prep, content review records, and flags.",
  ),
  node("n-pdc", "compliance", "PDC C-3 filing", "Quarterly contribution disclosure prep.", "compliance"),
];

export const DEMO_EDGES: DbGraphEdge[] = [
  // Folder hubs anchor to the candidate at the centre.
  edge("h1", "hub-messaging", "n-candidate", "belongs_to"),
  edge("h2", "hub-people", "n-candidate", "belongs_to"),
  edge("h3", "hub-field", "n-candidate", "belongs_to"),
  edge("h4", "hub-research", "n-candidate", "belongs_to"),
  edge("h5", "hub-assets", "n-candidate", "belongs_to"),
  edge("h6", "hub-events", "n-candidate", "belongs_to"),
  edge("h7", "hub-fundraising", "n-candidate", "belongs_to"),
  edge("h8", "hub-team", "n-candidate", "belongs_to"),
  edge("h9", "hub-skills", "n-candidate", "belongs_to"),
  edge("h10", "hub-initiatives", "n-candidate", "belongs_to"),
  edge("h11", "hub-compliance", "n-candidate", "belongs_to"),

  // Members belong to their folder hub.
  edge("m1", "n-housing", "hub-messaging", "belongs_to"),
  edge("m2", "n-transit", "hub-messaging", "belongs_to"),
  edge("m3", "n-safety", "hub-messaging", "belongs_to"),
  edge("m4", "n-smallbiz", "hub-messaging", "belongs_to"),
  edge("m5", "n-theme", "hub-messaging", "belongs_to"),
  edge("m6", "n-theme2", "hub-messaging", "belongs_to"),
  edge("m7", "n-renters", "hub-people", "belongs_to"),
  edge("m8", "n-families", "hub-people", "belongs_to"),
  edge("m9", "n-seniors", "hub-people", "belongs_to"),
  edge("m10", "n-latino", "hub-people", "belongs_to"),
  edge("m11", "n-turf", "hub-field", "belongs_to"),
  edge("m12", "n-union", "hub-field", "belongs_to"),
  edge("m13", "n-suburban", "hub-field", "belongs_to"),
  edge("m14", "n-poll", "hub-research", "belongs_to"),
  edge("m15", "n-oppo", "hub-research", "belongs_to"),
  edge("m16", "n-opp", "hub-research", "belongs_to"),
  edge("m17", "n-email", "hub-assets", "belongs_to"),
  edge("m18", "n-onepager", "hub-assets", "belongs_to"),
  edge("m19", "n-video", "hub-assets", "belongs_to"),
  edge("m20", "n-townhall", "hub-events", "belongs_to"),
  edge("m21", "n-roundtable", "hub-events", "belongs_to"),
  edge("m22", "n-donor", "hub-fundraising", "belongs_to"),
  edge("m23", "n-calltime", "hub-fundraising", "belongs_to"),
  edge("m24", "n-chamber", "hub-team", "belongs_to"),
  edge("m25", "n-volunteers", "hub-team", "belongs_to"),
  edge("m26", "n-skill-asset", "hub-skills", "belongs_to"),
  edge("m27", "n-skill-compliance", "hub-skills", "belongs_to"),
  edge("m28", "n-skill-research", "hub-skills", "belongs_to"),
  edge("m29", "n-skill-fund", "hub-skills", "belongs_to"),
  edge("m30", "n-earlyvote", "hub-initiatives", "belongs_to"),
  edge("m31", "n-gotv", "hub-initiatives", "belongs_to"),
  edge("m32", "n-pdc", "hub-compliance", "belongs_to"),

  // Candidate ↔ issues.
  edge("c1", "n-candidate", "n-housing", "supports"),
  edge("c2", "n-candidate", "n-transit", "supports"),
  edge("c3", "n-candidate", "n-safety", "supports"),
  edge("c4", "n-candidate", "n-smallbiz", "supports"),

  // Issues → the voter segments they speak to.
  edge("t1", "n-housing", "n-renters", "targets"),
  edge("t2", "n-housing", "n-families", "targets"),
  edge("t3", "n-housing", "n-latino", "targets"),
  edge("t4", "n-transit", "n-families", "targets"),
  edge("t5", "n-transit", "n-seniors", "targets"),
  edge("t6", "n-safety", "n-seniors", "targets"),
  edge("t7", "n-smallbiz", "n-suburban", "targets"),

  // Message themes align with issues.
  edge("a1", "n-theme", "n-housing", "aligns_with"),
  edge("a2", "n-theme", "n-smallbiz", "aligns_with"),
  edge("a3", "n-theme2", "n-housing", "aligns_with"),
  edge("a4", "n-theme2", "n-transit", "aligns_with"),

  // Opposition & coalition.
  edge("o1", "n-opp", "n-candidate", "opposes"),
  edge("o2", "n-oppo", "n-opp", "references"),
  edge("o3", "n-poll", "n-housing", "references"),
  edge("o4", "n-chamber", "n-candidate", "supports"),
  edge("o5", "n-chamber", "n-smallbiz", "connected_to"),

  // Assets derive from themes / issues.
  edge("d1", "n-email", "n-theme", "derived_from"),
  edge("d2", "n-onepager", "n-housing", "derived_from"),
  edge("d3", "n-video", "n-transit", "derived_from"),

  // Events target their audiences.
  edge("ev1", "n-townhall", "n-renters", "targets"),
  edge("ev2", "n-roundtable", "n-renters", "targets"),
  edge("ev3", "n-roundtable", "n-seniors", "targets"),

  // Fundraising.
  edge("f1", "n-donor", "n-candidate", "supports"),
  edge("f2", "n-calltime", "n-donor", "connected_to"),

  // Field & initiatives.
  edge("i1", "n-candidate", "n-earlyvote", "aligns_with"),
  edge("i2", "n-gotv", "n-earlyvote", "aligns_with"),
  edge("i3", "n-turf", "n-union", "targets"),
  edge("i4", "n-turf", "n-suburban", "targets"),
  edge("i5", "n-volunteers", "n-gotv", "connected_to"),

  // Gbrain skills wire to the clusters they operate on.
  edge("s1", "n-skill-asset", "hub-assets", "connected_to"),
  edge("s2", "n-skill-compliance", "hub-compliance", "connected_to"),
  edge("s3", "n-skill-research", "hub-research", "connected_to"),
  edge("s4", "n-skill-fund", "hub-fundraising", "connected_to"),
];

export const DEMO_GRAPH = toReactFlowGraph({
  nodes: DEMO_NODES,
  edges: DEMO_EDGES,
});

/**
 * Knowledge steps the preview "Add knowledge" affordance cycles through to show
 * the graph growing organically — each one lands in its folder cluster and
 * wires itself to the candidate / cluster hub. Mirrors how a synced
 * campaign-knowledge folder document would map into the live graph.
 */
export const DEMO_GROWTH_STEPS: KnowledgeNode[] = [
  {
    kind: "document",
    path: "fundraising/q2-call-time.md",
    folder: "fundraising",
    title: "Q2 call-time list",
    summary: "Prioritized donor call sheet for the second-quarter push.",
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
    path: "social-media/launch-reel.md",
    folder: "social-media",
    title: "Launch reel",
    summary: "30-second vertical video for Instagram and TikTok.",
    nodeType: "asset",
  },
  {
    kind: "document",
    path: "field/turf-plan-d3.md",
    folder: "field",
    title: "District 3 turf plan",
    summary: "Canvass turf cut for the first GOTV weekend.",
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
    path: "compliance/pdc-c3-filing.md",
    folder: "compliance",
    title: "PDC C-3 filing",
    summary: "Quarterly contribution disclosure prep.",
    nodeType: "compliance",
  },
  {
    kind: "document",
    path: "polling/wave-1-topline.md",
    folder: "polling",
    title: "Wave 1 topline",
    summary: "Baseline poll: name ID and ballot test.",
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
