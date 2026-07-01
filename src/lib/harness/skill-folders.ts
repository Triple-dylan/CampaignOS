import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import type { CampaignWorkflowId } from "@/lib/workflows/registry";

/** Skill → campaign-knowledge folders for graph cluster highlights. */
export const SKILL_GRAPH_FOLDERS: Record<string, CampaignFolderId[]> = {
  "campaign-signals": ["campaign"],
  "asset-studio": ["assets", "messaging", "social-media", "communications"],
  "research-brief": ["research", "polling", "people"],
  "fundraising-outreach": ["fundraising", "people"],
  "compliance-review": ["compliance", "accounting"],
  automations: ["skills"],
  "campaign-manager": ["campaign", "initiatives", "field", "events"],
};

/** Workflow registry → graph folders (resolver workflow table mirror). */
export const WORKFLOW_GRAPH_FOLDERS: Record<CampaignWorkflowId, CampaignFolderId[]> =
  {
    "event-research": ["research", "events"],
    "content-creation": ["assets", "messaging", "social-media"],
    "content-calendar": ["social-media", "events", "messaging"],
    "campaign-structure": ["campaign", "initiatives", "field"],
    "incumbent-research": ["research", "people", "polling"],
  };

/** Campaign-knowledge context paths loaded per skill. */
export const SKILL_CONTEXT_PATHS: Record<string, string[]> = {
  "campaign-signals": ["campaign-knowledge/templates/campaign/_context.md"],
  "asset-studio": [
    "campaign-knowledge/templates/assets/_context.md",
    "campaign-knowledge/templates/messaging/_context.md",
    "campaign-knowledge/templates/social-media/_context.md",
  ],
  "research-brief": ["campaign-knowledge/templates/research/_context.md"],
  "fundraising-outreach": [
    "campaign-knowledge/templates/fundraising/_context.md",
  ],
  "compliance-review": [
    "campaign-knowledge/templates/compliance/_context.md",
  ],
  automations: ["campaign-knowledge/templates/skills/_context.md"],
  "campaign-manager": [
    "campaign-knowledge/templates/campaign/_context.md",
    "campaign-knowledge/templates/initiatives/_context.md",
  ],
};

export function graphFoldersForSkill(skillId: string): CampaignFolderId[] {
  return SKILL_GRAPH_FOLDERS[skillId] ?? ["campaign"];
}

export function contextPathsForSkill(skillId: string): string[] {
  return SKILL_CONTEXT_PATHS[skillId] ?? ["campaign-knowledge/templates/index.md"];
}
