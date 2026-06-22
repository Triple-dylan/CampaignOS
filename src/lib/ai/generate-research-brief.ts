import { getOpenAiClient } from "@/lib/ai/client";
import { getOpenAiModel } from "@/lib/ai/config";
import { runLoggedAiCompletion } from "@/lib/ai/log-generation";
import {
  RESEARCH_GENERATION_SYSTEM_PROMPT,
  buildResearchGenerationUserPrompt,
} from "@/lib/ai/prompts/research";
import {
  researchGenerationOutputSchema,
  type ResearchGenerationOutput,
} from "@/lib/ai/schemas/research";
import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";
import type { GenerateResearchBriefRequest } from "@/lib/validators/research-briefs";

const RESEARCH_MODULE = "research_hub";

function parseResearchGenerationJson(content: string): ResearchGenerationOutput {
  let payload: unknown;

  try {
    payload = JSON.parse(content);
  } catch {
    throw new Error("AI response was not valid JSON");
  }

  const parsed = researchGenerationOutputSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "AI response failed validation",
    );
  }

  return parsed.data;
}

export async function generateResearchBriefContent(input: {
  campaign: DbCampaign;
  profile: DbCampaignProfile | null;
  campaignId: string;
  userId: string | null;
  request: GenerateResearchBriefRequest;
}): Promise<ResearchGenerationOutput> {
  const client = getOpenAiClient();
  if (!client) {
    throw new Error("OpenAI is not configured");
  }

  const model = getOpenAiModel();
  const userPrompt = buildResearchGenerationUserPrompt({
    campaign: input.campaign,
    profile: input.profile,
    researchType: input.request.researchType,
    topic: input.request.topic,
    relatedIssues: input.request.relatedIssues,
  });

  const { data } = await runLoggedAiCompletion({
    campaignId: input.campaignId,
    userId: input.userId,
    module: RESEARCH_MODULE,
    model,
    systemPrompt: RESEARCH_GENERATION_SYSTEM_PROMPT,
    userPrompt,
    inputJson: {
      campaignId: input.campaignId,
      researchType: input.request.researchType,
      topic: input.request.topic,
      relatedIssues: input.request.relatedIssues,
    },
    createdObjectType: "research_brief",
    call: async () => {
      const response = await client.chat.completions.create({
        model,
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: RESEARCH_GENERATION_SYSTEM_PROMPT },
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
    parse: parseResearchGenerationJson,
  });

  return data;
}
