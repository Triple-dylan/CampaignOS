import { getOpenAiClient } from "@/lib/ai/client";
import { getOpenAiModel } from "@/lib/ai/config";
import { runLoggedAiCompletion } from "@/lib/ai/log-generation";
import {
  FUNDRAISING_OUTREACH_SYSTEM_PROMPT,
  buildProspectOutreachUserPrompt,
} from "@/lib/ai/prompts/fundraising";
import {
  prospectOutreachOutputSchema,
  type ProspectOutreachOutput,
} from "@/lib/ai/schemas/fundraising";
import type {
  DbCampaign,
  DbCampaignProfile,
  DbFundraisingProspect,
} from "@/lib/db/schema";
import type { GenerateProspectOutreachRequest } from "@/lib/validators/fundraising";

const FUNDRAISING_MODULE = "fundraising_planner";

function parseProspectOutreachJson(content: string): ProspectOutreachOutput {
  let payload: unknown;

  try {
    payload = JSON.parse(content);
  } catch {
    throw new Error("AI response was not valid JSON");
  }

  const parsed = prospectOutreachOutputSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "AI response failed validation",
    );
  }

  return parsed.data;
}

export async function generateProspectOutreachContent(input: {
  campaign: DbCampaign;
  profile: DbCampaignProfile | null;
  prospect: DbFundraisingProspect;
  campaignId: string;
  userId: string | null;
  request: GenerateProspectOutreachRequest;
}): Promise<ProspectOutreachOutput> {
  const client = getOpenAiClient();
  if (!client) {
    throw new Error("OpenAI is not configured");
  }

  const model = getOpenAiModel();
  const userPrompt = buildProspectOutreachUserPrompt({
    campaign: input.campaign,
    profile: input.profile,
    prospect: input.prospect,
    outreachGoal: input.request.outreachGoal,
    channel: input.request.channel,
  });

  const { data } = await runLoggedAiCompletion({
    campaignId: input.campaignId,
    userId: input.userId,
    module: FUNDRAISING_MODULE,
    model,
    systemPrompt: FUNDRAISING_OUTREACH_SYSTEM_PROMPT,
    userPrompt,
    inputJson: {
      campaignId: input.campaignId,
      prospectId: input.request.prospectId,
      outreachGoal: input.request.outreachGoal,
      channel: input.request.channel,
    },
    createdObjectType: "fundraising_prospect",
    createdObjectId: input.request.prospectId,
    call: async () => {
      const response = await client.chat.completions.create({
        model,
        temperature: 0.6,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: FUNDRAISING_OUTREACH_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("AI returned an empty response");
      }

      return {
        content,
        tokensInput: response.usage?.prompt_tokens ?? null,
        tokensOutput: response.usage?.completion_tokens ?? null,
      };
    },
    parse: parseProspectOutreachJson,
  });

  return data;
}
