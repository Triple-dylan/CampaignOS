import {
  CAMPAIGN_FOLDERS,
  getCampaignFolder,
} from "@/lib/campaign-knowledge/folders";
import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import type { DbGraphEdge, DbGraphNode } from "@/lib/db/schema";
import { HARNESS_SKILL_PLAYBOOKS } from "@/lib/harness/skills/registry";
import type {
  GraphNodeType,
  GraphRelationshipType,
} from "@/lib/validators/enums";

const DEMO_CAMPAIGN_ID = "demo-campaign";
const NOW = "2026-01-01T00:00:00.000Z";

type DemoDocument = {
  id: string;
  path: string;
  folder: CampaignFolderId;
  nodeType: GraphNodeType;
  title: string;
  summary: string;
};

type DemoEdge = {
  id: string;
  source: string;
  target: string;
  relationship: GraphRelationshipType;
};

function hubId(folder: CampaignFolderId): string {
  return `hub-${folder}`;
}

function node(
  id: string,
  node_type: GraphNodeType,
  title: string,
  summary: string,
  folder: CampaignFolderId,
  options?: { path?: string; knowledgeKind?: "document" | "entity" },
): DbGraphNode {
  return {
    id,
    campaign_id: DEMO_CAMPAIGN_ID,
    node_type,
    title,
    summary,
    source_object_type: null,
    source_object_id: null,
    metadata_json: {
      folder,
      path: options?.path,
      knowledgeKind: options?.knowledgeKind ?? (options?.path ? "document" : "entity"),
    },
    embedding: null,
    created_at: NOW,
    updated_at: NOW,
  };
}

function hubNode(folderId: CampaignFolderId): DbGraphNode {
  const folder = getCampaignFolder(folderId);
  const nodeType = folder.graphNodeTypes[0] ?? "strategic_priority";
  return {
    id: hubId(folderId),
    campaign_id: DEMO_CAMPAIGN_ID,
    node_type: nodeType,
    title: folder.label,
    summary: folder.description,
    source_object_type: null,
    source_object_id: null,
    metadata_json: {
      folder: folderId,
      cluster: true,
      knowledgeKind: "folder_hub",
      path: `${folder.slug}/`,
    },
    embedding: null,
    created_at: NOW,
    updated_at: NOW,
  };
}

function edge(
  id: string,
  source: string,
  target: string,
  relationship_type: GraphRelationshipType,
): DbGraphEdge {
  return {
    id,
    campaign_id: DEMO_CAMPAIGN_ID,
    source_node_id: source,
    target_node_id: target,
    relationship_type,
    confidence: 0.9,
    metadata_json: { label: relationship_type },
    created_at: NOW,
  };
}

/**
 * Wiki-style knowledge pages that populate each folder cluster. Paths mirror
 * `campaign-knowledge/templates/` and the live wiki-llm tree.
 */
