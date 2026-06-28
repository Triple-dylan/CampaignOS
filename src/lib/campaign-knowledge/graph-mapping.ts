import {
  CAMPAIGN_FOLDER_IDS,
  getCampaignFolder,
  getCampaignFolderBySlug,
} from "@/lib/campaign-knowledge/folders";
import { isKnowledgeMetaFile } from "@/lib/campaign-knowledge/paths";
import type {
  CampaignFolderId,
  KnowledgeFrontmatter,
  KnowledgeNode,
  KnowledgeNodeKind,
} from "@/lib/campaign-knowledge/types";
import type { GraphNodeType } from "@/lib/validators/enums";

/**
 * Graph extraction rules (knowledge layer → CampaignOS brain graph):
 *
 * 1. Standard folder → cluster node (`kind: "cluster"`). One hub per folder;
 *    document nodes link via `belongs_to` when synced to `graph_edges`.
 * 2. Markdown file with `node_type` frontmatter → document node (`kind: "document"`),
 *    1:1 with a future `graph_nodes` row when `source_object_id` is set or inferred.
 * 3. Meta files (README, _context, index, log) → `kind: "meta"` — not synced as nodes.
 * 4. Subfolders inherit the parent folder cluster; nested files remain 1:1 documents.
 */

export function knowledgeNodeKindForFile(filename: string): KnowledgeNodeKind {
  if (isKnowledgeMetaFile(filename)) {
    return "meta";
  }
  return "document";
}

export function folderClusterNode(folderId: CampaignFolderId): KnowledgeNode {
  const folder = getCampaignFolder(folderId);
  return {
    kind: "cluster",
    path: `${folder.slug}/`,
    folder: folderId,
    title: folder.label,
    summary: folder.description,
    nodeType: folder.graphNodeTypes[0],
    metadata: {
      cluster: true,
      graphNodeTypes: folder.graphNodeTypes,
      sourceObjectTypes: folder.sourceObjectTypes,
    },
  };
}

export function documentNodeFromFrontmatter(
  relativePath: string,
  frontmatter: KnowledgeFrontmatter,
): KnowledgeNode | null {
  const filename = relativePath.split("/").pop() ?? relativePath;
  const kind = knowledgeNodeKindForFile(filename);
  if (kind === "meta") {
    return null;
  }

  const folder = parseFolderFromPath(relativePath, frontmatter.folder);
  const nodeType =
    frontmatter.node_type ?? inferNodeTypeFromFolder(folder);

  return {
    kind: "document",
    path: relativePath,
    folder,
    title: frontmatter.title,
    summary: frontmatter.summary,
    nodeType,
    sourceObjectType: frontmatter.source_object_type,
    sourceObjectId: frontmatter.source_object_id,
    relationships: frontmatter.related?.map((entry) => ({
      targetPath: entry.path,
      type: entry.relationship ?? "connected_to",
    })),
    metadata: {
      type: frontmatter.type,
      tags: frontmatter.tags,
      status: frontmatter.status,
    },
  };
}

function parseFolderFromPath(
  relativePath: string,
  explicitFolder?: CampaignFolderId,
): CampaignFolderId {
  if (explicitFolder) {
    return explicitFolder;
  }
  const topSegment = relativePath.split("/")[0];
  const folder = getCampaignFolderBySlugSafe(topSegment);
  return folder ?? "campaign";
}

function getCampaignFolderBySlugSafe(slug: string): CampaignFolderId | null {
  return getCampaignFolderBySlug(slug)?.id ?? null;
}

function inferNodeTypeFromFolder(folderId: CampaignFolderId): GraphNodeType {
  return getCampaignFolder(folderId).graphNodeTypes[0] ?? "strategic_priority";
}

export function allFolderClusterNodes(): KnowledgeNode[] {
  return CAMPAIGN_FOLDER_IDS.map(folderClusterNode);
}
