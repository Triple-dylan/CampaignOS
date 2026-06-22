import { getOpenAiClient } from "@/lib/ai/client";
import { getOpenAiModel } from "@/lib/ai/config";
import { runLoggedAiCompletion } from "@/lib/ai/log-generation";
import {
  ASSET_GENERATION_SYSTEM_PROMPT,
  buildAssetGenerationUserPrompt,
} from "@/lib/ai/prompts/asset";
import {
  assetGenerationOutputSchema,
  type AssetGenerationOutput,
} from "@/lib/ai/schemas/asset";
import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";
import type { GenerateAssetRequest } from "@/lib/validators/assets";

const ASSET_MODULE = "asset_studio";

function parseAssetGenerationJson(content: string): AssetGenerationOutput {
  let payload: unknown;

  try {
    payload = JSON.parse(content);
  } catch {
    throw new Error("AI response was not valid JSON");
  }

  const parsed = assetGenerationOutputSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "AI response failed validation",
    );
  }

  return parsed.data;
}

export async function generateAssetContent(input: {
  campaign: DbCampaign;
  profile: DbCampaignProfile | null;
  campaignId: string;
  userId: string | null;
  request: GenerateAssetRequest;
}): Promise<AssetGenerationOutput> {
  const client = getOpenAiClient();
  if (!client) {
    throw new Error("OpenAI is not configured");
  }

  const model = getOpenAiModel();
  const userPrompt = buildAssetGenerationUserPrompt({
    campaign: input.campaign,
    profile: input.profile,
    assetType: input.request.assetType,
    theme: input.request.theme,
    issue: input.request.issue,
    channel: input.request.channel,
  });

  const { data } = await runLoggedAiCompletion({
    campaignId: input.campaignId,
    userId: input.userId,
    module: ASSET_MODULE,
    model,
    systemPrompt: ASSET_GENERATION_SYSTEM_PROMPT,
    userPrompt,
    inputJson: {
      campaignId: input.campaignId,
      assetType: input.request.assetType,
      theme: input.request.theme,
      issue: input.request.issue,
      channel: input.request.channel,
    },
    createdObjectType: "asset",
    call: async () => {
      const response = await client.chat.completions.create({
        model,
        temperature: 0.6,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: ASSET_GENERATION_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("OpenAI returned an empty response");
      }

      return {
        content,
        tokensInput: response.usage?.prompt_tokens ?? null,
        tokensOutput: response.usage?.completion_tokens ?? null,
      };
    },
    parse: parseAssetGenerationJson,
  });

  return data;
}