const DEMO_DOCUMENTS: DemoDocument[] = [
  // campaign/
  {
    id: "doc-candidate",
    path: "campaign/profile.md",
    folder: "campaign",
    nodeType: "candidate",
    title: "Maria Alvarez",
    summary: "Candidate for Seattle City Council, District 3.",
  },
  // messaging/ — issues & themes as wiki pages
  {
    id: "doc-safety-framework",
    path: "messaging/public-safety-framework.md",
    folder: "messaging",
    nodeType: "message_theme",
    title: "Public safety framework",
    summary: "Community-centered public safety messaging and talking points.",
  },
  {
    id: "doc-housing-issue",
    path: "messaging/affordable-housing.md",
    folder: "messaging",
    nodeType: "issue",
    title: "Affordable housing",
    summary: "Top campaign issue — build more, protect renters.",
  },
  {
    id: "doc-transit-issue",
    path: "messaging/transit.md",
    folder: "messaging",
    nodeType: "issue",
    title: "Transit",
    summary: "Reliable, frequent transit across District 3.",
  },
  {
    id: "doc-smallbiz-issue",
    path: "messaging/small-business.md",
    folder: "messaging",
    nodeType: "issue",
    title: "Small business",
    summary: "Support local main-street small businesses.",
  },
  {
    id: "doc-theme",
    path: "messaging/value-proposition.md",
    folder: "messaging",
    nodeType: "message_theme",
    title: "A District 3 that works for everyone",
    summary: "Core value-proposition message theme.",
  },
  // people/ — voter segments as wiki pages
  {
    id: "doc-renters",
    path: "people/renters.md",
    folder: "people",
    nodeType: "voter_segment",
    title: "Renters",
    summary: "Key audience: cost-burdened renters.",
  },
  {
    id: "doc-families",
    path: "people/young-families.md",
    folder: "people",
    nodeType: "voter_segment",
    title: "Young families",
    summary: "Key audience: young families.",
  },
  {
    id: "doc-seniors",
    path: "people/seniors.md",
    folder: "people",
    nodeType: "voter_segment",
    title: "Seniors",
    summary: "Key audience: older, high-turnout voters.",
  },
  {
    id: "doc-latino",
    path: "people/latino-community.md",
    folder: "people",
    nodeType: "voter_segment",
    title: "Latino community",
    summary: "Spanish-language outreach audience.",
  },
  // field/
  {
    id: "doc-turf",
    path: "field/turf-plan-d3.md",
    folder: "field",
    nodeType: "strategic_priority",
    title: "District 3 turf plan",
    summary: "Canvass turf cut for the first GOTV weekend.",
  },
  {
    id: "doc-union",
    path: "field/union-households.md",
    folder: "field",
    nodeType: "voter_segment",
    title: "Union households",
    summary: "Labor-endorsed turnout universe.",
  },
  {
    id: "doc-suburban",
    path: "field/suburban-moderates.md",
    folder: "field",
    nodeType: "voter_segment",
    title: "Suburban moderates",
    summary: "Persuasion universe in north District 3.",
  },
  // research/
  {
    id: "doc-townhall-research",
    path: "research/event-town-hall-3-15.md",
    folder: "research",
    nodeType: "research",
    title: "Event research: Town hall 3/15",
    summary: "Beacon Hill town hall prep — audience concerns and local intel.",
  },
  {
    id: "doc-poll",
    path: "research/housing-poll.md",
    folder: "research",
    nodeType: "research",
    title: "Housing poll",
    summary: "District-wide affordability poll.",
  },
  {
    id: "doc-oppo",
    path: "research/opponent-record.md",
    folder: "research",
    nodeType: "research",
    title: "Opponent record",
    summary: "Incumbent voting-record brief.",
  },
  {
    id: "doc-opp",
    path: "research/dan-pike.md",
    folder: "research",
    nodeType: "opponent",
    title: "Dan Pike (incumbent)",
    summary: "Two-term incumbent council member.",
  },
  // assets/
  {
    id: "doc-email",
    path: "assets/launch-email.md",
    folder: "assets",
    nodeType: "asset",
    title: "Launch email",
    summary: "Campaign launch announcement email.",
  },
  {
    id: "doc-onepager",
    path: "assets/housing-one-pager.md",
    folder: "assets",
    nodeType: "asset",
    title: "Housing one-pager",
    summary: "Affordable-housing plan explainer.",
  },
  {
    id: "doc-video",
    path: "assets/transit-explainer.md",
    folder: "assets",
    nodeType: "asset",
    title: "Transit explainer",
    summary: "60-second transit explainer video.",
  },
  // events/
  {
    id: "doc-townhall",
    path: "events/town-hall-beacon-hill.md",
    folder: "events",
    nodeType: "event",
    title: "Town hall — Beacon Hill",
    summary: "Community town hall on March 15.",
  },
  {
    id: "doc-roundtable",
    path: "events/renters-roundtable.md",
    folder: "events",
    nodeType: "event",
    title: "Renters roundtable",
    summary: "Listening session with renters.",
  },
  // fundraising/
  {
    id: "doc-donor",
    path: "fundraising/donor-a-chen.md",
    folder: "fundraising",
    nodeType: "donor",
    title: "A. Chen",
    summary: "Maxed-out early donor and event host.",
  },
  {
    id: "doc-calltime",
    path: "fundraising/q2-call-time.md",
    folder: "fundraising",
    nodeType: "prospect",
    title: "Q2 call-time list",
    summary: "Prioritized donor call sheet.",
  },
  // team/
  {
    id: "doc-chamber",
    path: "team/beacon-hill-chamber.md",
    folder: "team",
    nodeType: "organization",
    title: "Beacon Hill Chamber",
    summary: "Local small-business coalition.",
  },
  {
    id: "doc-volunteers",
    path: "team/volunteer-captains.md",
    folder: "team",
    nodeType: "organization",
    title: "Volunteer captains",
    summary: "Neighborhood canvass leads.",
  },
  // initiatives/
  {
    id: "doc-earlyvote",
    path: "initiatives/early-vote.md",
    folder: "initiatives",
    nodeType: "strategic_priority",
    title: "Win the early vote",
    summary: "Bank votes in the first mailing window.",
  },
  {
    id: "doc-gotv",
    path: "initiatives/gotv-weekend.md",
    folder: "initiatives",
    nodeType: "strategic_priority",
    title: "GOTV weekend",
    summary: "Final-weekend turnout program.",
  },
  // compliance/
  {
    id: "doc-pdc",
    path: "compliance/pdc-c3-filing.md",
    folder: "compliance",
    nodeType: "compliance",
    title: "PDC C-3 filing",
    summary: "Quarterly contribution disclosure prep.",
  },
  // social-media/
  {
    id: "doc-launch-reel",
    path: "social-media/launch-reel.md",
    folder: "social-media",
    nodeType: "asset",
    title: "Launch reel",
    summary: "30-second vertical video for Instagram and TikTok.",
  },
  {
    id: "doc-social-cal",
    path: "social-media/content-calendar.md",
    folder: "social-media",
    nodeType: "message_theme",
    title: "Content calendar",
    summary: "Weekly social post schedule and channel mix.",
  },
  // communications/
  {
    id: "doc-press",
    path: "communications/press-strategy.md",
    folder: "communications",
    nodeType: "message_theme",
    title: "Press strategy",
    summary: "Earned media plan and rapid-response playbook.",
  },
  // media/
  {
    id: "doc-adbuy",
    path: "media/q2-ad-buy.md",
    folder: "media",
    nodeType: "asset",
    title: "Q2 ad buy",
    summary: "Digital and mail placement plan for Q2.",
  },
  // polling/
  {
    id: "doc-poll-topline",
    path: "polling/wave-1-topline.md",
    folder: "polling",
    nodeType: "research",
    title: "Wave 1 topline",
    summary: "Baseline poll: name ID and ballot test.",
  },
  // endorsements/
  {
    id: "doc-labor-targets",
    path: "endorsements/labor-union-targets.md",
    folder: "endorsements",
    nodeType: "prospect",
    title: "Labor union targets",
    summary: "Priority labor endorsements for District 3.",
  },
  // ballot-access/
  {
    id: "doc-filing",
    path: "ballot-access/filing-deadline.md",
    folder: "ballot-access",
    nodeType: "compliance",
    title: "Filing deadline",
    summary: "PDC registration and ballot filing checklist.",
  },
  // accounting/
  {
    id: "doc-budget",
    path: "accounting/q2-budget.md",
    folder: "accounting",
    nodeType: "compliance",
    title: "Q2 budget",
    summary: "Burn rate, expense tracking, and finance compliance.",
  },
  // vendors/
  {
    id: "doc-pollster",
    path: "vendors/pollster-contract.md",
    folder: "vendors",
    nodeType: "organization",
    title: "Pollster contract",
    summary: "Internal polling vendor scope and spend.",
  },
];

