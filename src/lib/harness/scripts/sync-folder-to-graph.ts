import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  CAMPAIGN_KNOWLEDGE_TEMPLATE_ROOT,
  isKnowledgeMetaFile,
} from "@/lib/campaign-knowledge/paths";
import {
  documentNodeFromFrontmatter,
  folderClusterNode,
} from "@/lib/campaign-knowledge/graph-mapping";
import { getCampaignFolderBySlug } from "@/lib/campaign-knowledge/folders";
import type {
  CampaignFolderId,
  KnowledgeFrontmatter,
  KnowledgeNode,
} from "@/lib/campaign-knowledge/types";

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
    folder: result.folder as CampaignFolderId | undefined,
    source_object_type: result.source_object_type,
    source_object_id: result.source_object_id,
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

export type SyncFolderToGraphInput = {
  /** Relative folder slug under campaign-knowledge templates, e.g. `research`. */
  folderSlug: string;
  /** Optional campaign knowledge root override (defaults to shipped templates). */
  knowledgeRoot?: string;
};

export type SyncFolderToGraphOutput = {
  folderSlug: string;
  folderId: CampaignFolderId | null;
  nodes: KnowledgeNode[];
  clusterNode: KnowledgeNode | null;
  documentCount: number;
  metaCount: number;
};

/**
 * Given a campaign knowledge folder, emit KnowledgeNodes for the graph.
 * Gbrain pattern: deterministic folder → cluster + document extraction.
 */
export async function syncFolderToGraph(
  input: SyncFolderToGraphInput,
): Promise<SyncFolderToGraphOutput> {
  const root = path.join(
    process.cwd(),
    input.knowledgeRoot ?? CAMPAIGN_KNOWLEDGE_TEMPLATE_ROOT,
  );
  const folderPath = path.join(root, input.folderSlug);
  const folderDef = getCampaignFolderBySlug(input.folderSlug);

  const nodes: KnowledgeNode[] = [];
  let clusterNode: KnowledgeNode | null = null;

  if (folderDef) {
    clusterNode = folderClusterNode(folderDef.id);
    nodes.push(clusterNode);
  }

  let documentCount = 0;
  let metaCount = 0;

  try {
    const markdownFiles = await walkMarkdownFiles(folderPath);
    for (const filePath of markdownFiles) {
      const relativePath = path
        .relative(root, filePath)
        .split(path.sep)
        .join("/");
      const filename = path.basename(filePath);

      if (isKnowledgeMetaFile(filename)) {
        metaCount += 1;
        continue;
      }

      const raw = await readFile(filePath, "utf8");
      const match = raw.match(FRONTMATTER_RE);
      if (!match) continue;

      const frontmatter = parseSimpleFrontmatter(match[1]);
      const docNode = documentNodeFromFrontmatter(relativePath, frontmatter);
      if (docNode) {
        nodes.push(docNode);
        documentCount += 1;
      }
    }
  } catch {
    // Folder may not exist yet for new campaigns — return cluster only.
  }

  return {
    folderSlug: input.folderSlug,
    folderId: folderDef?.id ?? null,
    nodes,
    clusterNode,
    documentCount,
    metaCount,
  };
}
