"use server";

import { getOpenAiClient } from "@/lib/ai/client";
import {
  DEFAULT_CHAT_EFFORT,
  DEFAULT_CHAT_MODEL,
  getChatModel,
  isChatEffortId,
  isChatModelId,
  temperatureForEffort,
  type ChatEffortId,
  type ChatModelId,
} from "@/lib/ai/chat-models";
import { getOpenAiModel, isOpenAiConfigured } from "@/lib/ai/config";
import { logAiGeneration } from "@/lib/ai/log-generation";
import { requireCampaignContext } from "@/lib/auth/require-campaign-context";
import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import { countGraphNodes, listGraphNodes } from "@/lib/db/campaigns";
import { campaignDisplayName } from "@/lib/db/schema";
import { planHarnessTurn } from "@/lib/harness/loop";
import { resolveRetrievalNodeIds } from "@/lib/graph/retrieval-highlights";

export type ChatRole = "user" | "assistant";

export type ChatTurn = {
  role: ChatRole;
  content: string;
};

export type AgentMode =
  | "campaign-manager"
  | "content-strategist"
  | "researcher"
  | "fundraiser"
  | "compliance-reviewer";

const AGENT_PERSONAS: Record<AgentMode, string> = {
  "campaign-manager":
    "You are the Campaign Manager: a calm, strategic chief of staff. Help prioritize the week, connect modules (assets, planner, tasks, research, fundraising, compliance), and keep the candidate on-message.",
  "content-strategist":
    "You are the Content Strategist: you shape messaging, draft copy directions, and keep voice consistent with the campaign's brand tone.",
  researcher:
    "You are the Researcher: you frame opposition research, district intel, and message testing into clear, sourced briefs.",
  fundraiser:
    "You are the Fundraiser: you think about donor pipelines, call-time blocks, and compliant asks tied to the candidate's issues.",
  "compliance-reviewer":
    "You are the Compliance Reviewer: you flag disclosure, disclaimer, and recordkeeping concerns. You never give legal advice and you always recommend a qualified election-law attorney for anything binding.",
};

const CHAT_MODULE = "workspace_chat";
const MAX_HISTORY = 16;

export type SendChatMessageResult = {
  ok: true;
  reply: string;
  configured: boolean;
  /** Resolver-driven graph cluster highlights (not keyword guess). */
  graphFoldersToHighlight: CampaignFolderId[];
  /** Specific node ids from resolver context paths (retrieval-aware). */
  graphNodeIdsToHighlight: string[];
  harnessSkillId?: string;
  workflowId?: string | null;
};

function buildSystemPrompt(input: {
  agentMode: AgentMode;
  campaignName: string;
  office: string | null;
  jurisdiction: string | null;
  state: string | null;
  topIssues: string[];
  toneSummary: string | null;
  nodeCount: number;
}): string {
  const lines: string[] = [
    "You are CampaignOS — an AI operating system for modern political campaigns.",
    AGENT_PERSONAS[input.agentMode],
    "",
    "Campaign context:",
    `- Candidate / campaign: ${input.campaignName}`,
  ];

  if (input.office) lines.push(`- Office sought: ${input.office}`);
  if (input.jurisdiction) lines.push(`- Jurisdiction: ${input.jurisdiction}`);
  if (input.state) lines.push(`- State: ${input.state}`);
  if (input.topIssues.length > 0)
    lines.push(`- Top issues: ${input.topIssues.join(", ")}`);
  if (input.toneSummary) lines.push(`- Brand tone: ${input.toneSummary}`);
  lines.push(`- Knowledge graph nodes so far: ${input.nodeCount}`);

  lines.push(
    "",
    "Guidance:",
    "- Be concise, concrete, and action-oriented. Prefer short paragraphs and tight bullet lists.",
    "- Ground answers in the campaign context above when relevant.",
    "- The campaign's knowledge graph grows as the team creates assets, events, tasks, research, and prospects in their modules. Encourage creating those when it helps.",
    "- Never fabricate compliance/legal certainty; recommend a qualified election-law attorney for binding questions.",
  );

  return lines.join("\n");
}

