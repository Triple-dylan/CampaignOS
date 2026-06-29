/**
 * Canonical harness skill playbooks (Gbrain SKILL.md pattern).
 * Mirrors `src/lib/harness/skills/RESOLVER.md` — used by the demo knowledge
 * graph to seed the `skills/` folder cluster.
 */
export type HarnessSkillPlaybook = {
  id: string;
  /** Relative path under `src/lib/harness/`. */
  path: string;
  title: string;
  summary: string;
};

export const HARNESS_SKILL_PLAYBOOKS: readonly HarnessSkillPlaybook[] = [
  {
    id: "asset-studio",
    path: "skills/asset-studio/SKILL.md",
    title: "Asset Studio",
    summary: "Draft on-brand creative, social posts, scripts, and copy.",
  },
  {
    id: "research-brief",
    path: "skills/research-brief/SKILL.md",
    title: "Research brief",
    summary: "Synthesize district intel, opposition research, and voter segments.",
  },
  {
    id: "fundraising-outreach",
    path: "skills/fundraising-outreach/SKILL.md",
    title: "Fundraising outreach",
    summary: "Build call-time lists, donor asks, and prospect outreach.",
  },
  {
    id: "compliance-review",
    path: "skills/compliance-review/SKILL.md",
    title: "Compliance review",
    summary: "PDC/FEC disclosure checks and content compliance review.",
  },
  {
    id: "campaign-manager",
    path: "skills/campaign-manager/SKILL.md",
    title: "Campaign manager",
    summary: "Prioritize weekly focus, strategy, and cross-module coordination.",
  },
  {
    id: "automations",
    path: "skills/automations/SKILL.md",
    title: "Automations",
    summary: "Schedule recurring workflows and cron-style campaign tasks.",
  },
  {
    id: "campaign-signals",
    path: "skills/campaign-signals/SKILL.md",
    title: "Campaign signals",
    summary: "Always-on signal detection across the campaign knowledge graph.",
  },
] as const;
