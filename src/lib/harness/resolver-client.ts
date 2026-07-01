import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import {
  contextPathsForSkill,
  graphFoldersForSkill,
  WORKFLOW_GRAPH_FOLDERS,
} from "@/lib/harness/skill-folders";
import type { HarnessAgentMode } from "@/lib/harness/types";
import type { CampaignWorkflowId } from "@/lib/workflows/registry";

/** Client-safe trigger rows — mirror of skills/RESOLVER.md (no fs). */
const ROUTING_TRIGGERS: Array<{ triggers: string[]; skillId: string }> = [
  {
    triggers: ["draft", "social post", "script", "stump speech", "asset", "copy", "message"],
    skillId: "asset-studio",
  },
  {
    triggers: ["research", "opposition", "district", "intel", "brief", "voter segment"],
    skillId: "research-brief",
  },
  {
    triggers: ["donor", "fundraising", "call time", "ask", "prospect", "pipeline"],
    skillId: "fundraising-outreach",
  },
  {
    triggers: ["compliance", "disclaimer", "disclosure", "fec", "recordkeeping"],
    skillId: "compliance-review",
  },
  {
    triggers: ["schedule", "automate", "cron", "/schedule"],
    skillId: "automations",
  },
  {
    triggers: ["prioritize", "this week", "focus", "plan", "strategy"],
    skillId: "campaign-manager",
  },
];

const WORKFLOW_TRIGGERS: Array<{
  workflowId: CampaignWorkflowId;
  triggers: string[];
  skillId: string;
}> = [
  {
    workflowId: "event-research",
    triggers: ["event research", "town hall prep", "event brief", "prepare for event"],
    skillId: "research-brief",
  },
  {
    workflowId: "content-creation",
    triggers: ["content creation", "create content", "write a post", "draft content"],
    skillId: "asset-studio",
  },
  {
    workflowId: "campaign-structure",
    triggers: ["campaign structure", "campaign timeline", "build a plan", "voter segments"],
    skillId: "campaign-manager",
  },
  {
    workflowId: "incumbent-research",
    triggers: ["incumbent research", "compare candidates", "opponent comparison", "incumbent report"],
    skillId: "research-brief",
  },
];

const AGENT_MODE_SKILL: Record<HarnessAgentMode, string> = {
  "campaign-manager": "campaign-manager",
  "content-strategist": "asset-studio",
  researcher: "research-brief",
  fundraiser: "fundraising-outreach",
  "compliance-reviewer": "compliance-review",
};

function normalizeMessage(message: string): string {
  return message.toLowerCase().trim();
}

function matchTriggers(message: string, triggers: string[]): boolean {
  return triggers.some((trigger) => message.includes(trigger.toLowerCase()));
}

export type ClientHarnessPlan = {
  skillId: string;
  workflowId: CampaignWorkflowId | null;
  graphFolders: CampaignFolderId[];
  contextPaths: string[];
};

/**
 * Client-safe harness plan (no RESOLVER.md fs read).
 * Mirrors server resolver for optimistic graph highlights while a turn is in flight.
 */
export function resolveHarnessPlanClient(
  userMessage: string,
  agentMode: HarnessAgentMode = "campaign-manager",
): ClientHarnessPlan {
  const message = normalizeMessage(userMessage);

  let workflowId: CampaignWorkflowId | null = null;
  let skillId = AGENT_MODE_SKILL[agentMode];

  for (const row of WORKFLOW_TRIGGERS) {
    if (matchTriggers(message, row.triggers)) {
      workflowId = row.workflowId;
      skillId = row.skillId;
      break;
    }
  }

  if (!workflowId) {
    for (const row of ROUTING_TRIGGERS) {
      if (matchTriggers(message, row.triggers)) {
        skillId = row.skillId;
        break;
      }
    }
  }

  const folders = new Set<CampaignFolderId>(graphFoldersForSkill(skillId));
  if (workflowId) {
    for (const folder of WORKFLOW_GRAPH_FOLDERS[workflowId]) {
      folders.add(folder);
    }
  }

  return {
    skillId,
    workflowId,
    graphFolders: [...folders],
    contextPaths: contextPathsForSkill(skillId),
  };
}

/**
 * Client-safe graph folder resolution (no RESOLVER.md fs read).
 * Server-side chat uses resolveCampaignContext for the authoritative plan.
 */
export function resolveGraphFoldersClient(
  userMessage: string,
  agentMode: HarnessAgentMode = "campaign-manager",
): CampaignFolderId[] {
  return resolveHarnessPlanClient(userMessage, agentMode).graphFolders;
}