function cannedReply(input: {
  agentMode: AgentMode;
  campaignName: string;
  userText: string;
}): string {
  return [
    `Thanks — I've noted: "${input.userText.slice(0, 200)}".`,
    "",
    "AI responses aren't fully switched on in this workspace yet (no OpenAI key is configured server-side), so I can't draft a live answer right now. Here's how to keep building your campaign map in the meantime:",
    "",
    "- **Assets** — draft messaging, social posts, and scripts in Asset Studio.",
    "- **Planner** — schedule canvasses, phone banks, and events.",
    "- **Research** — capture district intel and opposition research.",
    "- **Fundraising** — track donor prospects and call time.",
    "",
    "Each item you create automatically adds a node to the knowledge graph on the left, so your campaign brain grows as you work. Once an OpenAI key is added, I'll respond conversationally here.",
  ].join("\n");
}

export async function sendChatMessage(input: {
  messages: ChatTurn[];
  agentMode?: AgentMode;
  /** Composer-selected model; falls back to OPENAI_MODEL / default. */
  model?: ChatModelId | string;
  /** Composer-selected effort; used as reasoning_effort or temperature. */
  effort?: ChatEffortId | string;
  /** Current Focus — private chat stays private but grounds on shared object. */
  focusContext?: {
    module?: string | null;
    objectType?: string | null;
    objectId?: string | null;
    objectTitle?: string | null;
    roomSummary?: string | null;
  } | null;
}): Promise<SendChatMessageResult> {
  const context = await requireCampaignContext();
  const agentMode: AgentMode = input.agentMode ?? "campaign-manager";
  const requestedModel = input.model?.trim() ?? "";
  const chatModel: ChatModelId = isChatModelId(requestedModel)
    ? requestedModel
    : isChatModelId(getOpenAiModel())
      ? (getOpenAiModel() as ChatModelId)
      : DEFAULT_CHAT_MODEL;
  const chatEffort: ChatEffortId = isChatEffortId(input.effort ?? "")
    ? (input.effort as ChatEffortId)
    : DEFAULT_CHAT_EFFORT;
  const modelMeta = getChatModel(chatModel);

  const history = input.messages
    .filter((m) => m.content.trim().length > 0)
    .slice(-MAX_HISTORY);
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const userText = lastUser?.content?.trim() ?? "";

  if (!context.ok) {
    return {
      ok: true,
      configured: isOpenAiConfigured(),
      graphFoldersToHighlight: [],
      graphNodeIdsToHighlight: [],
      reply:
        "I can't read your campaign yet — finish setting up your campaign so I can ground my answers in your race, issues, and audiences.",
    };
  }

  const campaignName = campaignDisplayName(context.campaign);

  const harnessPlan = await planHarnessTurn({
    campaignId: context.campaign.id,
    organizationId: context.campaign.organization_id,
    userMessage: userText,
    agentMode,
    campaignPath: "workspace",
  });

  const graphNodes = await listGraphNodes(context.campaign.id).catch(() => []);
  const graphNodeIdsToHighlight = resolveRetrievalNodeIds({
    nodes: graphNodes,
    contextPaths: harnessPlan.resolver.plan.contextPaths,
    graphFolders: harnessPlan.resolver.graphFoldersToHighlight,
  });

  if (!isOpenAiConfigured()) {
    return {
      ok: true,
      configured: false,
      graphFoldersToHighlight: harnessPlan.resolver.graphFoldersToHighlight,
      graphNodeIdsToHighlight,
      harnessSkillId: harnessPlan.resolver.plan.skillId,
      workflowId: harnessPlan.resolver.plan.workflowId ?? null,
      reply: cannedReply({ agentMode, campaignName, userText }),
    };
  }

  const client = getOpenAiClient();
  if (!client) {
    return {
      ok: true,
      configured: false,
      graphFoldersToHighlight: harnessPlan.resolver.graphFoldersToHighlight,
      graphNodeIdsToHighlight,
      harnessSkillId: harnessPlan.resolver.plan.skillId,
      workflowId: harnessPlan.resolver.plan.workflowId ?? null,
      reply: cannedReply({ agentMode, campaignName, userText }),
    };
  }

  const tonePrefs = context.profile?.tone_preferences as
    | { selectedTones?: string[]; notes?: string }
    | null
    | undefined;
  const toneSummary = tonePrefs?.selectedTones?.length
    ? tonePrefs.selectedTones.join(", ")
    : null;

  const nodeCount = await countGraphNodes(context.campaign.id).catch(() => 0);

  const baseSystemPrompt = buildSystemPrompt({
    agentMode,
    campaignName,
    office: context.campaign.office_sought,
    jurisdiction: context.campaign.jurisdiction,
    state: context.campaign.state,
    topIssues: context.profile?.top_issues ?? [],
    toneSummary,
    nodeCount,
  });

  const focusLines: string[] = [];
  if (input.focusContext?.objectType && input.focusContext.objectId) {
    focusLines.push(
      "",
      "Current Focus (shared campaign object the user is attending to):",
      `- Type: ${input.focusContext.objectType}`,
      `- Id: ${input.focusContext.objectId}`,
    );
    if (input.focusContext.objectTitle) {
      focusLines.push(`- Title: ${input.focusContext.objectTitle}`);
    }
    if (input.focusContext.module) {
      focusLines.push(`- Module: ${input.focusContext.module}`);
    }
    if (input.focusContext.roomSummary) {
      focusLines.push(
        `- Room awareness (non-private): ${input.focusContext.roomSummary}`,
      );
    }
    focusLines.push(
      "Prefer answers grounded in this Focus object. This chat is private to the user unless they explicitly promote a reply to a shared thread.",
    );
  }

  const systemPrompt = [
    baseSystemPrompt,
    ...focusLines,
    "",
    harnessPlan.systemPreamble,
    "",
    "## Loaded skills",
    harnessPlan.skillContext,
  ].join("\n");

  const model = chatModel;

  const response = await client.chat.completions.create({
    model,
    ...(modelMeta.supportsReasoningEffort
      ? { reasoning_effort: chatEffort }
      : { temperature: temperatureForEffort(chatEffort) }),
    messages: [
      { role: "system", content: systemPrompt },
      ...history.map((turn) => ({
        role: turn.role,
        content: turn.content,
      })),
    ],
  });

  const reply =
    response.choices[0]?.message?.content?.trim() ||
    "I wasn't able to generate a response just now. Please try again.";

  try {
    await logAiGeneration({
      campaignId: context.campaign.id,
      userId: context.userId,
      module: CHAT_MODULE,
      prompt: userText,
      systemPrompt,
      model,
      inputJson: {
        agentMode,
        effort: chatEffort,
        reasoningEffort: modelMeta.supportsReasoningEffort
          ? chatEffort
          : null,
        turns: history.length,
        harnessSkillId: harnessPlan.resolver.plan.skillId,
        workflowId: harnessPlan.resolver.plan.workflowId,
        graphFolders: harnessPlan.resolver.graphFoldersToHighlight,
        graphNodeIds: graphNodeIdsToHighlight,
      },
      outputText: reply,
      tokensInput: response.usage?.prompt_tokens ?? null,
      tokensOutput: response.usage?.completion_tokens ?? null,
    });
  } catch (error) {
    console.error("[sendChatMessage] failed to log generation", error);
  }

  return {
    ok: true,
    reply,
    configured: true,
    graphFoldersToHighlight: harnessPlan.resolver.graphFoldersToHighlight,
    graphNodeIdsToHighlight,
    harnessSkillId: harnessPlan.resolver.plan.skillId,
    workflowId: harnessPlan.resolver.plan.workflowId ?? null,
  };
}
