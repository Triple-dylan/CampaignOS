import type {
  CampaignPath,
  ContextChunk,
  HarnessAgentMode,
  ResolverInput,
  ResolverOutput,
} from "@/lib/harness/types";

/**
 * Static routing table inspired by Gbrain's RESOLVER.md.
 * Markdown source of truth: skills/RESOLVER.md (human-editable).
 * This module is the deterministic runtime mirror for server-side context injection.
 */

type ResolverRow = {
  triggers: string[];
  skillId: string;
  skillPath: string;
};

const ALWAYS_ON: ResolverRow[] = [
  {
    triggers: ["*"],
    skillId: "campaign-signals",
    skillPath: "skills/campaign-signals/SKILL.md",
  },
];

const ROUTING_TABLE: ResolverRow[] = [
  {
    triggers: [
      "draft",
      "social post",
      "script",
      "stump speech",
      "asset",
      "copy",
      "message",
    ],
    skillId: "asset-studio",
    skillPath: "skills/asset-studio/SKILL.md",
  },
  {
    triggers: [
      "research",
      "opposition",
      "district",
      "intel",
      "brief",
      "voter segment",
    ],
    skillId: "research-brief",
    skillPath: "skills/research-brief/SKILL.md",
  },
  {
    triggers: [
      "donor",
      "fundraising",
      "call time",
      "ask",
      "prospect",
      "pipeline",
    ],
    skillId: "fundraising-outreach",
    skillPath: "skills/fundraising-outreach/SKILL.md",
  },
  {
    triggers: [
      "compliance",
      "disclaimer",
      "disclosure",
      "fec",
      "legal",
      "recordkeeping",
    ],
    skillId: "compliance-review",
    skillPath: "skills/compliance-review/SKILL.md",
  },
  {
    triggers: ["schedule", "automate", "cron", "weekly", "daily"],
    skillId: "automations",
    skillPath: "skills/automations/SKILL.md",
  },
  {
    triggers: ["prioritize", "this week", "focus", "plan", "strategy"],
    skillId: "campaign-manager",
    skillPath: "skills/campaign-manager/SKILL.md",
  },
];

const AGENT_MODE_DEFAULTS: Record<HarnessAgentMode, ResolverRow> = {
  "campaign-manager": {
    triggers: [],
    skillId: "campaign-manager",
    skillPath: "skills/campaign-manager/SKILL.md",
  },
  "content-strategist": {
    triggers: [],
    skillId: "asset-studio",
    skillPath: "skills/asset-studio/SKILL.md",
  },
  researcher: {
    triggers: [],
    skillId: "research-brief",
    skillPath: "skills/research-brief/SKILL.md",
  },
  fundraiser: {
    triggers: [],
    skillId: "fundraising-outreach",
    skillPath: "skills/fundraising-outreach/SKILL.md",
  },
  "compliance-reviewer": {
    triggers: [],
    skillId: "compliance-review",
    skillPath: "skills/compliance-review/SKILL.md",
  },
};

const PATH_CONTEXT: Record<
  CampaignPath,
  Pick<ContextChunk, "id" | "title" | "summary" | "source">
> = {
  workspace: {
    id: "ctx-workspace",
    title: "Workspace",
    summary: "Campaign home, graph canvas, and chat dock.",
    source: "modules/workspace",
  },
  assets: {
    id: "ctx-assets",
    title: "Asset Studio",
    summary: "Draft messaging, social posts, scripts, and creative assets.",
    source: "modules/assets",
  },
  planner: {
    id: "ctx-planner",
    title: "Planner",
    summary: "Events, canvasses, phone banks, and field schedule.",
    source: "modules/planner",
  },
  research: {
    id: "ctx-research",
    title: "Research",
    summary: "District intel, opposition research, and message testing.",
    source: "modules/research",
  },
  fundraising: {
    id: "ctx-fundraising",
    title: "Fundraising",
    summary: "Donor prospects, call sheets, and outreach drafts.",
    source: "modules/fundraising",
  },
  compliance: {
    id: "ctx-compliance",
    title: "Compliance",
    summary: "Disclaimers, disclosures, and recordkeeping flags.",
    source: "modules/compliance",
  },
  automations: {
    id: "ctx-automations",
    title: "Automations",
    summary: "Scheduled agent runs and recurring campaign tasks.",
    source: "modules/automations",
  },
  settings: {
    id: "ctx-settings",
    title: "Settings",
    summary: "Campaign profile, brand tone, and integrations.",
    source: "modules/settings",
  },
  graph: {
    id: "ctx-graph",
    title: "Knowledge Graph",
    summary: "Nodes and edges linking assets, events, research, and donors.",
    source: "modules/graph",
  },
};

