/** Campaign path segments the resolver understands. */
export type CampaignPath =
  | "workspace"
  | "assets"
  | "planner"
  | "research"
  | "fundraising"
  | "compliance"
  | "automations"
  | "settings"
  | "graph";

/** Mirrors Gbrain's AgentMode / functional-area dispatch. */
export type HarnessAgentMode =
  | "campaign-manager"
  | "content-strategist"
  | "researcher"
  | "fundraiser"
  | "compliance-reviewer";

export type ContextChunkKind =
  | "skill"
  | "convention"
  | "campaign-profile"
  | "graph-summary"
  | "module-doc";

/** A slice of context the harness loads before an agent turn. */
export type ContextChunk = {
  id: string;
  kind: ContextChunkKind;
  /** Relative path or logical id (e.g. skills/asset-studio/SKILL.md). */
  source: string;
  title: string;
  summary: string;
  /** Optional pre-loaded body for server-side injection. */
  body?: string;
  priority: number;
};

export type SkillFrontmatter = {
  name: string;
  version?: string;
  description?: string;
  triggers?: string[];
  tools?: string[];
  mutating?: boolean;
};

export type SkillDefinition = {
  id: string;
  directory: string;
  frontmatter: SkillFrontmatter;
  /** Raw markdown body (without frontmatter). */
  body: string;
};

export type ResolverMatch = {
  skillId: string;
  skillPath: string;
  trigger: string;
  confidence: "exact" | "keyword" | "agent-mode" | "fallback";
};

export type ResolverInput = {
  userMessage: string;
  agentMode: HarnessAgentMode;
  campaignPath?: CampaignPath;
  /** Optional graph node id when user @-mentions a node. */
  focusNodeId?: string;
};

export type ResolverOutput = {
  matches: ResolverMatch[];
  contextChunks: ContextChunk[];
  alwaysOnSkillIds: string[];
};

export type HarnessTurnInput = {
  campaignId: string;
  userMessage: string;
  agentMode: HarnessAgentMode;
  campaignPath?: CampaignPath;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
};

export type HarnessTurnPlan = {
  resolver: ResolverOutput;
  systemPreamble: string;
  /** Skill bodies to append to system context (fat skills). */
  skillContext: string;
  /** Deterministic script ids to run before LLM (thin harness). */
  scriptIds: string[];
};
