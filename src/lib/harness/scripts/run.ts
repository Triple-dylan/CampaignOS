import type { ResolverOutput } from "@/lib/harness/types";
import { listCampaignContext } from "@/lib/harness/scripts/list-campaign-context";

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
      default:
        results.push({
          scriptId,
          summary: `Unknown script (stub): ${scriptId}`,
          data: {},
        });
    }
  }

  return results;
}
