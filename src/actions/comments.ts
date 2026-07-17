"use server";

import { revalidatePath } from "next/cache";
import { sendChatMessage, type AgentMode } from "@/actions/chat";
import {
  canComment,
  canReviewCompliance,
} from "@/lib/auth/permissions";
import { requireCampaignContext } from "@/lib/auth/require-campaign-context";
import { recordActivityEvent } from "@/lib/db/activity";
import {
  addComment,
  getCommentThreadById,
  getOrCreateCommentThread,
  listComments,
  setCommentThreadResolved,
} from "@/lib/db/comments";
import type { DbComment, DbCommentThread } from "@/lib/db/schema";

const AGENT_MENTION_PATTERN =
  /@(campaign-manager|content-strategist|researcher|fundraiser|compliance-reviewer|AI|ai)\b/gi;

const AGENT_ALIAS: Record<string, AgentMode> = {
  ai: "campaign-manager",
  "campaign-manager": "campaign-manager",
  "content-strategist": "content-strategist",
  researcher: "researcher",
  fundraiser: "fundraiser",
  "compliance-reviewer": "compliance-reviewer",
};

function parseAgentMentions(body: string): AgentMode[] {
  const found = new Set<AgentMode>();
  for (const match of body.matchAll(AGENT_MENTION_PATTERN)) {
    const key = match[1]?.toLowerCase() ?? "";
    const agent = AGENT_ALIAS[key];
    if (agent) found.add(agent);
  }
  return [...found];
}

export type CommentDTO = {
  id: string;
  authorKind: "user" | "agent";
  authorUserId: string | null;
  agentId: string | null;
  body: string;
  createdAt: string;
  mentionAgentIds: string[];
};

export type CommentThreadDTO = {
  thread: DbCommentThread;
  comments: CommentDTO[];
};

function toCommentDTO(comment: DbComment): CommentDTO {
  return {
    id: comment.id,
    authorKind: comment.author_kind,
    authorUserId: comment.author_user_id,
    agentId: comment.agent_id,
    body: comment.body,
    createdAt: comment.created_at,
    mentionAgentIds: comment.mention_agent_ids ?? [],
  };
}

export async function getObjectCommentThread(input: {
  objectType: string;
  objectId: string;
}): Promise<{ ok: boolean; data?: CommentThreadDTO; error?: string }> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error };
  }

  try {
    const thread = await getOrCreateCommentThread({
      campaignId: context.campaign.id,
      objectType: input.objectType,
      objectId: input.objectId,
      createdBy: context.dbUserId,
    });
    if (!thread) {
      return { ok: true, data: undefined };
    }
    const comments = await listComments(thread.id);
    return {
      ok: true,
      data: {
        thread,
        comments: comments.map(toCommentDTO),
      },
    };
  } catch (error) {
    console.error("[comments] load failed", error);
    return { ok: false, error: "Could not load comments." };
  }
}

export async function postObjectComment(input: {
  objectType: string;
  objectId: string;
  body: string;
  objectTitle?: string;
}): Promise<{
  ok: boolean;
  data?: CommentThreadDTO;
  error?: string;
}> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error };
  }
  if (!context.role || !canComment(context.role)) {
    return { ok: false, error: "Viewers cannot post comments." };
  }

  const body = input.body.trim();
  if (!body) {
    return { ok: false, error: "Comment cannot be empty." };
  }

  try {
    const thread = await getOrCreateCommentThread({
      campaignId: context.campaign.id,
      objectType: input.objectType,
      objectId: input.objectId,
      createdBy: context.dbUserId,
    });
    if (!thread) {
      return { ok: false, error: "Comments require database configuration." };
    }

    if (thread.resolved_at) {
      return {
        ok: false,
        error: "This thread is resolved. Reopen it to comment or @AI again.",
      };
    }

    const mentionAgents = parseAgentMentions(body);
    await addComment({
      threadId: thread.id,
      authorKind: "user",
      authorUserId: context.dbUserId,
      body,
      mentionAgentIds: mentionAgents,
    });

    await recordActivityEvent({
      organizationId: context.campaign.organization_id,
      campaignId: context.campaign.id,
      actorUserId: context.dbUserId,
      action: "comment.posted",
      objectType: input.objectType,
      objectId: input.objectId,
      summary: `Commented on ${input.objectTitle ?? input.objectType}`,
    });

    // @AI / @agent replies publicly in the shared thread
    for (const agentMode of mentionAgents) {
      if (
        agentMode === "compliance-reviewer" &&
        context.role &&
        !canReviewCompliance(context.role) &&
        input.objectType === "compliance"
      ) {
        continue;
      }

      const history = await listComments(thread.id);
      const messages = history.slice(-12).map((comment) => ({
        role:
          comment.author_kind === "agent"
            ? ("assistant" as const)
            : ("user" as const),
        content:
          comment.author_kind === "agent"
            ? comment.body
            : `[${input.objectType}:${input.objectId}] ${comment.body}`,
      }));

      const reply = await sendChatMessage({
        messages,
        agentMode,
      });

      if (reply.ok) {
        await addComment({
          threadId: thread.id,
          authorKind: "agent",
          agentId: agentMode,
          body: reply.reply,
          mentionAgentIds: [],
        });
        await recordActivityEvent({
          organizationId: context.campaign.organization_id,
          campaignId: context.campaign.id,
          actorKind: "agent",
          actorUserId: context.dbUserId,
          agentId: agentMode,
          action: "comment.agent_replied",
          objectType: input.objectType,
          objectId: input.objectId,
          summary: `${agentMode} replied on ${input.objectTitle ?? input.objectType}`,
        });
      }
    }

    const comments = await listComments(thread.id);
    const fresh = (await getCommentThreadById(thread.id)) ?? thread;
    revalidatePath("/dashboard");
    return {
      ok: true,
      data: { thread: fresh, comments: comments.map(toCommentDTO) },
    };
  } catch (error) {
    console.error("[comments] post failed", error);
    return { ok: false, error: "Could not post comment." };
  }
}

export async function promoteChatToThread(input: {
  objectType: string;
  objectId: string;
  body: string;
  objectTitle?: string;
}): Promise<{ ok: boolean; data?: CommentThreadDTO; error?: string }> {
  return postObjectComment(input);
}

export async function resolveObjectCommentThread(input: {
  objectType: string;
  objectId: string;
  resolved: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error };
  }
  if (!context.role || !canComment(context.role)) {
    return { ok: false, error: "You cannot resolve threads." };
  }

  try {
    const thread = await getOrCreateCommentThread({
      campaignId: context.campaign.id,
      objectType: input.objectType,
      objectId: input.objectId,
      createdBy: context.dbUserId,
    });
    if (!thread) {
      return { ok: false, error: "Thread not found." };
    }
    await setCommentThreadResolved({
      threadId: thread.id,
      resolved: input.resolved,
      resolvedBy: context.dbUserId,
    });
    return { ok: true };
  } catch (error) {
    console.error("[comments] resolve failed", error);
    return { ok: false, error: "Could not update thread." };
  }
}
