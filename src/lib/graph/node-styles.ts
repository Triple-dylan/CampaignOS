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
 * Theme-aware accent per node type. Each value is a CSS variable from the
 * curated graph ramp in `globals.css` (light and dark variants), so dots,
 * folder hubs, and badges all pull from one identity system instead of raw
 * palette hexes.
 */
export const GRAPH_NODE_TYPE_ACCENTS: Record<GraphNodeType, string> = {
  candidate: "var(--graph-candidate)",
  issue: "var(--graph-issue)",
  voter_segment: "var(--graph-voter-segment)",
  message_theme: "var(--graph-message-theme)",
  strategic_priority: "var(--graph-strategic-priority)",
  asset: "var(--graph-asset)",
  event: "var(--graph-event)",
  task: "var(--graph-task)",
  research: "var(--graph-research)",
  prospect: "var(--graph-prospect)",
  donor: "var(--graph-donor)",
  organization: "var(--graph-organization)",
  opponent: "var(--graph-opponent)",
  compliance: "var(--graph-compliance)",
};

export const GRAPH_NODE_FALLBACK_ACCENT = "var(--graph-organization)";
