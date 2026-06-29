/**
 * Gbrain-style RESOLVER.md parser.
 * Extracts trigger → skill → scripts rows from markdown tables.
 */

export type ParsedResolverRow = {
  triggers: string[];
  skillId: string;
  skillPath: string;
  scripts: string[];
};

export type ParsedWorkflowRow = {
  workflowId: string;
  triggers: string[];
  skillId: string;
  graphFolders: string[];
};

export type ParsedResolver = {
  alwaysOn: ParsedResolverRow[];
  routing: ParsedResolverRow[];
  agentModeDefaults: Record<string, ParsedResolverRow>;
  workflows: ParsedWorkflowRow[];
};

const SKILL_PATH_RE = /skills\/([a-z0-9-]+)\/SKILL\.md/i;

function extractSkillId(skillCell: string): { skillId: string; skillPath: string } {
  const pathMatch = skillCell.match(/`?(skills\/[^`\s]+\/SKILL\.md)`?/i);
  const skillPath = pathMatch?.[1] ?? skillCell.trim();
  const idMatch = skillPath.match(SKILL_PATH_RE);
  return {
    skillId: idMatch?.[1] ?? skillPath.split("/").slice(-2, -1)[0] ?? "unknown",
    skillPath,
  };
}

function parseTriggerCell(cell: string): string[] {
  const trimmed = cell.trim();
  if (
    trimmed.toLowerCase().includes("every inbound") ||
    trimmed.toLowerCase().includes("always-on")
  ) {
    return ["*"];
  }

  const quoted = [...trimmed.matchAll(/"([^"]+)"/g)].map((m) => m[1].toLowerCase());
  if (quoted.length > 0) return quoted;

  return trimmed
    .split(",")
    .map((part) => part.replace(/^["'`]|["'`]$/g, "").trim().toLowerCase())
    .filter(Boolean);
}

function parseScriptsCell(cell: string): string[] {
  const trimmed = cell.trim();
  if (!trimmed || trimmed === "—" || trimmed === "-") return [];

  const backtickScripts = [...trimmed.matchAll(/`([a-z0-9-]+)`/gi)].map((m) => m[1]);
  if (backtickScripts.length > 0) return backtickScripts;

  return trimmed
    .split(",")
    .map((part) => part.replace(/^["'`]|["'`]$/g, "").trim())
    .filter(Boolean);
}

function parseTableRow(line: string): string[] {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function isSeparatorRow(line: string): boolean {
  return /^\|\s*[-:]+/.test(line.trim());
}

function parseRoutingTable(lines: string[]): ParsedResolverRow[] {
  const rows: ParsedResolverRow[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line.startsWith("|")) continue;
    if (isSeparatorRow(line)) continue;

    const cells = parseTableRow(line);
    if (cells.length < 2) continue;

    const headerLike =
      cells[0].toLowerCase() === "trigger" ||
      cells[0].toLowerCase() === "workflow" ||
      cells[0].toLowerCase() === "agent mode";
    if (headerLike) continue;

    const triggers = parseTriggerCell(cells[0]);
    const { skillId, skillPath } = extractSkillId(cells[1]);
    const scripts = cells.length >= 3 ? parseScriptsCell(cells[2]) : [];

    rows.push({ triggers, skillId, skillPath, scripts });
  }

  return rows;
}

function parseWorkflowTable(lines: string[]): ParsedWorkflowRow[] {
  const rows: ParsedWorkflowRow[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line.startsWith("|")) continue;
    if (isSeparatorRow(line)) continue;

    const cells = parseTableRow(line);
    if (cells.length < 4) continue;
    if (cells[0].toLowerCase() === "workflow") continue;

    const workflowId = cells[0].replace(/`/g, "").trim();
    const triggers = parseTriggerCell(cells[1]);
    const skillId = cells[2].replace(/`/g, "").trim();
    const graphFolders = cells[3]
      .split(",")
      .map((part) => part.replace(/`/g, "").trim())
      .filter(Boolean);

    rows.push({ workflowId, triggers, skillId, graphFolders });
  }

  return rows;
}

function sectionLines(markdown: string, heading: string): string[] {
  const re = new RegExp(`^## ${heading}\\s*$`, "im");
  const match = markdown.match(re);
  if (!match || match.index === undefined) return [];

  const start = match.index + match[0].length;
  const rest = markdown.slice(start);
  const nextHeading = rest.search(/^## /m);
  const body = nextHeading === -1 ? rest : rest.slice(0, nextHeading);
  return body.split("\n");
}

function subsectionLines(sectionBody: string[], heading: string): string[] {
  const re = new RegExp(`^### ${heading}\\s*$`, "i");
  const startIdx = sectionBody.findIndex((line) => re.test(line.trim()));
  if (startIdx === -1) return sectionBody;

  const after = sectionBody.slice(startIdx + 1);
  const nextSub = after.findIndex((line) => /^### /i.test(line.trim()));
  return nextSub === -1 ? after : after.slice(0, nextSub);
}

/** Parse RESOLVER.md into structured routing rows (Gbrain dispatcher pattern). */
export function parseResolverMarkdown(markdown: string): ParsedResolver {
  const alwaysOn = parseRoutingTable(
    subsectionLines(sectionLines(markdown, "Always-on (every message)"), "Always-on"),
  ).concat(
    parseRoutingTable(sectionLines(markdown, "Always-on (every message)")).filter(
      (row) => row.triggers.includes("*") || row.skillId === "campaign-signals",
    ),
  );

  const dedupedAlwaysOn = dedupeRows(
    alwaysOn.length > 0
      ? alwaysOn
      : [
          {
            triggers: ["*"],
            skillId: "campaign-signals",
            skillPath: "skills/campaign-signals/SKILL.md",
            scripts: ["list-campaign-context"],
          },
        ],
  );

  const campaignModules = parseRoutingTable(
    sectionLines(markdown, "Campaign modules"),
  );

  const agentModeLines = sectionLines(markdown, "Agent mode defaults");
  const agentRows = parseRoutingTable(agentModeLines);
  const agentModeDefaults: Record<string, ParsedResolverRow> = {};
  for (const line of agentModeLines) {
    if (!line.trim().startsWith("|")) continue;
    if (isSeparatorRow(line)) continue;
    const cells = parseTableRow(line);
    if (cells.length < 2 || cells[0].toLowerCase() === "agent mode") continue;
    const mode = cells[0].replace(/`/g, "").trim();
    const { skillId, skillPath } = extractSkillId(cells[1]);
    agentModeDefaults[mode] = {
      triggers: [],
      skillId,
      skillPath,
      scripts: [],
    };
  }
  for (const row of agentRows) {
    if (row.triggers.length === 0 && row.skillId) {
      agentModeDefaults[row.skillId] = row;
    }
  }

  const workflows = parseWorkflowTable(sectionLines(markdown, "Workflows (registry)"));

  return {
    alwaysOn: dedupedAlwaysOn,
    routing: dedupeRows(campaignModules),
    agentModeDefaults,
    workflows,
  };
}

function dedupeRows(rows: ParsedResolverRow[]): ParsedResolverRow[] {
  const seen = new Set<string>();
  const out: ParsedResolverRow[] = [];
  for (const row of rows) {
    const key = `${row.skillId}:${row.skillPath}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}
