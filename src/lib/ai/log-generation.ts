import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";

export type AiGenerationLogInput = {
  campaignId: string;
  userId: string | null;
  module: string;
  prompt: string;
  systemPrompt?: string;
  model: string;
  inputJson?: Record<string, unknown>;
  outputJson?: Record<string, unknown>;
  outputText?: string;
  tokensInput?: number | null;
  tokensOutput?: number | null;
  createdObjectType?: string;
  createdObjectId?: string;
};

export async function logAiGeneration(input: AiGenerationLogInput) {
  if (!isSupabaseConfigured()) {
    console.info("[ai] Supabase not configured — skipping generation log", {
      module: input.module,
      campaignId: input.campaignId,
    });
    return { synced: false as const, logId: null };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_generation_logs")
    .insert({
      campaign_id: input.campaignId,
      user_id: input.userId,
      module: input.module,
      prompt: input.prompt,
      system_prompt: input.systemPrompt ?? null,
      model: input.model,
      input_json: input.inputJson ?? {},
      output_json: input.outputJson ?? {},
      output_text: input.outputText ?? null,
      tokens_input: input.tokensInput ?? null,
      tokens_output: input.tokensOutput ?? null,
      created_object_type: input.createdObjectType ?? null,
      created_object_id: input.createdObjectId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    logId: data.id as string,
  };
}

export type LoggedAiCompletionInput<T> = {
  campaignId: string;
  userId: string | null;
  module: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  inputJson?: Record<string, unknown>;
  createdObjectType?: string;
  createdObjectId?: string;
  call: () => Promise<{
    content: string;
    tokensInput?: number | null;
    tokensOutput?: number | null;
    parsed?: T;
  }>;
  parse: (content: string) => T;
};

export async function runLoggedAiCompletion<T>(
  input: LoggedAiCompletionInput<T>,
): Promise<{ data: T; logId: string | null }> {
  const result = await input.call();

  let parsed: T;
  let outputJson: Record<string, unknown> = {};

  try {
    parsed = result.parsed ?? input.parse(result.content);
    outputJson = JSON.parse(JSON.stringify(parsed)) as Record<string, unknown>;
  } catch (parseError) {
    await logAiGeneration({
      campaignId: input.campaignId,
      userId: input.userId,
      module: input.module,
      prompt: input.userPrompt,
      systemPrompt: input.systemPrompt,
      model: input.model,
      inputJson: input.inputJson,
      outputJson: { parseError: true },
      outputText: result.content,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
      createdObjectType: input.createdObjectType,
      createdObjectId: input.createdObjectId,
    });
    throw parseError;
  }

  const log = await logAiGeneration({
    campaignId: input.campaignId,
    userId: input.userId,
    module: input.module,
    prompt: input.userPrompt,
    systemPrompt: input.systemPrompt,
    model: input.model,
    inputJson: input.inputJson,
    outputJson,
    outputText: result.content,
    tokensInput: result.tokensInput,
    tokensOutput: result.tokensOutput,
    createdObjectType: input.createdObjectType,
    createdObjectId: input.createdObjectId,
  });

  return {
    data: parsed,
    logId: log.logId,
  };
}
