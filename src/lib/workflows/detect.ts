import type { CampaignWorkflowId } from "@/lib/workflows/registry";

/** Client-safe workflow triggers — mirror of skills/RESOLVER.md workflow table. */
const WORKFLOW_TRIGGERS: Array<{
  workflowId: CampaignWorkflowId;
  triggers: string[];
}> = [
  {
    workflowId: "event-research",
    triggers: [
      "event research",
      "town hall prep",
      "event brief",
      "prepare for event",
      "town hall",
      "debate prep",
      "forum prep",
      "house party prep",
    ],
  },
  {
    workflowId: "content-creation",
    triggers: [
      "content creation",
      "create content",
      "write a post",
      "draft content",
      "social post",
      "draft a flyer",
      "write an email",
    ],
  },
  {
    workflowId: "content-calendar",
    triggers: [
      "content calendar",
      "posting schedule",
      "social calendar",
      "schedule posts",
      "build my calendar",
      "content schedule",
    ],
  },
  {
    workflowId: "campaign-structure",
    triggers: [
      "campaign structure",
      "campaign timeline",
      "build a plan",
      "voter segments",
      "plan the campaign",
      "election timeline",
    ],
  },
  {
    workflowId: "incumbent-research",
    triggers: [
      "incumbent research",
      "compare candidates",
      "opponent comparison",
      "incumbent report",
      "opposition research",
      "candidate comparison",
    ],
  },
];

function normalizeMessage(message: string): string {
  return message.toLowerCase().trim();
}

function matchTriggers(message: string, triggers: string[]): boolean {
  return triggers.some((trigger) => message.includes(trigger.toLowerCase()));
}

/** Detect a campaign workflow from user chat text (client-safe). */
export function detectWorkflowFromMessage(
  message: string,
): CampaignWorkflowId | null {
  const normalized = normalizeMessage(message);
  for (const row of WORKFLOW_TRIGGERS) {
    if (matchTriggers(normalized, row.triggers)) {
      return row.workflowId;
    }
  }
  return null;
}

/** True when the user wants to abandon the active guided workflow. */
export function isWorkflowCancelMessage(message: string): boolean {
  const normalized = normalizeMessage(message);
  return (
    normalized === "cancel" ||
    normalized === "stop" ||
    normalized === "exit" ||
    normalized.startsWith("cancel workflow") ||
    normalized.startsWith("never mind")
  );
}
