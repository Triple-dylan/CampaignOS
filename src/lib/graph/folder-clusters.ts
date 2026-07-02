import {
  CAMPAIGN_FOLDERS,
  getCampaignFolder,
} from "@/lib/campaign-knowledge/folders";
import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import type { GraphNodeType } from "@/lib/validators/enums";
import {
  GRAPH_NODE_FALLBACK_ACCENT,
  GRAPH_NODE_TYPE_ACCENTS,
} from "@/lib/graph/node-styles";
import type { CampaignGraphNodeData } from "@/lib/graph/to-react-flow";

/**
 * Folder → graph cluster mapping.
 *
 * The campaign knowledge layer (see `src/lib/campaign-knowledge`) groups every
 * document into a standard folder (assets, people, events, fundraising, …).
 * Those folders are the clusters of the live context graph: each one occupies a
 * consistent angular sector around the candidate, carries a consistent accent
 * colour, and lights up as a unit when the assistant reasons about its topic.
 */

/** Stable folder order — drives consistent cluster sector assignment. */
export const FOLDER_CLUSTER_ORDER: CampaignFolderId[] = CAMPAIGN_FOLDERS.map(
  (folder) => folder.id,
);

/** The folder that anchors the graph centre; never gets its own outer sector. */
export const CENTER_FOLDER: CampaignFolderId = "campaign";

/**
 * Each graph node type has a "home" folder so that legacy/DB nodes without
 * explicit folder metadata still cluster sensibly and pick up cluster colours.
 */
export const NODE_TYPE_FOLDER: Record<GraphNodeType, CampaignFolderId> = {
  candidate: "campaign",
  strategic_priority: "initiatives",
  issue: "messaging",
  voter_segment: "people",
  message_theme: "messaging",
  opponent: "research",
  organization: "team",
  asset: "assets",
  event: "events",
  task: "initiatives",
  research: "research",
  prospect: "fundraising",
  donor: "fundraising",
  compliance: "compliance",
};

function isCampaignFolderId(value: unknown): value is CampaignFolderId {
  return (
    typeof value === "string" &&
    FOLDER_CLUSTER_ORDER.includes(value as CampaignFolderId)
  );
}

/** Resolve the cluster folder for a node: explicit metadata wins, else by type. */
export function folderForNode(node: {
  nodeType: GraphNodeType;
  metadata?: Record<string, unknown> | null;
}): CampaignFolderId {
  const fromMetadata = node.metadata?.folder;
  if (isCampaignFolderId(fromMetadata)) {
    return fromMetadata;
  }
  return NODE_TYPE_FOLDER[node.nodeType] ?? CENTER_FOLDER;
}

/** Accent colour (CSS value) for a folder, derived from its primary node type. */
export function folderAccentColor(folderId: CampaignFolderId): string {
  const folder = getCampaignFolder(folderId);
  const primaryType = folder.graphNodeTypes[0];
  return GRAPH_NODE_TYPE_ACCENTS[primaryType] ?? GRAPH_NODE_FALLBACK_ACCENT;
}

/**
 * Angular position (radians) for a folder's cluster centre. Given the set of
 * folders actually present in the graph (so clusters spread evenly instead of
 * leaving gaps for unused folders), folders keep their relative ordering.
 */
export function folderClusterAngles(
  presentFolders: Iterable<CampaignFolderId>,
): Map<CampaignFolderId, number> {
  const present = new Set(presentFolders);
  present.delete(CENTER_FOLDER);

  const ordered = FOLDER_CLUSTER_ORDER.filter((id) => present.has(id));
  const angles = new Map<CampaignFolderId, number>();
  const count = Math.max(ordered.length, 1);

  ordered.forEach((id, index) => {
    // Slight offset so the first cluster isn't pinned to 3 o'clock.
    angles.set(id, (index / count) * Math.PI * 2 - Math.PI / 2);
  });

  return angles;
}

/* ------------------------------------------------------------------ *
 * Chat keyword → folder routing
 *
 * A lightweight, demo-friendly intent map: when the user mentions a topic in
 * chat, we light up the matching cluster(s). This is intentionally simple
 * (keyword contains) and is the seam where a real resolver / harness would
 * later supply "active paths" instead.
 * ------------------------------------------------------------------ */
const FOLDER_KEYWORDS: Partial<Record<CampaignFolderId, string[]>> = {
  campaign: ["candidate", "campaign", "office", "race", "election"],
  messaging: [
    "message",
    "messaging",
    "theme",
    "talking point",
    "tagline",
    "issue",
    "position",
    "stance",
    "slogan",
  ],
  fundraising: [
    "fundrais",
    "donor",
    "money",
    "raise",
    "call time",
    "ask",
    "contribution",
    "budget goal",
    "max-out",
    "host",
  ],
  events: [
    "event",
    "town hall",
    "rally",
    "house party",
    "canvass kickoff",
    "schedule",
    "calendar",
  ],
  people: [
    "voter",
    "segment",
    "renter",
    "famil",
    "senior",
    "audience",
    "constituen",
    "people",
    "stakeholder",
  ],
  assets: [
    "asset",
    "email",
    "one-pager",
    "onepager",
    "flyer",
    "mail",
    "creative",
    "graphic",
    "draft",
    "design",
  ],
  research: [
    "research",
    "poll",
    "opponent",
    "opposition",
    "incumbent",
    "brief",
    "intel",
    "record",
  ],
  initiatives: [
    "initiative",
    "gotv",
    "turnout",
    "program",
    "priority",
    "strategy",
    "task",
    "volunteer",
    "field",
  ],
  team: ["team", "staff", "consultant", "volunteer", "org chart", "role"],
  compliance: [
    "complian",
    "pdc",
    "fec",
    "disclosure",
    "review",
    "legal",
    "filing",
  ],
  "social-media": ["social", "instagram", "twitter", "facebook", "tiktok", "post"],
  accounting: ["accounting", "budget", "burn rate", "expense", "spend"],
};

/** Match free text to the campaign folders it most likely refers to. */
export function foldersForText(text: string): CampaignFolderId[] {
  const haystack = text.toLowerCase();
  const matches: CampaignFolderId[] = [];
  for (const [folderId, keywords] of Object.entries(FOLDER_KEYWORDS)) {
    if (keywords?.some((keyword) => haystack.includes(keyword))) {
      matches.push(folderId as CampaignFolderId);
    }
  }
  return matches;
}

/**
 * Given the graph and a set of focus folders, return the node ids that belong
 * to those clusters — used to highlight a cluster from a chat message or rail.
 */
export function nodeIdsForFolders(
  nodes: Array<{ id: string; data: CampaignGraphNodeData }>,
  folders: Iterable<CampaignFolderId>,
): Set<string> {
  const focus = new Set(folders);
  const ids = new Set<string>();
  if (focus.size === 0) return ids;
  for (const node of nodes) {
    if (focus.has(folderForNode(node.data))) {
      ids.add(node.id);
    }
  }
  return ids;
}
