import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import type { AssetGenerationOutput } from "@/lib/ai/schemas/asset";
import type { WorkflowPhase } from "@/lib/workflows/chat-machine";
import type { WorkflowFields } from "@/lib/workflows/chat-fields";
import type { CampaignWorkflowId } from "@/lib/workflows/registry";
import { z } from "zod";

const workflowChatPhaseSchema = z.enum([
  "collecting",
  "generating",
  "previewing",
  "saving",
  "complete",
  "error",
]);

export type DbWorkflowChatSession = {
  id: string;
  campaign_id: string;
  user_id: string | null;
  thread_id: string;
  workflow_id: string;
  phase: z.infer<typeof workflowChatPhaseSchema>;
  step_index: number;
  fields_json: WorkflowFields;
  drafts_json: AssetGenerationOutput[] | null;
  progress_label: string | null;
  error_message: string | null;
  artifact_link: string | null;
  artifact_label: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

const upsertSessionSchema = z.object({
  campaignId: z.uuid(),
  userId: z.uuid().nullable().optional(),
  threadId: z.string().min(1),
  workflowId: z.string().min(1),
  phase: workflowChatPhaseSchema,
  stepIndex: z.number().int().min(0),
  fields: z.record(z.string(), z.unknown()),
  drafts: z.array(z.unknown()).optional(),
  progressLabel: z.string().optional(),
  errorMessage: z.string().optional(),
  artifactLink: z.string().optional(),
  artifactLabel: z.string().optional(),
});

export type UpsertWorkflowChatSessionInput = z.infer<typeof upsertSessionSchema>;

export async function upsertWorkflowChatSession(input: UpsertWorkflowChatSessionInput) {
  const parsed = upsertSessionSchema.parse(input);

  if (!isSupabaseConfigured()) {
    return { synced: false as const, session: null };
  }

  const supabase = getSupabaseAdmin();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from("workflow_chat_sessions")
    .upsert(
      {
        campaign_id: parsed.campaignId,
        user_id: parsed.userId ?? null,
        thread_id: parsed.threadId,
        workflow_id: parsed.workflowId,
        phase: parsed.phase,
        step_index: parsed.stepIndex,
        fields_json: parsed.fields,
        drafts_json: parsed.drafts ?? null,
        progress_label: parsed.progressLabel ?? null,
        error_message: parsed.errorMessage ?? null,
        artifact_link: parsed.artifactLink ?? null,
        artifact_label: parsed.artifactLabel ?? null,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "campaign_id,thread_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    session: data as DbWorkflowChatSession,
  };
}

export async function getWorkflowChatSession(input: {
  campaignId: string;
  threadId: string;
}): Promise<DbWorkflowChatSession | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("workflow_chat_sessions")
    .select("*")
    .eq("campaign_id", input.campaignId)
    .eq("thread_id", input.threadId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? (data as DbWorkflowChatSession) : null;
}

export async function deleteWorkflowChatSession(input: {
  campaignId: string;
  threadId: string;
}) {
  if (!isSupabaseConfigured()) {
    return { synced: false as const };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("workflow_chat_sessions")
    .delete()
    .eq("campaign_id", input.campaignId)
    .eq("thread_id", input.threadId);

  if (error) {
    throw error;
  }

  return { synced: true as const };
}

export function dbSessionToWorkflowState(
  session: DbWorkflowChatSession,
): {
  workflowId: CampaignWorkflowId;
  stepIndex: number;
  phase: WorkflowPhase;
  fields: WorkflowFields;
  progressLabel: string;
  error?: string;
  artifactLink?: string;
  artifactLabel?: string;
  drafts?: AssetGenerationOutput[];
} {
  return {
    workflowId: session.workflow_id as CampaignWorkflowId,
    stepIndex: session.step_index,
    phase: session.phase as WorkflowPhase,
    fields: session.fields_json as WorkflowFields,
    progressLabel: session.progress_label ?? "Collecting details…",
    error: session.error_message ?? undefined,
    artifactLink: session.artifact_link ?? undefined,
    artifactLabel: session.artifact_label ?? undefined,
    drafts: (session.drafts_json as AssetGenerationOutput[] | null) ?? undefined,
  };
}
