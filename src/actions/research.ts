"use server";

import { revalidatePath } from "next/cache";
import { generateResearchBriefContent } from "@/lib/ai/generate-research-brief";
import { getOpenAiModel, isOpenAiConfigured } from "@/lib/ai/config";
import {
  requireCampaignContext,
  type ModuleActionResult,
} from "@/lib/auth/require-campaign-context";
import { listGraphEdges, listGraphNodes } from "@/lib/db/campaigns";
import { linkResearchToCampaignGraph, linkTaskToCampaignGraph } from "@/lib/db/graph";
import {
  createResearchBrief,
  deleteResearchBrief,
  getResearchBriefById,
  listResearchBriefs,
  updateResearchBrief,
} from "@/lib/db/research-briefs";
import { createTask } from "@/lib/db/tasks";
import { campaignDisplayName } from "@/lib/db/schema";
import {
  createResearchBriefSchema,
  generateResearchBriefRequestSchema,
  updateResearchBriefSchema,
  type ListResearchBriefsFilter,
  type ResearchSource,
  type ResearchType,
} from "@/lib/validators/research-briefs";
import { createTaskSchema } from "@/lib/validators/tasks";

export type ResearchActionResult =
  | { ok: true; briefId: string }
  | {
      ok: false;
      error: string;
      code?:
        | "missing_org"
        | "missing_campaign"
        | "missing_openai"
        | "unauthorized"
        | "forbidden"
        | "not_found"
        | "validation"
        | "generation_failed";
    };

async function finalizeNewBrief(input: {
  campaignId: string;
  candidateName: string;
  briefId: string;
  briefTitle: string;
  researchType: string;
  relatedIssueTitles?: string[];
}) {
  const existingNodes = await listGraphNodes(input.campaignId);
  await linkResearchToCampaignGraph({
    campaignId: input.campaignId,
    briefId: input.briefId,
    briefTitle: input.briefTitle,
    researchType: input.researchType,
    candidateName: input.candidateName,
    relatedIssueTitles: input.relatedIssueTitles,
    existingNodes,
  });
}

export async function getResearchBriefsForCampaign(
  filters?: Omit<ListResearchBriefsFilter, "campaignId">,
) {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false as const, error: context.error, briefs: [] };
  }

  const briefs = await listResearchBriefs({
    campaignId: context.campaign.id,
    ...filters,
  });

  return {
    ok: true as const,
    briefs,
    openAiConfigured: isOpenAiConfigured(),
    topIssues: context.profile?.top_issues ?? [],
  };
}

export type BriefGraphLink = {
  id: string;
  title: string;
  type: string;
};

/**
 * Read-only map of brief id → connected graph nodes, computed from existing
 * graph data so the detail drawer can surface linked issues, candidates, and
 * tasks. No schema changes: we resolve each brief's research node by
 * `source_object_type`/`source_object_id`, then follow its edges.
 */
export async function getResearchGraphLinks(): Promise<
  Record<string, BriefGraphLink[]>
> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return {};
  }

  const [nodes, edges] = await Promise.all([
    listGraphNodes(context.campaign.id),
    listGraphEdges(context.campaign.id),
  ]);

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const researchNodes = nodes.filter(
    (node) =>
      node.source_object_type === "research_brief" &&
      Boolean(node.source_object_id),
  );

  const linksByBrief: Record<string, BriefGraphLink[]> = {};

  for (const researchNode of researchNodes) {
    const briefId = researchNode.source_object_id;
    if (!briefId) continue;

    const seen = new Set<string>();
    const links: BriefGraphLink[] = [];

    for (const edge of edges) {
      let otherId: string | null = null;
      if (edge.source_node_id === researchNode.id) {
        otherId = edge.target_node_id;
      } else if (edge.target_node_id === researchNode.id) {
        otherId = edge.source_node_id;
      }
      if (!otherId || seen.has(otherId)) continue;

      const other = nodeById.get(otherId);
      if (!other) continue;

      seen.add(otherId);
      links.push({
        id: other.id,
        title: other.title,
        type: String(other.node_type).replace(/_/g, " "),
      });
    }

    linksByBrief[briefId] = links;
  }

  return linksByBrief;
}

export async function createResearchBriefManual(input: {
  researchType: ResearchType;
  title: string;
  topic?: string;
  summary?: string;
  body?: string;
  keyFindings?: string[];
  sources?: ResearchSource[];
  status?: "draft" | "complete";
}): Promise<ResearchActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const parsed = createResearchBriefSchema.safeParse({
    campaignId: context.campaign.id,
    researchType: input.researchType,
    title: input.title,
    topic: input.topic,
    summary: input.summary,
    body: input.body,
    keyFindings: input.keyFindings,
    sources: input.sources,
    status: input.status ?? "draft",
    aiGenerated: false,
    createdBy: context.dbUserId,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid brief data",
      code: "validation",
    };
  }

  try {
    const result = await createResearchBrief(parsed.data);
    if (!result.brief) {
      return {
        ok: false,
        error: "Database is not configured. Brief was not saved.",
        code: "missing_campaign",
      };
    }

    await finalizeNewBrief({
      campaignId: context.campaign.id,
      candidateName: campaignDisplayName(context.campaign),
      briefId: result.brief.id,
      briefTitle: result.brief.title,
      researchType: parsed.data.researchType,
      relatedIssueTitles: context.profile?.top_issues ?? undefined,
    });

    revalidatePath("/research");
    revalidatePath("/dashboard");

    return { ok: true, briefId: result.brief.id };
  } catch (error) {
    console.error("[createResearchBriefManual]", error);
    return {
      ok: false,
      error: "Failed to create research brief. Please try again.",
    };
  }
}

