import { getOpenAiClient } from "@/lib/ai/client";
import { getOpenAiModel } from "@/lib/ai/config";
import { runLoggedAiCompletion } from "@/lib/ai/log-generation";
import {
  buildCampaignBrainUserPrompt,
  CAMPAIGN_BRAIN_SYSTEM_PROMPT,
} from "@/lib/ai/prompts/campaign-brain";
import {
  campaignBrainOutputSchema,
  type CampaignBrainOutput,
} from "@/lib/ai/schemas/campaign-brain";
import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";

const CAMPAIGN_BRAIN_MODULE = "campaign_brain";

function parseCampaignBrainJson(content: string): CampaignBrainOutput {
  let payload: unknown;

  try {
    payload = JSON.parse(content);
  } catch {
    throw new Error("AI response was not valid JSON");
  }

  const parsed = campaignBrainOutputSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "AI response failed validation",
    );
  }

  return parsed.data;
}

async function requestCampaignBrainCompletion(input: {
  campaign: DbCampaign;
  profile: DbCampaignProfile | null;
  campaignId: string;
  userId: string | null;
  retryHint?: string;
}): Promise<CampaignBrainOutput> {
  const client = getOpenAiClient();
  if (!client) {
    throw new Error("OpenAI is not configured");
  }

  const model = getOpenAiModel();
  const userPrompt = buildCampaignBrainUserPrompt({
    campaign: input.campaign,
    profile: input.profile,
  });
  const promptWithRetry = input.retryHint
    ? `${userPrompt}\n\nPrevious response was invalid (${input.retryHint}). Return corrected JSON only.`
    : userPrompt;

  const { data } = await runLoggedAiCompletion({
    campaignId: input.campaignId,
    userId: input.userId,
    module: CAMPAIGN_BRAIN_MODULE,
    model,
    systemPrompt: CAMPAIGN_BRAIN_SYSTEM_PROMPT,
    userPrompt: promptWithRetry,
    inputJson: {
      campaignId: input.campaignId,
      candidateName: input.campaign.candidate_name,
      officeSought: input.campaign.office_sought,
      jurisdiction: input.campaign.jurisdiction,
      state: input.campaign.state,
      retry: Boolean(input.retryHint),
    },
    createdObjectType: "campaign_profile",
    call: async () => {
      const response = await client.chat.completions.create({
        model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: CAMPAIGN_BRAIN_SYSTEM_PROMPT },
          { role: "user", content: promptWithRetry },
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
    parse: parseCampaignBrainJson,
  });

  return data;
}

export async function generateCampaignBrainOutput(input: {
  campaign: DbCampaign;
  profile: DbCampaignProfile | null;
  campaignId: string;
  userId: string | null;
}): Promise<CampaignBrainOutput> {
  try {
    return await requestCampaignBrainCompletion(input);
  } catch (firstError) {
    const message =
      firstError instanceof Error ? firstError.message : "Invalid AI response";

    try {
      return await requestCampaignBrainCompletion({
        ...input,
        retryHint: message,
      });
    } catch {
      throw firstError;
    }
  }
}