function normalizeMessage(message: string): string {
  return message.toLowerCase().trim();
}

function matchTriggers(message: string, triggers: string[]): string | null {
  for (const trigger of triggers) {
    if (trigger === "*") return "*";
    if (message.includes(trigger.toLowerCase())) return trigger;
  }
  return null;
}

function rowToMatch(
  row: ResolverRow,
  trigger: string,
  confidence: ResolverOutput["matches"][number]["confidence"],
): ResolverOutput["matches"][number] {
  return {
    skillId: row.skillId,
    skillPath: row.skillPath,
    trigger,
    confidence,
  };
}

function pathContextChunk(path: CampaignPath): ContextChunk {
  const meta = PATH_CONTEXT[path];
  return {
    ...meta,
    kind: "module-doc",
    priority: 10,
  };
}

/**
 * Resolve user intent + campaign path to skill matches and context chunks.
 * Pattern: Gbrain RESOLVER.md → load skills + conventions on demand.
 */
export function resolveCampaignContext(input: ResolverInput): ResolverOutput {
  const message = normalizeMessage(input.userMessage);
  const matches: ResolverOutput["matches"] = [];
  const seenSkills = new Set<string>();

  for (const row of ROUTING_TABLE) {
    const trigger = matchTriggers(message, row.triggers);
    if (trigger && !seenSkills.has(row.skillId)) {
      matches.push(rowToMatch(row, trigger, "keyword"));
      seenSkills.add(row.skillId);
    }
  }

  if (matches.length === 0) {
    const fallback = AGENT_MODE_DEFAULTS[input.agentMode];
    matches.push(rowToMatch(fallback, input.agentMode, "agent-mode"));
    seenSkills.add(fallback.skillId);
  }

  const contextChunks: ContextChunk[] = [
    {
      id: "conv-compliance",
      kind: "convention",
      source: "skills/conventions/compliance.md",
      title: "Compliance conventions",
      summary: "Non-negotiable disclaimer and recordkeeping rules for all outbound content.",
      priority: 100,
    },
  ];

  if (input.campaignPath) {
    contextChunks.push(pathContextChunk(input.campaignPath));
  }

  contextChunks.push({
    id: "ctx-campaign-profile",
    kind: "campaign-profile",
    source: "db:campaign_profile",
    title: "Campaign profile",
    summary: "Candidate, office, jurisdiction, message framework, and top issues.",
    priority: 90,
  });

  contextChunks.push({
    id: "ctx-graph-summary",
    kind: "graph-summary",
    source: "db:graph_nodes",
    title: "Knowledge graph",
    summary: "Recent nodes and relationships from the campaign graph.",
    priority: 80,
  });

  for (const match of matches) {
    contextChunks.push({
      id: `skill-${match.skillId}`,
      kind: "skill",
      source: match.skillPath,
      title: match.skillId,
      summary: `Load skill for trigger: ${match.trigger}`,
      priority: 70,
    });
  }

  contextChunks.sort((a, b) => b.priority - a.priority);

  return {
    matches,
    contextChunks,
    alwaysOnSkillIds: ALWAYS_ON.map((row) => row.skillId),
  };
}

/** List all registered skill paths (for validation tooling). */
export function listRegisteredSkillPaths(): string[] {
  const paths = new Set<string>();
  for (const row of [...ALWAYS_ON, ...ROUTING_TABLE, ...Object.values(AGENT_MODE_DEFAULTS)]) {
    paths.add(row.skillPath);
  }
  return [...paths].sort();
}
