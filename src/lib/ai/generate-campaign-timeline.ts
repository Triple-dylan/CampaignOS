import { getOpenAiClient } from "@/lib/ai/client";
import { getOpenAiModel } from "@/lib/ai/config";
import { runLoggedAiCompletion } from "@/lib/ai/log-generation";
import {
  CAMPAIGN_TIMELINE_SYSTEM_PROMPT,
  buildCampaignTimelineUserPrompt,
} from "@/lib/ai/prompts/campaign-timeline";
import {
  campaignTimelineOutputSchema,
  type CampaignTimelineOutput,
} from "@/lib/ai/schemas/campaign-timeline";
import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";

const PLANNER_MODULE = "campaign_structure";

function parseTimelineJson(content: string): CampaignTimelineOutput {
  let payload: unknown;
  try {
    payload = JSON.parse(content);
  } catch {
    throw new Error("AI response was not valid JSON");
  }

  const parsed = campaignTimelineOutputSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "AI response failed validation",
    );
  }
  return parsed.data;
}

export async function generateCampaignTimelineContent(input: {
  campaign: DbCampaign;
  profile: DbCampaignProfile | null;
  campaignId: string;
  userId: string | null;
  districtSegments: string;
  issues: string;
}): Promise<CampaignTimelineOutput> {
  const client = getOpenAiClient();
  if (!client) {
    throw new Error("OpenAI is not configured");
  }

  const model = getOpenAiModel();
  const userPrompt = buildCampaignTimelineUserPrompt({
    campaign: input.campaign,
    profile: input.profile,
    districtSegments: input.districtSegments,
    issues: input.issues,
  });

  const { data } = await runLoggedAiCompletion({
    campaignId: input.campaignId,
    userId: input.userId,
    module: PLANNER_MODULE,
    model,
    systemPrompt: CAMPAIGN_TIMELINE_SYSTEM_PROMPT,
    userPrompt,
    inputJson: {
      districtSegments: input.districtSegments,
      issues: input.issues,
    },
    createdObjectType: "calendar_event",
    call: async () => {
      const response = await client.chat.completions.create({
        model,
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: CAMPAIGN_TIMELINE_SYSTEM_PROMPT },
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
    parse: parseTimelineJson,
  });

  return data;
}
