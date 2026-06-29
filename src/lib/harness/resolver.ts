import { readFileSync } from "node:fs";
import path from "node:path";
import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import {
  contextPathsForSkill,
  graphFoldersForSkill,
  WORKFLOW_GRAPH_FOLDERS,
} from "@/lib/harness/skill-folders";
import {
  parseResolverMarkdown,
  type ParsedResolver,
  type ParsedResolverRow,
} from "@/lib/harness/parse-resolver-md";
import type {
  CampaignPath,
  ContextChunk,
  HarnessAgentMode,
  HarnessResolverPlan,
  ResolverInput,
  ResolverOutput,
} from "@/lib/harness/types";
import type { CampaignWorkflowId } from "@/lib/workflows/registry";

const HARNESS_ROOT = path.join(process.cwd(), "src/lib/harness");
const RESOLVER_MD_PATH = path.join(HARNESS_ROOT, "skills/RESOLVER.md");

let cachedParsed: ParsedResolver | null = null;

function loadParsedResolver(): ParsedResolver {
  if (cachedParsed) return cachedParsed;
  const markdown = readFileSync(RESOLVER_MD_PATH, "utf8");
  cachedParsed = parseResolverMarkdown(markdown);
  return cachedParsed;
}

/** Client-safe resolver table (no fs) — mirrors last parsed RESOLVER.md. */
export function getResolverTable(): ParsedResolver {
  return loadParsedResolver();
}

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
  row: ParsedResolverRow,
  trigger: string,
  confidence: ResolverOutput["matches"][number]["confidence"],
): ResolverOutput["matches"][number] {
  return {
    skillId: row.skillId,
    skillPath: row.skillPath,
    trigger,
    confidence,
    scripts: row.scripts,
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

function matchWorkflow(
  message: string,
  parsed: ParsedResolver,
): CampaignWorkflowId | null {
  for (const row of parsed.workflows) {
    if (matchTriggers(message, row.triggers)) {
      return row.workflowId as CampaignWorkflowId;
    }
  }
  return null;
}

function buildPlan(
  primarySkillId: string,
  scripts: string[],
  workflowId: CampaignWorkflowId | null,
): HarnessResolverPlan {
  const workflowFolders = workflowId
    ? WORKFLOW_GRAPH_FOLDERS[workflowId]
    : null;
  const skillFolders = graphFoldersForSkill(primarySkillId);
  const graphFoldersToHighlight = dedupeFolders([
    ...(workflowFolders ?? []),
    ...skillFolders,
  ]);

  return {
    skillId: primarySkillId,
    scripts: dedupeStrings(scripts),
    contextPaths: contextPathsForSkill(primarySkillId),
    graphFoldersToHighlight,
    workflowId,
  };
}

function dedupeFolders(folders: CampaignFolderId[]): CampaignFolderId[] {
  return [...new Set(folders)];
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values)];
}

/**
 * Resolve user intent + campaign path to skill matches, context chunks, and
 * a structured plan (Gbrain RESOLVER.md → skill → scripts → graph folders).
 */
export function resolveCampaignContext(input: ResolverInput): ResolverOutput {
  const parsed = loadParsedResolver();
  const message = normalizeMessage(input.userMessage);
  const matches: ResolverOutput["matches"] = [];
  const seenSkills = new Set<string>();

  const workflowId = matchWorkflow(message, parsed);

  for (const row of parsed.routing) {
    const trigger = matchTriggers(message, row.triggers);
    if (trigger && !seenSkills.has(row.skillId)) {
      matches.push(rowToMatch(row, trigger, "keyword"));
      seenSkills.add(row.skillId);
    }
  }

  if (matches.length === 0) {
    const fallback =
      parsed.agentModeDefaults[input.agentMode] ??
      parsed.agentModeDefaults["campaign-manager"];
    if (fallback) {
      matches.push(rowToMatch(fallback, input.agentMode, "agent-mode"));
      seenSkills.add(fallback.skillId);
    }
  }

  if (workflowId) {
    const workflowRow = parsed.workflows.find((row) => row.workflowId === workflowId);
    if (workflowRow) {
      const workflowMatch = {
        skillId: workflowRow.skillId,
        skillPath: `skills/${workflowRow.skillId}/SKILL.md`,
        trigger: workflowId,
        confidence: "exact" as const,
        scripts:
          parsed.routing.find((row) => row.skillId === workflowRow.skillId)
            ?.scripts ?? ["list-campaign-context"],
      };
      matches.unshift(workflowMatch);
      seenSkills.add(workflowRow.skillId);
    }
  }

  const primaryMatch = matches[0];
  const primarySkillId = primaryMatch?.skillId ?? "campaign-manager";
  const defaultScripts =
    primaryMatch?.scripts && primaryMatch.scripts.length > 0
      ? primaryMatch.scripts
      : ["list-campaign-context"];

  const plan = buildPlan(primarySkillId, defaultScripts, workflowId);

  const contextChunks: ContextChunk[] = [
    {
      id: "conv-compliance",
      kind: "convention",
      source: "skills/conventions/compliance.md",
      title: "Compliance conventions",
      summary:
        "Non-negotiable disclaimer and recordkeeping rules for all outbound content.",
      priority: 100,
    },
  ];

  if (input.campaignPath) {
    contextChunks.push(pathContextChunk(input.campaignPath));
  }

  for (const contextPath of plan.contextPaths) {
    contextChunks.push({
      id: `ctx-path-${contextPath.replace(/\W+/g, "-")}`,
      kind: "module-doc",
      source: contextPath,
      title: contextPath.split("/").slice(-2, -1)[0] ?? "campaign-knowledge",
      summary: `Wiki-llm folder context for ${primarySkillId}.`,
      priority: 85,
    });
  }

  contextChunks.push({
    id: "ctx-campaign-profile",
    kind: "campaign-profile",
    source: "db:campaign_profile",
    title: "Campaign profile",
    summary:
      "Candidate, office, jurisdiction, message framework, and top issues.",
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
    alwaysOnSkillIds: parsed.alwaysOn.map((row) => row.skillId),
    plan,
    graphFoldersToHighlight: plan.graphFoldersToHighlight,
  };
}

/** Client-safe: resolve graph folder highlights from message + agent mode. */
export function resolveGraphFoldersFromMessage(
  userMessage: string,
  agentMode: HarnessAgentMode = "campaign-manager",
): CampaignFolderId[] {
  return resolveCampaignContext({ userMessage, agentMode })
    .graphFoldersToHighlight;
}

/** List all registered skill paths (for validation tooling). */
export function listRegisteredSkillPaths(): string[] {
  const parsed = loadParsedResolver();
  const paths = new Set<string>();
  for (const row of [
    ...parsed.alwaysOn,
    ...parsed.routing,
    ...Object.values(parsed.agentModeDefaults),
  ]) {
    paths.add(row.skillPath);
  }
  return [...paths].sort();
}
