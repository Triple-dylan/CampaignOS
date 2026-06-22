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

/** Tailwind classes for node card borders and badges by type. */
export const GRAPH_NODE_TYPE_STYLES: Record<
  GraphNodeType,
  { border: string; badge: string }
> = {
  candidate: {
    border: "border-violet-400 dark:border-violet-600",
    badge: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  },
  issue: {
    border: "border-blue-400 dark:border-blue-600",
    badge: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  },
  voter_segment: {
    border: "border-cyan-400 dark:border-cyan-600",
    badge: "bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200",
  },
  message_theme: {
    border: "border-indigo-400 dark:border-indigo-600",
    badge: "bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200",
  },
  strategic_priority: {
    border: "border-purple-400 dark:border-purple-600",
    badge: "bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200",
  },
  asset: {
    border: "border-emerald-400 dark:border-emerald-600",
    badge: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  },
  event: {
    border: "border-amber-400 dark:border-amber-600",
    badge: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  },
  task: {
    border: "border-orange-400 dark:border-orange-600",
    badge: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  },
  research: {
    border: "border-sky-400 dark:border-sky-600",
    badge: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  },
  prospect: {
    border: "border-pink-400 dark:border-pink-600",
    badge: "bg-pink-100 text-pink-900 dark:bg-pink-950 dark:text-pink-200",
  },
  donor: {
    border: "border-rose-400 dark:border-rose-600",
    badge: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
  },
  organization: {
    border: "border-slate-400 dark:border-slate-600",
    badge: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200",
  },
  opponent: {
    border: "border-red-400 dark:border-red-600",
    badge: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  },
  compliance: {
    border: "border-yellow-400 dark:border-yellow-600",
    badge: "bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200",
  },
};

export const GRAPH_NODE_MINIMAP_COLORS: Record<GraphNodeType, string> = {
  candidate: "#8b5cf6",
  issue: "#3b82f6",
  voter_segment: "#06b6d4",
  message_theme: "#6366f1",
  strategic_priority: "#a855f7",
  asset: "#10b981",
  event: "#f59e0b",
  task: "#f97316",
  research: "#0ea5e9",
  prospect: "#ec4899",
  donor: "#f43f5e",
  organization: "#64748b",
  opponent: "#ef4444",
  compliance: "#eab308",
};
