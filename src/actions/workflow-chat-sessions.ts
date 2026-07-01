"use server";

import { revalidatePath } from "next/cache";
import { requireCampaignContext } from "@/lib/auth/require-campaign-context";
import {
  dbSessionToWorkflowState,
  deleteWorkflowChatSession,
  getWorkflowChatSession,
  upsertWorkflowChatSession,
} from "@/lib/db/workflow-chat-sessions";
import type { WorkflowRunState } from "@/lib/workflows/chat-machine";

export async function saveWorkflowChatSession(input: {
  threadId: string;
  state: WorkflowRunState;
}) {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false as const, error: context.error };
  }

  await upsertWorkflowChatSession({
    campaignId: context.campaign.id,
    userId: context.dbUserId,
    threadId: input.threadId,
    workflowId: input.state.workflowId,
    phase: input.state.phase,
    stepIndex: input.state.stepIndex,
    fields: input.state.fields,
    drafts: input.state.drafts,
    progressLabel: input.state.progressLabel,
    errorMessage: input.state.error,
    artifactLink: input.state.artifactLink,
    artifactLabel: input.state.artifactLabel,
  });

  return { ok: true as const };
}

export async function loadWorkflowChatSession(input: { threadId: string }) {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false as const, error: context.error, state: null };
  }

  const session = await getWorkflowChatSession({
    campaignId: context.campaign.id,
    threadId: input.threadId,
  });

  if (!session) {
    return { ok: true as const, state: null };
  }

  return {
    ok: true as const,
    state: dbSessionToWorkflowState(session) as WorkflowRunState,
  };
}

export async function clearWorkflowChatSession(input: { threadId: string }) {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false as const, error: context.error };
  }

  await deleteWorkflowChatSession({
    campaignId: context.campaign.id,
    threadId: input.threadId,
  });

  revalidatePath("/chat");
  return { ok: true as const };
}
