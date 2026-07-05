import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import type { DbGraphNode } from "@/lib/db/schema";
import type { CampaignBrainOutput } from "@/lib/ai/schemas/campaign-brain";
import { CAMPAIGN_FOLDERS } from "@/lib/campaign-knowledge/folders";
import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import {
  resolveAssetKnowledgeFolder,
  resolveEventKnowledgeFolder,
} from "@/lib/graph/folder-routing";
import { buildEntityGraphMetadata } from "@/lib/graph/entity-metadata";
import { CENTER_FOLDER, folderForNode } from "@/lib/graph/folder-clusters";
import { slugifyKnowledgeTitle } from "@/lib/campaign-knowledge/slug";
import type { CalendarEventType } from "@/lib/validators/calendar-events";
import {
  graphNodeTypeSchema,
  graphRelationshipTypeSchema,
  type GraphNodeType,
  type GraphRelationshipType,
} from "@/lib/validators/enums";
import { z } from "zod";

const createGraphNodeSchema = z.object({
  campaignId: z.uuid(),
  nodeType: graphNodeTypeSchema,
  title: z.string().min(1),
  summary: z.string().optional(),
  sourceObjectType: z.string().optional(),
  sourceObjectId: z.uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateGraphNodeInput = z.infer<typeof createGraphNodeSchema>;

const createGraphEdgeSchema = z.object({
  campaignId: z.uuid(),
  sourceNodeId: z.uuid(),
  targetNodeId: z.uuid(),
  relationshipType: graphRelationshipTypeSchema,
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateGraphEdgeInput = z.infer<typeof createGraphEdgeSchema>;

export async function createGraphEdge(input: CreateGraphEdgeInput) {
  const parsed = createGraphEdgeSchema.parse(input);

  if (!isSupabaseConfigured()) {
    console.info(
      "[graph] Supabase not configured — skipping graph edge",
      parsed.relationshipType,
    );
    return { synced: false as const, edge: null };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("graph_edges")
    .insert({
      campaign_id: parsed.campaignId,
      source_node_id: parsed.sourceNodeId,
      target_node_id: parsed.targetNodeId,
      relationship_type: parsed.relationshipType,
      confidence: parsed.confidence ?? null,
      metadata_json: parsed.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    edge: data,
  };
}

export async function createGraphNode(input: CreateGraphNodeInput) {
  const parsed = createGraphNodeSchema.parse(input);

  if (!isSupabaseConfigured()) {
    console.info(
      "[graph] Supabase not configured — skipping graph node",
      parsed.nodeType,
      parsed.title,
    );
    return { synced: false as const, node: null };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("graph_nodes")
    .insert({
      campaign_id: parsed.campaignId,
      node_type: parsed.nodeType,
      title: parsed.title,
      summary: parsed.summary ?? null,
      source_object_type: parsed.sourceObjectType ?? null,
      source_object_id: parsed.sourceObjectId ?? null,
      metadata_json: parsed.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    node: data as DbGraphNode,
  };
}

export async function seedCampaignGraphNodes(input: {
  campaignId: string;
  candidateName: string;
  topIssues: string[];
  voterSegments: Array<{ name: string; description?: string }>;
}) {
  // Candidate only — issues and voter segments are compiled from wiki pages
  // during bootstrap + syncCampaignKnowledgeToGraph (avoids duplicate nodes).
  void input.topIssues;
  void input.voterSegments;

  const result = await createGraphNode({
    campaignId: input.campaignId,
    nodeType: "candidate",
    title: input.candidateName,
    summary: "Campaign candidate seeded from onboarding",
    sourceObjectType: "campaign",
    sourceObjectId: input.campaignId,
    metadata: buildEntityGraphMetadata({
      folder: "campaign",
      path: "campaign/profile.md",
      source: "onboarding",
      knowledgeKind: "document",
    }),
  });

  return [result];
}

const BRAIN_GRAPH_SOURCE = "campaign_brain";

export async function clearBrainGeneratedGraph(campaignId: string) {
  if (!isSupabaseConfigured()) {
    return { synced: false as const, removedNodes: 0 };
  }

  const supabase = getSupabaseAdmin();
  const { data: brainNodes, error: nodesError } = await supabase
    .from("graph_nodes")
    .select("id")
    .eq("campaign_id", campaignId)
    .contains("metadata_json", { source: BRAIN_GRAPH_SOURCE });

  if (nodesError) {
    throw nodesError;
  }

  const nodeIds = (brainNodes ?? []).map((node) => node.id as string);
  if (nodeIds.length === 0) {
    return { synced: true as const, removedNodes: 0 };
  }

  const { error: edgesError } = await supabase
    .from("graph_edges")
    .delete()
    .eq("campaign_id", campaignId)
    .or(
      nodeIds
        .flatMap((id) => [
          `source_node_id.eq.${id}`,
          `target_node_id.eq.${id}`,
        ])
        .join(","),
    );

  if (edgesError) {
    throw edgesError;
  }

  const { error: deleteNodesError } = await supabase
    .from("graph_nodes")
    .delete()
    .in("id", nodeIds);

  if (deleteNodesError) {
    throw deleteNodesError;
  }

  return { synced: true as const, removedNodes: nodeIds.length };
}

function normalizeTitle(value: string): string {
  return value.trim().toLowerCase();
}

function findNodeByTypeAndTitle(
  nodes: DbGraphNode[],
  nodeType: GraphNodeType,
  title: string,
): DbGraphNode | undefined {
  const normalized = normalizeTitle(title);
  return nodes.find(
    (node) =>
      node.node_type === nodeType &&
      normalizeTitle(node.title) === normalized,
  );
}

async function ensureGraphEdge(input: {
  campaignId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: GraphRelationshipType;
  existingEdgeKeys: Set<string>;
}) {
  const edgeKey = `${input.sourceNodeId}:${input.targetNodeId}:${input.relationshipType}`;
  if (input.existingEdgeKeys.has(edgeKey)) {
    return;
  }

  await createGraphEdge({
    campaignId: input.campaignId,
    sourceNodeId: input.sourceNodeId,
    targetNodeId: input.targetNodeId,
    relationshipType: input.relationshipType,
    metadata: { source: BRAIN_GRAPH_SOURCE },
  });
  input.existingEdgeKeys.add(edgeKey);
}

export async function enrichCampaignBrainGraph(input: {
  campaignId: string;
  candidateName: string;
  brain: CampaignBrainOutput;
  existingNodes: DbGraphNode[];
  existingEdges: Array<{
    source_node_id: string;
    target_node_id: string;
    relationship_type: GraphRelationshipType;
  }>;
}) {
  await clearBrainGeneratedGraph(input.campaignId);

  const nodes = [...input.existingNodes];
  const existingEdgeKeys = new Set(
    input.existingEdges.map(
      (edge) =>
        `${edge.source_node_id}:${edge.target_node_id}:${edge.relationship_type}`,
    ),
  );

  let candidateNode = findNodeByTypeAndTitle(
    nodes,
    "candidate",
    input.candidateName,
  );

  if (!candidateNode) {
    const created = await createGraphNode({
      campaignId: input.campaignId,
      nodeType: "candidate",
      title: input.candidateName,
      summary: "Campaign candidate",
    metadata: buildEntityGraphMetadata({
      folder: "campaign",
      path: "campaign/profile.md",
      source: "onboarding",
    }),
    });
    if (created.node) {
      candidateNode = created.node;
      nodes.push(created.node);
    }
  }

  const issueNodeByTitle = new Map<string, DbGraphNode>();

  for (const entry of input.brain.issueMap) {
    let issueNode = findNodeByTypeAndTitle(nodes, "issue", entry.issue);
    if (!issueNode) {
      const created = await createGraphNode({
        campaignId: input.campaignId,
        nodeType: "issue",
        title: entry.issue,
        summary: entry.strategicNotes,
        metadata: buildEntityGraphMetadata({
          folder: "messaging",
          path: `messaging/${slugifyKnowledgeTitle(entry.issue)}.md`,
          source: BRAIN_GRAPH_SOURCE,
          extra: { issue: entry.issue },
        }),
      });
      if (created.node) {
        issueNode = created.node;
        nodes.push(created.node);
      }
    }

    if (!issueNode) {
      continue;
    }

    issueNodeByTitle.set(normalizeTitle(entry.issue), issueNode);

    if (candidateNode) {
      await ensureGraphEdge({
        campaignId: input.campaignId,
        sourceNodeId: candidateNode.id,
        targetNodeId: issueNode.id,
        relationshipType: "supports",
        existingEdgeKeys,
      });
    }

    for (const message of entry.priorityMessages) {
      const messageNodeResult = await createGraphNode({
        campaignId: input.campaignId,
        nodeType: "message_theme",
        title: message,
        summary: `Priority message for ${entry.issue}`,
        metadata: buildEntityGraphMetadata({
          folder: "messaging",
          path: `messaging/${slugifyKnowledgeTitle(message)}.md`,
          source: BRAIN_GRAPH_SOURCE,
          extra: { issue: entry.issue },
        }),
      });

      if (messageNodeResult.node) {
        await ensureGraphEdge({
          campaignId: input.campaignId,
          sourceNodeId: issueNode.id,
          targetNodeId: messageNodeResult.node.id,
          relationshipType: "aligns_with",
          existingEdgeKeys,
        });
      }
    }
  }

  for (const message of input.brain.messageFramework.keyMessages) {
    const messageNodeResult = await createGraphNode({
      campaignId: input.campaignId,
      nodeType: "message_theme",
      title: message,
      summary: "Core campaign message from Campaign Brain",
      metadata: buildEntityGraphMetadata({
        folder: "messaging",
        path: `messaging/${slugifyKnowledgeTitle(message)}.md`,
        source: BRAIN_GRAPH_SOURCE,
        extra: { scope: "key_message" },
      }),
    });

    if (messageNodeResult.node && candidateNode) {
      await ensureGraphEdge({
        campaignId: input.campaignId,
        sourceNodeId: candidateNode.id,
        targetNodeId: messageNodeResult.node.id,
        relationshipType: "aligns_with",
        existingEdgeKeys,
      });
    }
  }

  const priorities = input.brain.strategicPriorities ?? [];
  for (const priority of priorities) {
    const priorityNodeResult = await createGraphNode({
      campaignId: input.campaignId,
      nodeType: "strategic_priority",
      title: priority.title,
      summary: priority.description,
      metadata: buildEntityGraphMetadata({
        folder: "initiatives",
        path: `initiatives/${slugifyKnowledgeTitle(priority.title)}.md`,
        source: BRAIN_GRAPH_SOURCE,
      }),
    });

    if (priorityNodeResult.node && candidateNode) {
      await ensureGraphEdge({
        campaignId: input.campaignId,
        sourceNodeId: candidateNode.id,
        targetNodeId: priorityNodeResult.node.id,
        relationshipType: "supports",
        existingEdgeKeys,
      });
    }
  }

  return { synced: true as const };
}

async function linkNodeToIssueTitles(input: {
  campaignId: string;
  sourceNodeId: string;
  issueTitles: string[];
  existingNodes: DbGraphNode[];
  relationshipType: GraphRelationshipType;
  edgeMetadata: Record<string, unknown>;
}) {
  const issueNodes = findIssueNodesForTitles(
    input.existingNodes,
    input.issueTitles,
  );

  for (const issueNode of issueNodes) {
    await createGraphEdge({
      campaignId: input.campaignId,
      sourceNodeId: input.sourceNodeId,
      targetNodeId: issueNode.id,
      relationshipType: input.relationshipType,
      metadata: input.edgeMetadata,
    });
  }
}

async function linkNodeToMessageThemes(input: {
  campaignId: string;
  sourceNodeId: string;
  themeTitles: string[];
  existingNodes: DbGraphNode[];
  edgeMetadata: Record<string, unknown>;
}) {
  const normalizedThemes = new Set(
    input.themeTitles.map((title) => normalizeTitle(title)),
  );

  const themeNodes = input.existingNodes.filter(
    (node) =>
      node.node_type === "message_theme" &&
      normalizedThemes.has(normalizeTitle(node.title)),
  );

  for (const themeNode of themeNodes) {
    await createGraphEdge({
      campaignId: input.campaignId,
      sourceNodeId: input.sourceNodeId,
      targetNodeId: themeNode.id,
      relationshipType: "aligns_with",
      metadata: input.edgeMetadata,
    });
  }
}

export async function linkAssetToCampaignGraph(input: {
  campaignId: string;
  assetId: string;
  assetTitle: string;
  assetType: string;
  channel?: string | null;
  theme?: string | null;
  issue?: string | null;
  templateUsed?: string | null;
  candidateName: string;
  existingNodes: DbGraphNode[];
}) {
  const folder = resolveAssetKnowledgeFolder({
    assetType: input.assetType,
    channel: input.channel,
  });

  const assetNodeResult = await createGraphNode({
    campaignId: input.campaignId,
    nodeType: "asset",
    title: input.assetTitle,
    summary: `${input.assetType} asset from Asset Studio`,
    sourceObjectType: "asset",
    sourceObjectId: input.assetId,
    metadata: {
      source: "asset_studio",
      assetType: input.assetType,
      folder,
      path: `${folder}/${slugifyKnowledgeTitle(input.assetTitle)}.md`,
      knowledgeKind: "entity",
      channel: input.channel ?? null,
      templateUsed: input.templateUsed ?? null,
    },
  });

  if (!assetNodeResult.node) {
    return { synced: assetNodeResult.synced };
  }

  await linkObjectNodeToFolderHub({
    campaignId: input.campaignId,
    nodeId: assetNodeResult.node.id,
    folder,
    candidateName: input.candidateName,
    existingNodes: input.existingNodes,
    edgeMetadata: { source: "asset_studio" },
  });

  if (input.issue?.trim()) {
    await linkNodeToIssueTitles({
      campaignId: input.campaignId,
      sourceNodeId: assetNodeResult.node.id,
      issueTitles: [input.issue],
      existingNodes: input.existingNodes,
      relationshipType: "aligns_with",
      edgeMetadata: { source: "asset_studio" },
    });
  }

  if (input.theme?.trim()) {
    await linkNodeToMessageThemes({
      campaignId: input.campaignId,
      sourceNodeId: assetNodeResult.node.id,
      themeTitles: [input.theme],
      existingNodes: input.existingNodes,
      edgeMetadata: { source: "asset_studio" },
    });
  }

  return { synced: true as const, node: assetNodeResult.node };
}

export async function getGraphNodeBySourceObject(input: {
  campaignId: string;
  sourceObjectType: string;
  sourceObjectId: string;
}): Promise<DbGraphNode | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("graph_nodes")
    .select("*")
    .eq("campaign_id", input.campaignId)
    .eq("source_object_type", input.sourceObjectType)
    .eq("source_object_id", input.sourceObjectId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? (data as DbGraphNode) : null;
}

function findFolderHub(
  nodes: DbGraphNode[],
  folder: CampaignFolderId,
): DbGraphNode | undefined {
  return nodes.find(
    (node) =>
      node.metadata_json?.cluster === true &&
      node.metadata_json?.folder === folder &&
      node.metadata_json?.knowledgeKind === "folder_hub",
  );
}

async function belongsToEdgeExists(input: {
  campaignId: string;
  sourceNodeId: string;
  targetNodeId: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("graph_edges")
    .select("id")
    .eq("campaign_id", input.campaignId)
    .eq("source_node_id", input.sourceNodeId)
    .eq("target_node_id", input.targetNodeId)
    .eq("relationship_type", "belongs_to")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function linkObjectNodeToFolderHub(input: {
  campaignId: string;
  nodeId: string;
  folder: CampaignFolderId;
  candidateName: string;
  existingNodes: DbGraphNode[];
  edgeMetadata: Record<string, unknown>;
}) {
  const candidateNode = input.existingNodes.find(
    (node) =>
      node.node_type === "candidate" &&
      node.title.trim().toLowerCase() ===
        input.candidateName.trim().toLowerCase(),
  );

  const hub = findFolderHub(input.existingNodes, input.folder);
  const targetId =
    hub?.id ??
    (input.folder === CENTER_FOLDER ? candidateNode?.id : candidateNode?.id);

  if (!targetId || targetId === input.nodeId) {
    return;
  }

  const exists = await belongsToEdgeExists({
    campaignId: input.campaignId,
    sourceNodeId: input.nodeId,
    targetNodeId: targetId,
  });
  if (exists) {
    return;
  }

  await createGraphEdge({
    campaignId: input.campaignId,
    sourceNodeId: input.nodeId,
    targetNodeId: targetId,
    relationshipType: "belongs_to",
    metadata: input.edgeMetadata,
  });
}

/** Persist folder-hub nodes for every standard campaign folder. */
export async function seedFolderHubsForCampaign(campaignId: string) {
  if (!isSupabaseConfigured()) {
    return { synced: false as const, seeded: 0 };
  }

  const supabase = getSupabaseAdmin();
  const { data: existingNodes, error: nodesError } = await supabase
    .from("graph_nodes")
    .select("*")
    .eq("campaign_id", campaignId);

  if (nodesError) {
    throw nodesError;
  }

  const nodes = (existingNodes ?? []) as DbGraphNode[];
  const candidate = nodes.find((node) => node.node_type === "candidate");
  let seeded = 0;

  for (const folderDef of CAMPAIGN_FOLDERS) {
    if (folderDef.id === CENTER_FOLDER || !folderDef.isCluster) {
      continue;
    }
    if (findFolderHub(nodes, folderDef.id)) {
      continue;
    }

    const nodeType = folderDef.graphNodeTypes[0] ?? "strategic_priority";
    const result = await createGraphNode({
      campaignId,
      nodeType,
      title: folderDef.label,
      summary: folderDef.description,
      metadata: {
        source: "folder_hub_seed",
        folder: folderDef.id,
        cluster: true,
        knowledgeKind: "folder_hub",
        path: `${folderDef.slug}/`,
      },
    });

    if (!result.node) {
      continue;
    }

    nodes.push(result.node);
    seeded += 1;

    if (candidate) {
      const edgeExists = await belongsToEdgeExists({
        campaignId,
        sourceNodeId: result.node.id,
        targetNodeId: candidate.id,
      });
      if (!edgeExists) {
        await createGraphEdge({
          campaignId,
          sourceNodeId: result.node.id,
          targetNodeId: candidate.id,
          relationshipType: "belongs_to",
          metadata: { source: "folder_hub_seed" },
        });
      }
    }
  }

  return { synced: true as const, seeded };
}

/** Wire wiki document nodes to their folder hub via `belongs_to` edges. */
export async function linkWikiDocumentsToFolderHubs(input: {
  campaignId: string;
  nodeIds: string[];
}): Promise<{ linked: number }> {
  if (!isSupabaseConfigured() || input.nodeIds.length === 0) {
    return { linked: 0 };
  }

  const supabase = getSupabaseAdmin();
  const { data: existingNodes, error: nodesError } = await supabase
    .from("graph_nodes")
    .select("*")
    .eq("campaign_id", input.campaignId);

  if (nodesError) {
    throw nodesError;
  }

  const nodes = (existingNodes ?? []) as DbGraphNode[];
  let linked = 0;

  for (const nodeId of input.nodeIds) {
    const node = nodes.find((row) => row.id === nodeId);
    if (!node || node.metadata_json?.cluster === true) {
      continue;
    }

    const folder = folderForNode({
      nodeType: node.node_type,
      metadata: node.metadata_json,
    });
    if (folder === CENTER_FOLDER) {
      continue;
    }

    const hub = findFolderHub(nodes, folder);
    if (!hub || hub.id === nodeId) {
      continue;
    }

    const exists = await belongsToEdgeExists({
      campaignId: input.campaignId,
      sourceNodeId: nodeId,
      targetNodeId: hub.id,
    });
    if (exists) {
      continue;
    }

    await createGraphEdge({
      campaignId: input.campaignId,
      sourceNodeId: nodeId,
      targetNodeId: hub.id,
      relationshipType: "belongs_to",
      metadata: { source: "wiki_sync" },
    });
    linked += 1;
  }

  return { linked };
}

async function linkObjectNodeToAsset(input: {
  campaignId: string;
  nodeId: string;
  assetId: string;
  existingNodes: DbGraphNode[];
  relationshipType: "references" | "scheduled_for";
  edgeMetadata: Record<string, unknown>;
}) {
  const assetNode = input.existingNodes.find(
    (node) =>
      node.node_type === "asset" && node.source_object_id === input.assetId,
  );

  if (assetNode) {
    await createGraphEdge({
      campaignId: input.campaignId,
      sourceNodeId: input.nodeId,
      targetNodeId: assetNode.id,
      relationshipType: input.relationshipType,
      metadata: input.edgeMetadata,
    });
  }
}

export async function linkEventToCampaignGraph(input: {
  campaignId: string;
  eventId: string;
  eventTitle: string;
  eventType: CalendarEventType | string;
  candidateName: string;
  relatedAssetId?: string | null;
  channel?: string | null;
  existingNodes: DbGraphNode[];
}) {
  const folder = resolveEventKnowledgeFolder(input.eventType as CalendarEventType);

  const eventNodeResult = await createGraphNode({
    campaignId: input.campaignId,
    nodeType: "event",
    title: input.eventTitle,
    summary: `${input.eventType} calendar event`,
    sourceObjectType: "calendar_event",
    sourceObjectId: input.eventId,
    metadata: {
      source: "planner",
      eventType: input.eventType,
      folder,
      path: `${folder}/${slugifyKnowledgeTitle(input.eventTitle)}.md`,
      knowledgeKind: "entity",
      channel: input.channel ?? null,
    },
  });

  if (!eventNodeResult.node) {
    return { synced: eventNodeResult.synced };
  }

  await linkObjectNodeToFolderHub({
    campaignId: input.campaignId,
    nodeId: eventNodeResult.node.id,
    folder,
    candidateName: input.candidateName,
    existingNodes: input.existingNodes,
    edgeMetadata: { source: "planner" },
  });

  if (input.relatedAssetId) {
    await linkObjectNodeToAsset({
      campaignId: input.campaignId,
      nodeId: eventNodeResult.node.id,
      assetId: input.relatedAssetId,
      existingNodes: input.existingNodes,
      relationshipType: "scheduled_for",
      edgeMetadata: { source: "planner" },
    });
  }

  return { synced: true as const, node: eventNodeResult.node };
}

export async function linkContentCalendarToCampaignGraph(input: {
  campaignId: string;
  calendarTitle: string;
  summary: string;
  candidateName: string;
  contentEventNodeIds: string[];
  existingNodes: DbGraphNode[];
}) {
  const calendarNodeResult = await createGraphNode({
    campaignId: input.campaignId,
    nodeType: "message_theme",
    title: input.calendarTitle,
    summary: input.summary,
    metadata: {
      source: "content_calendar",
      folder: "social-media",
      path: "social-media/content-calendar.md",
      knowledgeKind: "document",
    },
  });

  if (!calendarNodeResult.node) {
    return { synced: calendarNodeResult.synced };
  }

  await linkObjectNodeToFolderHub({
    campaignId: input.campaignId,
    nodeId: calendarNodeResult.node.id,
    folder: "social-media",
    candidateName: input.candidateName,
    existingNodes: input.existingNodes,
    edgeMetadata: { source: "content_calendar" },
  });

  for (const eventNodeId of input.contentEventNodeIds) {
    await createGraphEdge({
      campaignId: input.campaignId,
      sourceNodeId: calendarNodeResult.node.id,
      targetNodeId: eventNodeId,
      relationshipType: "connected_to",
      metadata: { source: "content_calendar" },
    });
  }

  return { synced: true as const, node: calendarNodeResult.node };
}

export async function linkTaskToCampaignGraph(input: {
  campaignId: string;
  taskId: string;
  taskTitle: string;
  status: string;
  candidateName: string;
  relatedAssetId?: string | null;
  relatedEventId?: string | null;
  existingNodes: DbGraphNode[];
}) {
  const taskNodeResult = await createGraphNode({
    campaignId: input.campaignId,
    nodeType: "task",
    title: input.taskTitle,
    summary: `Task (${input.status})`,
    sourceObjectType: "task",
    sourceObjectId: input.taskId,
    metadata: buildEntityGraphMetadata({
      folder: "initiatives",
      path: `initiatives/${slugifyKnowledgeTitle(input.taskTitle)}.md`,
      source: "tasks",
      extra: { status: input.status },
    }),
  });

  if (!taskNodeResult.node) {
    return { synced: taskNodeResult.synced };
  }

  await linkObjectNodeToFolderHub({
    campaignId: input.campaignId,
    nodeId: taskNodeResult.node.id,
    folder: "initiatives",
    candidateName: input.candidateName,
    existingNodes: input.existingNodes,
    edgeMetadata: { source: "tasks" },
  });

  if (input.relatedAssetId) {
    await linkObjectNodeToAsset({
      campaignId: input.campaignId,
      nodeId: taskNodeResult.node.id,
      assetId: input.relatedAssetId,
      existingNodes: input.existingNodes,
      relationshipType: "references",
      edgeMetadata: { source: "tasks" },
    });
  }

  if (input.relatedEventId) {
    const eventNode = input.existingNodes.find(
      (node) =>
        node.node_type === "event" &&
        node.source_object_id === input.relatedEventId,
    );

    if (eventNode) {
      await createGraphEdge({
        campaignId: input.campaignId,
        sourceNodeId: taskNodeResult.node.id,
        targetNodeId: eventNode.id,
        relationshipType: "connected_to",
        metadata: { source: "tasks" },
      });
    }
  }

  return { synced: true as const, node: taskNodeResult.node };
}

function findIssueNodesForTitles(
  nodes: DbGraphNode[],
  issueTitles: string[],
): DbGraphNode[] {
  const normalizedTitles = new Set(
    issueTitles.map((title) => normalizeTitle(title)),
  );

  return nodes.filter(
    (node) =>
      node.node_type === "issue" &&
      normalizedTitles.has(normalizeTitle(node.title)),
  );
}

export async function linkResearchToCampaignGraph(input: {
  campaignId: string;
  briefId: string;
  briefTitle: string;
  researchType: string;
  candidateName: string;
  relatedIssueTitles?: string[];
  existingNodes: DbGraphNode[];
}) {
  const researchNodeResult = await createGraphNode({
    campaignId: input.campaignId,
    nodeType: "research",
    title: input.briefTitle,
    summary: `${input.researchType} research brief`,
    sourceObjectType: "research_brief",
    sourceObjectId: input.briefId,
    metadata: buildEntityGraphMetadata({
      folder: "research",
      path: `research/${slugifyKnowledgeTitle(input.briefTitle)}.md`,
      source: "research_hub",
      extra: { researchType: input.researchType },
    }),
  });

  if (!researchNodeResult.node) {
    return { synced: researchNodeResult.synced };
  }

  await linkObjectNodeToFolderHub({
    campaignId: input.campaignId,
    nodeId: researchNodeResult.node.id,
    folder: "research",
    candidateName: input.candidateName,
    existingNodes: input.existingNodes,
    edgeMetadata: { source: "research_hub" },
  });

  const issueTitles = input.relatedIssueTitles ?? [];
  const issueNodes = findIssueNodesForTitles(input.existingNodes, issueTitles);

  for (const issueNode of issueNodes) {
    await createGraphEdge({
      campaignId: input.campaignId,
      sourceNodeId: researchNodeResult.node.id,
      targetNodeId: issueNode.id,
      relationshipType: "references",
      metadata: { source: "research_hub" },
    });
  }

  return { synced: true as const, node: researchNodeResult.node };
}

export async function linkProspectToCampaignGraph(input: {
  campaignId: string;
  prospectId: string;
  prospectName: string;
  prospectType: string;
  status: string;
  candidateName: string;
  relatedIssue?: string | null;
  existingNodes: DbGraphNode[];
}) {
  const existing = input.existingNodes.find(
    (node) =>
      node.node_type === "prospect" &&
      node.source_object_type === "fundraising_prospect" &&
      node.source_object_id === input.prospectId,
  );

  if (existing) {
    return { synced: true as const, node: existing };
  }

  const prospectNodeResult = await createGraphNode({
    campaignId: input.campaignId,
    nodeType: "prospect",
    title: input.prospectName,
    summary: `${input.prospectType} prospect (${input.status})`,
    sourceObjectType: "fundraising_prospect",
    sourceObjectId: input.prospectId,
    metadata: buildEntityGraphMetadata({
      folder: "fundraising",
      path: `fundraising/${slugifyKnowledgeTitle(input.prospectName)}.md`,
      source: "fundraising_planner",
      extra: {
        prospectType: input.prospectType,
        status: input.status,
      },
    }),
  });

  if (!prospectNodeResult.node) {
    return { synced: prospectNodeResult.synced };
  }

  await linkObjectNodeToFolderHub({
    campaignId: input.campaignId,
    nodeId: prospectNodeResult.node.id,
    folder: "fundraising",
    candidateName: input.candidateName,
    existingNodes: input.existingNodes,
    edgeMetadata: { source: "fundraising_planner" },
  });

  const issueTitle = input.relatedIssue?.trim();
  if (issueTitle) {
    const issueNode = findNodeByTypeAndTitle(
      input.existingNodes,
      "issue",
      issueTitle,
    );

    if (issueNode) {
      await createGraphEdge({
        campaignId: input.campaignId,
        sourceNodeId: prospectNodeResult.node.id,
        targetNodeId: issueNode.id,
        relationshipType: "aligns_with",
        metadata: { source: "fundraising_planner" },
      });
    }
  }

  return { synced: true as const, node: prospectNodeResult.node };
}
