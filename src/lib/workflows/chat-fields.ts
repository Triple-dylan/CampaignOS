import type { CampaignWorkflowId } from "@/lib/workflows/registry";

export type WorkflowFieldKey =
  | "intent"
  | "details"
  | "theme"
  | "districtSegments"
  | "issues"
  | "targets";

export type WorkflowFields = Partial<Record<WorkflowFieldKey, string>>;

export type WorkflowCollectStep = {
  field: WorkflowFieldKey;
  prompt: string;
  progressLabel: string;
  /** Returns true when the stored value satisfies this step. */
  isComplete: (fields: WorkflowFields) => boolean;
};

const hasText = (value: string | undefined, min = 3) =>
  Boolean(value && value.trim().length >= min);

export const WORKFLOW_COLLECT_STEPS: Record<
  CampaignWorkflowId,
  WorkflowCollectStep[]
> = {
  "event-research": [
    {
      field: "intent",
      prompt:
        "What event are you preparing for? (town hall, debate, forum, fundraiser, etc.)",
      progressLabel: "Collecting event intent…",
      isComplete: (fields) => hasText(fields.intent),
    },
    {
      field: "details",
      prompt:
        "When is it, where is it, and who will be in the room? Include the date, location, audience, and what the candidate should accomplish.",
      progressLabel: "Collecting event details…",
      isComplete: (fields) => hasText(fields.details, 8),
    },
  ],
  "content-creation": [
    {
      field: "intent",
      prompt:
        "What are we creating and where will it run? (social post, flyer, email, etc.)",
      progressLabel: "Collecting content need…",
      isComplete: (fields) => hasText(fields.intent),
    },
    {
      field: "theme",
      prompt:
        "What theme, issue, or audience should shape this draft? Mention channel (social, email, print) if you know it.",
      progressLabel: "Collecting theme and channel…",
      isComplete: (fields) => hasText(fields.theme, 5),
    },
  ],
  "content-calendar": [
    {
      field: "intent",
      prompt:
        "What period should this content calendar cover? (e.g. October 2026, launch week, month before election)",
      progressLabel: "Collecting calendar period…",
      isComplete: (fields) => hasText(fields.intent, 5),
    },
    {
      field: "details",
      prompt:
        "Which channels should we plan for, and how often? Include Instagram, X, Facebook, email, or print if relevant.",
      progressLabel: "Collecting channels and cadence…",
      isComplete: (fields) => hasText(fields.details, 8),
    },
  ],
  "campaign-structure": [
    {
      field: "districtSegments",
      prompt:
        "Which district or jurisdiction are we planning around, and which voter segments matter most?",
      progressLabel: "Collecting district and segments…",
      isComplete: (fields) => hasText(fields.districtSegments, 8),
    },
    {
      field: "issues",
      prompt:
        "Which key issues should anchor the timeline? Include the election date or target date range if you have it.",
      progressLabel: "Collecting key issues…",
      isComplete: (fields) => hasText(fields.issues, 5),
    },
  ],
  "incumbent-research": [
    {
      field: "intent",
      prompt:
        "Which candidates or incumbents should be compared? Describe the comparison you need.",
      progressLabel: "Collecting comparison request…",
      isComplete: (fields) => hasText(fields.intent),
    },
    {
      field: "targets",
      prompt:
        "Confirm names, office, district, comparison dimensions (record, fundraising, votes, endorsements), and timeframe.",
      progressLabel: "Collecting comparison targets…",
      isComplete: (fields) => hasText(fields.targets, 8),
    },
  ],
};

export function buildEventResearchTopic(fields: WorkflowFields): string {
  return [
    `Event research: ${fields.intent ?? "campaign event"}.`,
    fields.details ?? "",
    "Include a summary, key findings, risks, and suggested talking points.",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 500);
}

export function buildIncumbentResearchTopic(fields: WorkflowFields): string {
  return [
    fields.intent ?? "Candidate comparison.",
    fields.targets ?? "",
    "Label unverified claims clearly and include sources.",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 500);
}

export function inferAssetTypeFromText(text: string): "social_post" | "flyer" | "email" {
  const lower = text.toLowerCase();
  if (lower.includes("email") || lower.includes("newsletter")) return "email";
  if (lower.includes("flyer") || lower.includes("print") || lower.includes("mailer")) {
    return "flyer";
  }
  return "social_post";
}

export function extractThemeAndIssue(text: string): {
  theme?: string;
  issue?: string;
  channel?: string;
} {
  const lower = text.toLowerCase();
  let channel: string | undefined;
  if (lower.includes("instagram") || lower.includes("social")) channel = "social";
  else if (lower.includes("email")) channel = "email";
  else if (lower.includes("print") || lower.includes("flyer")) channel = "print";

  const issueMatch = text.match(/issue[:\s]+([^,.]+)/i);
  const theme = text.trim().slice(0, 100) || undefined;
  return {
    theme,
    issue: issueMatch?.[1]?.trim(),
    channel,
  };
}