/** Harness skills seeded as wiki pages under `skills/`. */
function skillDocuments(): DemoDocument[] {
  return HARNESS_SKILL_PLAYBOOKS.map((skill) => ({
    id: `skill-${skill.id}`,
    path: `skills/${skill.id}/SKILL.md`,
    folder: "skills" as const,
    nodeType: "task" as const,
    title: skill.title,
    summary: skill.summary,
  }));
}

const ALL_DOCUMENTS = [...DEMO_DOCUMENTS, ...skillDocuments()];

const CROSS_FOLDER_EDGES: DemoEdge[] = [
  // Candidate supports messaging issues.
  { id: "c1", source: "doc-candidate", target: "doc-housing-issue", relationship: "supports" },
  { id: "c2", source: "doc-candidate", target: "doc-transit-issue", relationship: "supports" },
  { id: "c3", source: "doc-candidate", target: "doc-safety-framework", relationship: "supports" },
  { id: "c4", source: "doc-candidate", target: "doc-smallbiz-issue", relationship: "supports" },

  // Issues target voter segments (through folder homes).
  { id: "t1", source: "doc-housing-issue", target: "doc-renters", relationship: "targets" },
  { id: "t2", source: "doc-housing-issue", target: "doc-families", relationship: "targets" },
  { id: "t3", source: "doc-housing-issue", target: "doc-latino", relationship: "targets" },
  { id: "t4", source: "doc-transit-issue", target: "doc-families", relationship: "targets" },
  { id: "t5", source: "doc-transit-issue", target: "doc-seniors", relationship: "targets" },
  { id: "t6", source: "doc-safety-framework", target: "doc-seniors", relationship: "targets" },
  { id: "t7", source: "doc-smallbiz-issue", target: "doc-suburban", relationship: "targets" },

  // Themes align with issues.
  { id: "a1", source: "doc-theme", target: "doc-housing-issue", relationship: "aligns_with" },
  { id: "a2", source: "doc-theme", target: "doc-smallbiz-issue", relationship: "aligns_with" },
  { id: "a3", source: "doc-safety-framework", target: "doc-housing-issue", relationship: "supports" },

  // Research references.
  { id: "o1", source: "doc-opp", target: "doc-candidate", relationship: "opposes" },
  { id: "o2", source: "doc-oppo", target: "doc-opp", relationship: "references" },
  { id: "o3", source: "doc-poll", target: "doc-housing-issue", relationship: "references" },
  { id: "o4", source: "doc-townhall-research", target: "doc-townhall", relationship: "references" },

  // Coalition & assets.
  { id: "o5", source: "doc-chamber", target: "doc-candidate", relationship: "supports" },
  { id: "o6", source: "doc-chamber", target: "doc-smallbiz-issue", relationship: "connected_to" },
  { id: "d1", source: "doc-email", target: "doc-theme", relationship: "derived_from" },
  { id: "d2", source: "doc-onepager", target: "doc-housing-issue", relationship: "derived_from" },
  { id: "d3", source: "doc-video", target: "doc-transit-issue", relationship: "derived_from" },

  // Events target audiences.
  { id: "ev1", source: "doc-townhall", target: "doc-renters", relationship: "targets" },
  { id: "ev2", source: "doc-roundtable", target: "doc-renters", relationship: "targets" },

  // Fundraising.
  { id: "f1", source: "doc-donor", target: "doc-candidate", relationship: "supports" },
  { id: "f2", source: "doc-calltime", target: "doc-donor", relationship: "connected_to" },

  // Field & initiatives.
  { id: "i1", source: "doc-candidate", target: "doc-earlyvote", relationship: "aligns_with" },
  { id: "i2", source: "doc-gotv", target: "doc-earlyvote", relationship: "aligns_with" },
  { id: "i3", source: "doc-turf", target: "doc-union", relationship: "targets" },
  { id: "i4", source: "doc-turf", target: "doc-suburban", relationship: "targets" },
  { id: "i5", source: "doc-volunteers", target: "doc-gotv", relationship: "connected_to" },

  // Skills wire to the folders they operate on.
  { id: "s1", source: "skill-asset-studio", target: "hub-assets", relationship: "connected_to" },
  { id: "s2", source: "skill-compliance-review", target: "hub-compliance", relationship: "connected_to" },
  { id: "s3", source: "skill-research-brief", target: "hub-research", relationship: "connected_to" },
  { id: "s4", source: "skill-fundraising-outreach", target: "hub-fundraising", relationship: "connected_to" },
];

