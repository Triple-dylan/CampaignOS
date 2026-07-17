import type { GraphNodeType } from "@/lib/validators/enums";

export const GRAPH_NODE_TYPE_LABELS: Record<GraphNodeType, string> = {
  candidate: "Candidate",
  issue: "Issue",
  voter_segment: "Voter segment",
  donor: "Donor",
  prospect: "Prospect",
  organization: "Organization",
  event: "Event",
  asset: "Asset",
  research: "Research",
  task: "Task",
  opponent: "Opponent",
  compliance: "Compliance",
  message_theme: "Message theme",
  strategic_priority: "Strategic priority",
};

/**
 * Single accent ramp for the knowledge graph. Hex (not CSS vars) so the same
 * values paint React Flow dots, folder color-group defaults, and the 3D
 * WebGL canvas. Tuned as one family — brand blue for issues, brand red for
 * opponents — instead of a Tailwind rainbow.
 */
export const GRAPH_NODE_TYPE_ACCENTS: Record<GraphNodeType, string> = {
  candidate: "#7c5cbf",
  issue: "#3b6fd9",
  voter_segment: "#2f9bb0",
  message_theme: "#5b6fd6",
  strategic_priority: "#8b5aad",
  asset: "#2f9a7a",
  event: "#c48a2a",
  task: "#c46b2a",
  research: "#3a8fc4",
  prospect: "#c45a8a",
  donor: "#c44a5a",
  organization: "#6b7280",
  opponent: "#c43a3a",
  compliance: "#b89a2a",
};

export const GRAPH_NODE_FALLBACK_ACCENT = "#6b7280";

/** @deprecated Prefer GRAPH_NODE_TYPE_ACCENTS — kept as an alias for callers. */
export const GRAPH_NODE_MINIMAP_COLORS = GRAPH_NODE_TYPE_ACCENTS;
