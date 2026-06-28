import { resolveCampaignContext } from "@/lib/harness/resolver";
import { loadSkills } from "@/lib/harness/skills/loader";
import { runHarnessScripts } from "@/lib/harness/scripts/run";
import type { HarnessTurnInput, HarnessTurnPlan } from "@/lib/harness/types";

const HARNESS_PREAMBLE = [
  "CampaignOS harness (thin runtime).",
  "Follow loaded skill Phases for judgment; use script outputs for deterministic facts.",
  "Always apply compliance conventions before any outbound content.",
].join("\n");

/**
 * Plan a single agent turn: resolve → load skills → run deterministic scripts.
 * Pattern: Gbrain harness loop without embedding the full OpenClaw runtime.
 *
 * Callers (e.g. chat action) merge `skillContext` into the system prompt and
 * pass script results as structured user context.
 */
export async function planHarnessTurn(
  input: HarnessTurnInput,
): Promise<HarnessTurnPlan> {
  const resolver = resolveCampaignContext({
    userMessage: input.userMessage,
    agentMode: input.agentMode,
    campaignPath: input.campaignPath,
  });

  const skillPaths = [
    ...resolver.alwaysOnSkillIds.map(
      (id) => `skills/${id}/SKILL.md`,
    ),
    ...resolver.matches.map((m) => m.skillPath),
  ];

  const uniquePaths = [...new Set(skillPaths)];
  const skills = await loadSkills(uniquePaths);

  const skillContext = skills
    .map((skill) => {
      const header = `# Skill: ${skill.frontmatter.name}`;
      const description = skill.frontmatter.description
        ? `\n${skill.frontmatter.description}`
        : "";
      return `${header}${description}\n\n${skill.body}`;
    })
    .join("\n\n---\n\n");

  const scriptIds = ["list-campaign-context"];
  const scriptResults = await runHarnessScripts({
    scriptIds,
    campaignId: input.campaignId,
    resolver,
  });

  const systemPreamble = [
    HARNESS_PREAMBLE,
    "",
    "## Deterministic context",
    scriptResults.map((r) => `- ${r.scriptId}: ${r.summary}`).join("\n"),
  ].join("\n");

  return {
    resolver,
    systemPreamble,
    skillContext,
    scriptIds,
  };
}