/**
 * Build the full demo knowledge graph: one folder hub per standard
 * `campaign-knowledge/templates/` folder, wiki-style document nodes inside
 * each cluster, and labeled cross-folder edges.
 */
export function buildDemoKnowledgeGraph(): {
  nodes: DbGraphNode[];
  edges: DbGraphEdge[];
} {
  const hubNodes = CAMPAIGN_FOLDERS.filter(
    (folder) => folder.isCluster && folder.id !== "campaign",
  ).map((folder) => hubNode(folder.id));

  const documentNodes = ALL_DOCUMENTS.map((doc) =>
    node(doc.id, doc.nodeType, doc.title, doc.summary, doc.folder, {
      path: doc.path,
      knowledgeKind: "document",
    }),
  );

  const belongsToEdges: DbGraphEdge[] = [];
  let edgeCounter = 0;

  // Every folder hub belongs to the candidate at the centre.
  for (const hub of hubNodes) {
    edgeCounter += 1;
    belongsToEdges.push(
      edge(
        `belongs-hub-${edgeCounter}`,
        hub.id,
        "doc-candidate",
        "belongs_to",
      ),
    );
  }

  // Campaign profile is the centre — no separate campaign/ hub.

  // Every document belongs to its folder hub.
  for (const doc of ALL_DOCUMENTS) {
    edgeCounter += 1;
    belongsToEdges.push(
      edge(`belongs-doc-${edgeCounter}`, doc.id, hubId(doc.folder), "belongs_to"),
    );
  }

  const crossEdges = CROSS_FOLDER_EDGES.map((entry) =>
    edge(entry.id, entry.source, entry.target, entry.relationship),
  );

  return {
    nodes: [...hubNodes, ...documentNodes],
    edges: [...belongsToEdges, ...crossEdges],
  };
}

export const DEMO_GRAPH_NODE_COUNT = (): number =>
  CAMPAIGN_FOLDERS.filter((f) => f.isCluster && f.id !== "campaign").length +
  ALL_DOCUMENTS.length;
