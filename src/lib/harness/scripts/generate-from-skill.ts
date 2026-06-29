import type { HarnessResolverPlan } from "@/lib/harness/types";

export type GenerateFromSkillInput = {
  campaignId: string;
  skillId: string;
  userMessage: string;
  plan?: HarnessResolverPlan;
};

export type GenerateFromSkillStep = {
  phase: string;
  action: string;
  toolOrScript?: string;
};

export type GenerateFromSkillOutput = {
  campaignId: string;
  skillId: string;
  /** Documents the skill execution flow — callers invoke real generators per step. */
  flow: GenerateFromSkillStep[];
  recommendedModule: string;
  destinationFolder: string;
  note: string;
};

const SKILL_FLOWS: Record<
  string,
  { steps: GenerateFromSkillStep[]; module: string; folder: string }
> = {
  "research-brief": {
    module: "research",
    folder: "research",
    steps: [
      { phase: "Scope", action: "Clarify geography, office, and research target" },
      {
        phase: "Compile",
        action: "Load research/_context.md and index.md",
        toolOrScript: "list-research-context",
      },
      {
        phase: "Generate",
        action: "Invoke generateResearchBriefContent",
        toolOrScript: "generateResearchBriefContent",
      },
      {
        phase: "Store",
        action: "Write brief to Research module and sync graph",
        toolOrScript: "sync-folder-to-graph",
      },
    ],
  },
  "asset-studio": {
    module: "assets",
    folder: "assets",
    steps: [
      { phase: "Brain-first", action: "Load campaign profile and recent assets" },
      {
        phase: "Draft",
        action: "Invoke generateAssetContent",
        toolOrScript: "generateAssetContent",
      },
      { phase: "Compliance", action: "Apply skills/conventions/compliance.md" },
      {
        phase: "Graph sync",
        action: "Create asset record and sync folder cluster",
        toolOrScript: "sync-folder-to-graph",
      },
    ],
  },
  "campaign-manager": {
    module: "planner",
    folder: "initiatives",
    steps: [
      { phase: "Situation scan", action: "Load profile, graph summary, module context" },
      { phase: "Prioritize", action: "Return 3–5 concrete weekly priorities" },
      {
        phase: "Connect graph",
        action: "Highlight related clusters and recommend new nodes",
        toolOrScript: "sync-folder-to-graph",
      },
    ],
  },
  "fundraising-outreach": {
    module: "fundraising",
    folder: "fundraising",
    steps: [
      { phase: "Prospect context", action: "Load prospect record when named" },
      {
        phase: "Draft ask",
        action: "Invoke generateProspectOutreachContent",
        toolOrScript: "generateProspectOutreachContent",
      },
      { phase: "Compliance", action: "Flag contribution limits and disclaimers" },
    ],
  },
  "compliance-review": {
    module: "compliance",
    folder: "compliance",
    steps: [
      { phase: "Load conventions", action: "Read skills/conventions/compliance.md" },
      { phase: "Review", action: "Check copy for disclaimer and recordkeeping gaps" },
      { phase: "Escalate", action: "Recommend qualified election-law counsel" },
    ],
  },
};

/**
 * Stub that documents skill execution flow for harness scripts.
 * Real LLM judgment stays in skill Phases; this returns deterministic routing.
 */
export async function generateFromSkill(
  input: GenerateFromSkillInput,
): Promise<GenerateFromSkillOutput> {
  const flowDef =
    SKILL_FLOWS[input.skillId] ??
    ({
      module: "workspace",
      folder: "campaign",
      steps: [
        {
          phase: "Resolve",
          action: `Load skills/${input.skillId}/SKILL.md and follow Phases`,
        },
        {
          phase: "Context",
          action: "Run list-campaign-context for resolved chunks",
          toolOrScript: "list-campaign-context",
        },
      ],
    } satisfies (typeof SKILL_FLOWS)[string]);

  return {
    campaignId: input.campaignId,
    skillId: input.skillId,
    flow: flowDef.steps,
    recommendedModule: flowDef.module,
    destinationFolder: flowDef.folder,
    note:
      "Harness stub: merge flow steps into skill Phases. Invoke toolOrScript entries via runHarnessScripts or src/lib/ai/generate-*.ts.",
  };
}
