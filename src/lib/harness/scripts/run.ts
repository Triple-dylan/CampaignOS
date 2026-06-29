import type { ResolverOutput } from "@/lib/harness/types";
import { listCampaignContext } from "@/lib/harness/scripts/list-campaign-context";
import { generateFromSkill } from "@/lib/harness/scripts/generate-from-skill";
import { listResearchContext } from "@/lib/harness/scripts/list-research-context";
import { syncFolderToGraph } from "@/lib/harness/scripts/sync-folder-to-graph";

export type HarnessScriptResult = {
  scriptId: string;
  summary: string;
  data: Record<string, unknown>;
};

export type RunHarnessScriptsInput = {
  scriptIds: string[];
  campaignId: string;
  resolver: ResolverOutput;
};

/**
 * Deterministic script runner (Gbrain CLI pattern).
 * Skills decide *when* to call; scripts return facts without LLM judgment.
 */
export async function runHarnessScripts(
  input: RunHarnessScriptsInput,
): Promise<HarnessScriptResult[]> {
  const results: HarnessScriptResult[] = [];
  const primarySkillId = input.resolver.plan.skillId;

  for (const scriptId of input.scriptIds) {
    switch (scriptId) {
      case "list-campaign-context": {
        const data = await listCampaignContext({
          campaignId: input.campaignId,
          contextChunks: input.resolver.contextChunks,
        });
        results.push({
          scriptId,
          summary: `${data.chunkCount} context chunks, ${data.skillMatchCount} skill matches`,
          data,
        });
        break;
      }
      case "list-research-context": {
        const data = await listResearchContext({
          campaignId: input.campaignId,
        });
        results.push({
          scriptId,
          summary: `${data.entryCount} research folder entries`,
          data,
        });
        break;
      }
      case "sync-folder-to-graph": {
        const folderSlug =
          input.resolver.graphFoldersToHighlight[0] ?? "campaign";
        const data = await syncFolderToGraph({ folderSlug });
        results.push({
          scriptId,
          summary: `${data.nodes.length} knowledge nodes from ${folderSlug}/`,
          data,
        });
        break;
      }
      case "generate-from-skill": {
        const data = await generateFromSkill({
          campaignId: input.campaignId,
          skillId: primarySkillId,
          userMessage: input.resolver.matches[0]?.trigger ?? "",
          plan: input.resolver.plan,
        });
        results.push({
          scriptId,
          summary: `${data.flow.length}-step flow for ${data.skillId}`,
          data,
        });
        break;
      }
      default:
        results.push({
          scriptId,
          summary: `Unknown script: ${scriptId}`,
          data: {},
        });
    }
  }

  return results;
}

export { listCampaignContext } from "@/lib/harness/scripts/list-campaign-context";
export { listResearchContext } from "@/lib/harness/scripts/list-research-context";
export { syncFolderToGraph } from "@/lib/harness/scripts/sync-folder-to-graph";
export { generateFromSkill } from "@/lib/harness/scripts/generate-from-skill";
