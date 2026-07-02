import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { documentNodeFromFrontmatter } from "@/lib/campaign-knowledge/graph-mapping";
import { isKnowledgeMetaFile } from "@/lib/campaign-knowledge/paths";
import type {
  CampaignKnowledgeRoot,
  KnowledgeFrontmatter,
  KnowledgeNode,
} from "@/lib/campaign-knowledge/types";
import {
  createGraphEdge,
  createGraphNode,
  getGraphNodeBySourceObject,
} from "@/lib/db/graph";
import type { GraphRelationshipType } from "@/lib/validators/enums";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

function parseSimpleFrontmatter(block: string): KnowledgeFrontmatter {
  const result: Record<string, string> = {};
  for (const line of block.split("\n")) {
    const match = line.match(/^([\w_]+):\s*(.*)$/);
    if (!match) continue;
    result[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return {
    title: result.title ?? "Untitled",
    type: result.type,
    node_type: result.node_type as KnowledgeFrontmatter["node_type"],
    summary: result.summary,
    folder: result.folder as KnowledgeFrontmatter["folder"],
    source_object_type: result.source_object_type,
    source_object_id: result.source_object_id,
    status: result.status as KnowledgeFrontmatter["status"],
  };
}

async function walkMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkMarkdownFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function walkCampaignKnowledgeNodes(
  root: CampaignKnowledgeRoot,
): Promise<KnowledgeNode[]> {
  const absoluteRoot = path.join(process.cwd(), root.rootPath);
  const nodes: KnowledgeNode[] = [];

  try {
    const markdownFiles = await walkMarkdownFiles(absoluteRoot);
    for (const filePath of markdownFiles) {
      const relativePath = path
        .relative(absoluteRoot, filePath)
        .split(path.sep)
        .join("/");
      const filename = path.basename(filePath);
      if (isKnowledgeMetaFile(filename)) continue;

      const raw = await readFile(filePath, "utf8");
      const match = raw.match(FRONTMATTER_RE);
      if (!match) continue;

      const frontmatter = parseSimpleFrontmatter(match[1]);
      const docNode = documentNodeFromFrontmatter(relativePath, frontmatter);
      if (docNode) {
        nodes.push(docNode);
      }
    }
  } catch {
    return nodes;
  }

  return nodes;
}

export async function syncCampaignKnowledgeToGraph(input: {
  campaignId: string;
  root: CampaignKnowledgeRoot;
}): Promise<{ synced: number; skipped: number }> {
  const nodes = await walkCampaignKnowledgeNodes(input.root);
  let synced = 0;
  let skipped = 0;

  const pathToNodeId = new Map<string, string>();

  for (const node of nodes) {
    if (node.kind !== "document" || !node.nodeType) {
      skipped += 1;
      continue;
    }

    if (node.sourceObjectType && node.sourceObjectId) {
      const existing = await getGraphNodeBySourceObject({
        campaignId: input.campaignId,
        sourceObjectType: node.sourceObjectType,
        sourceObjectId: node.sourceObjectId,
      });
      if (existing) {
        skipped += 1;
        pathToNodeId.set(node.path, existing.id);
        continue;
      }
    }

    const result = await createGraphNode({
      campaignId: input.campaignId,
      nodeType: node.nodeType,
      title: node.title,
      summary: node.summary,
      sourceObjectType: node.sourceObjectType,
      sourceObjectId: node.sourceObjectId,
      metadata: {
        source: "wiki_sync",
        folder: node.folder,
        path: node.path,
        knowledgeKind: "document",
        ...node.metadata,
      },
    });

    if (result.node) {
      synced += 1;
      pathToNodeId.set(node.path, result.node.id);
    }
  }

  for (const node of nodes) {
    if (!node.relationships?.length) continue;
    const sourceId = pathToNodeId.get(node.path);
    if (!sourceId) continue;

    for (const rel of node.relationships) {
      const targetId = pathToNodeId.get(rel.targetPath);
      if (!targetId) continue;

      await createGraphEdge({
        campaignId: input.campaignId,
        sourceNodeId: sourceId,
        targetNodeId: targetId,
        relationshipType: rel.type as GraphRelationshipType,
        metadata: { source: "wiki_sync" },
      });
    }
  }

  return { synced, skipped };
}
