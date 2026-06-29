import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SkillDefinition, SkillFrontmatter } from "@/lib/harness/types";

const HARNESS_ROOT = path.join(process.cwd(), "src/lib/harness");

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

function parseSimpleYaml(block: string): SkillFrontmatter {
  const result: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let multiline: string[] = [];

  const flushMultiline = () => {
    if (currentKey && multiline.length > 0) {
      result[currentKey] = multiline.join("\n").trim();
      multiline = [];
    }
  };

  for (const line of block.split("\n")) {
    if (line.startsWith("  ") && currentKey) {
      multiline.push(line.slice(2));
      continue;
    }

    flushMultiline();
    currentKey = null;

    const match = line.match(/^([\w-]+):\s*(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    currentKey = key;

    if (rawValue === "") {
      multiline = [];
      continue;
    }

    if (rawValue === "true") result[key] = true;
    else if (rawValue === "false") result[key] = false;
    else if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      result[key] = rawValue
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
    } else {
      result[key] = rawValue.replace(/^['"]|['"]$/g, "");
      currentKey = null;
    }
  }

  flushMultiline();

  const name = String(result.name ?? "unknown");
  return {
    name,
    version: result.version ? String(result.version) : undefined,
    description: result.description ? String(result.description) : undefined,
    triggers: Array.isArray(result.triggers)
      ? (result.triggers as string[])
      : undefined,
    tools: Array.isArray(result.tools) ? (result.tools as string[]) : undefined,
    mutating: typeof result.mutating === "boolean" ? result.mutating : undefined,
    campaignKnowledgePaths: Array.isArray(result.campaignKnowledgePaths)
      ? (result.campaignKnowledgePaths as string[])
      : undefined,
  };
}

/** Load a skill markdown file from the harness skills directory (Gbrain SKILL.md pattern). */
export async function loadSkill(relativePath: string): Promise<SkillDefinition | null> {
  const filePath = path.join(HARNESS_ROOT, relativePath);
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    return null;
  }

  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    return {
      id: path.basename(path.dirname(relativePath)),
      directory: path.dirname(relativePath),
      frontmatter: { name: path.basename(relativePath, ".md") },
      body: raw,
    };
  }

  const frontmatter = parseSimpleYaml(match[1]);
  return {
    id: frontmatter.name,
    directory: path.dirname(relativePath),
    frontmatter,
    body: match[2].trim(),
  };
}

/** Load multiple skills in parallel for harness context assembly. */
export async function loadSkills(
  relativePaths: string[],
): Promise<SkillDefinition[]> {
  const loaded = await Promise.all(relativePaths.map((p) => loadSkill(p)));
  return loaded.filter((skill): skill is SkillDefinition => skill !== null);
}