export async function generateResearchBrief(
  request: Parameters<typeof generateResearchBriefRequestSchema.parse>[0],
): Promise<ResearchActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  if (!isOpenAiConfigured()) {
    return {
      ok: false,
      error:
        "OpenAI is not configured. Add OPENAI_API_KEY to generate briefs with AI.",
      code: "missing_openai",
    };
  }

  const parsedRequest = generateResearchBriefRequestSchema.safeParse(request);
  if (!parsedRequest.success) {
    return {
      ok: false,
      error: parsedRequest.error.issues[0]?.message ?? "Invalid request",
      code: "validation",
    };
  }

  try {
    const generated = await generateResearchBriefContent({
      campaign: context.campaign,
      profile: context.profile,
      campaignId: context.campaign.id,
      userId: context.dbUserId,
      request: parsedRequest.data,
    });

    const model = getOpenAiModel();
    const briefInput = createResearchBriefSchema.parse({
      campaignId: context.campaign.id,
      researchType: parsedRequest.data.researchType,
      title: generated.title,
      topic: parsedRequest.data.topic,
      summary: generated.summary,
      keyFindings: generated.key_findings,
      sources: generated.sources ?? [],
      status: "draft",
      aiGenerated: true,
      promptUsed: parsedRequest.data.topic,
      modelUsed: model,
      createdBy: context.dbUserId,
    });

    const result = await createResearchBrief(briefInput);
    if (!result.brief) {
      return {
        ok: false,
        error: "Database is not configured. Brief was not saved.",
        code: "missing_campaign",
      };
    }

    const relatedIssues =
      generated.related_issues ??
      parsedRequest.data.relatedIssues ??
      context.profile?.top_issues ??
      undefined;

    await finalizeNewBrief({
      campaignId: context.campaign.id,
      candidateName: campaignDisplayName(context.campaign),
      briefId: result.brief.id,
      briefTitle: result.brief.title,
      researchType: parsedRequest.data.researchType,
      relatedIssueTitles: relatedIssues,
    });

    revalidatePath("/research");
    revalidatePath("/dashboard");

    return { ok: true, briefId: result.brief.id };
  } catch (error) {
    console.error("[generateResearchBrief]", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Research brief generation failed. Please try again.",
      code: "generation_failed",
    };
  }
}

export async function updateResearchBriefContent(input: {
  briefId: string;
  researchType?: ResearchType;
  title?: string;
  topic?: string | null;
  summary?: string | null;
  body?: string | null;
  keyFindings?: string[];
  sources?: ResearchSource[];
  status?: "draft" | "complete";
}): Promise<ResearchActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const existing = await getResearchBriefById(
    context.campaign.id,
    input.briefId,
  );
  if (!existing) {
    return { ok: false, error: "Research brief not found", code: "not_found" };
  }

  const parsed = updateResearchBriefSchema.safeParse({
    id: input.briefId,
    campaignId: context.campaign.id,
    researchType: input.researchType,
    title: input.title,
    topic: input.topic,
    summary: input.summary,
    body: input.body,
    keyFindings: input.keyFindings,
    sources: input.sources,
    status: input.status,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid brief data",
      code: "validation",
    };
  }

  try {
    const result = await updateResearchBrief(parsed.data);
    if (!result.brief) {
      return {
        ok: false,
        error: "Database is not configured. Brief was not saved.",
      };
    }

    revalidatePath("/research");
    revalidatePath("/dashboard");

    return { ok: true, briefId: result.brief.id };
  } catch (error) {
    console.error("[updateResearchBriefContent]", error);
    return { ok: false, error: "Failed to update research brief." };
  }
}

export async function deleteResearchBriefAction(
  briefId: string,
): Promise<ResearchActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const existing = await getResearchBriefById(
    context.campaign.id,
    briefId,
  );
  if (!existing) {
    return { ok: false, error: "Research brief not found", code: "not_found" };
  }

  try {
    await deleteResearchBrief(context.campaign.id, briefId);
    revalidatePath("/research");
    revalidatePath("/dashboard");
    return { ok: true, briefId };
  } catch (error) {
    console.error("[deleteResearchBriefAction]", error);
    return { ok: false, error: "Failed to delete research brief." };
  }
}

export async function createTaskFromResearchBrief(
  briefId: string,
  input?: { title?: string; description?: string },
): Promise<ModuleActionResult> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const brief = await getResearchBriefById(context.campaign.id, briefId);
  if (!brief) {
    return { ok: false, error: "Research brief not found", code: "not_found" };
  }

  const parsed = createTaskSchema.safeParse({
    campaignId: context.campaign.id,
    title: input?.title?.trim() || `Follow up: ${brief.title}`,
    description:
      input?.description?.trim() ||
      brief.summary ||
      "Task linked to research brief.",
    status: "todo",
    priority: "medium",
    createdBy: context.dbUserId,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid task data",
      code: "validation",
    };
  }

  try {
    const result = await createTask({
      ...parsed.data,
      relatedResearchId: briefId,
    });

    if (!result.task) {
      return {
        ok: false,
        error: "Database is not configured. Task was not saved.",
        code: "missing_campaign",
      };
    }

    const existingNodes = await listGraphNodes(context.campaign.id);
    await linkTaskToCampaignGraph({
      campaignId: context.campaign.id,
      taskId: result.task.id,
      taskTitle: result.task.title,
      status: result.task.status,
      candidateName: campaignDisplayName(context.campaign),
      existingNodes,
    });

    revalidatePath("/tasks");
    revalidatePath("/dashboard");

    return { ok: true, id: result.task.id };
  } catch (error) {
    console.error("[createTaskFromResearchBrief]", error);
    return { ok: false, error: "Failed to create task from brief." };
  }
}
