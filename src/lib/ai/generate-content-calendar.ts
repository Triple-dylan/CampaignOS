import { getOpenAiClient } from "@/lib/ai/client";
import { getOpenAiModel } from "@/lib/ai/config";
import { runLoggedAiCompletion } from "@/lib/ai/log-generation";
import {
  CONTENT_CALENDAR_SYSTEM_PROMPT,
  buildContentCalendarUserPrompt,
} from "@/lib/ai/prompts/content-calendar";
import {
  contentCalendarOutputSchema,
  type ContentCalendarOutput,
} from "@/lib/ai/schemas/content-calendar";
import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";

const CONTENT_CALENDAR_MODULE = "content_calendar";

function parseContentCalendarJson(content: string): ContentCalendarOutput {
  let payload: unknown;
  try {
    payload = JSON.parse(content);
  } catch {
    throw new Error("AI response was not valid JSON");
  }

  const parsed = contentCalendarOutputSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "AI response failed validation",
    );
  }
  return parsed.data;
}

export async function generateContentCalendarContent(input: {
  campaign: DbCampaign;
  profile: DbCampaignProfile | null;
  campaignId: string;
  userId: string | null;
  period: string;
  channelsAndCadence: string;
}): Promise<ContentCalendarOutput> {
  const client = getOpenAiClient();
  if (!client) {
    throw new Error("OpenAI is not configured");
  }

  const model = getOpenAiModel();
  const userPrompt = buildContentCalendarUserPrompt({
    campaign: input.campaign,
    profile: input.profile,
    period: input.period,
    channelsAndCadence: input.channelsAndCadence,
  });

  const { data } = await runLoggedAiCompletion({
    campaignId: input.campaignId,
    userId: input.userId,
    module: CONTENT_CALENDAR_MODULE,
    model,
    systemPrompt: CONTENT_CALENDAR_SYSTEM_PROMPT,
    userPrompt,
    inputJson: {
      period: input.period,
      channelsAndCadence: input.channelsAndCadence,
    },
    createdObjectType: "calendar_event",
    call: async () => {
      const response = await client.chat.completions.create({
        model,
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: CONTENT_CALENDAR_SYSTEM_PROMPT },
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
    parse: parseContentCalendarJson,
  });

  return data;
}
