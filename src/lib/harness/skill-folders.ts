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

/**
 * Campaign-knowledge context paths loaded per skill.
 * Paths are relative to the per-campaign knowledge root (wiki-llm convention).
 */
export const SKILL_CONTEXT_PATHS: Record<string, string[]> = {
  "campaign-signals": ["campaign/_context.md"],
  "asset-studio": [
    "assets/_context.md",
    "messaging/_context.md",
    "social-media/_context.md",
  ],
  "research-brief": ["research/_context.md"],
  "fundraising-outreach": ["fundraising/_context.md"],
  "compliance-review": ["compliance/_context.md"],
  automations: ["skills/_context.md"],
  "campaign-manager": [
    "campaign/_context.md",
    "initiatives/_context.md",
    "index.md",
  ],
};

export function graphFoldersForSkill(skillId: string): CampaignFolderId[] {
  return SKILL_GRAPH_FOLDERS[skillId] ?? ["campaign"];
}

export function contextPathsForSkill(skillId: string): string[] {
  return SKILL_CONTEXT_PATHS[skillId] ?? ["index.md"];
}
