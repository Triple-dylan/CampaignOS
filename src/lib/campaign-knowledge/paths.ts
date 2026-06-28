import {
  CAMPAIGN_FOLDERS,
  getCampaignFolderBySlug,
} from "@/lib/campaign-knowledge/folders";
import type {
  CampaignFolderId,
  CampaignKnowledgeRoot,
} from "@/lib/campaign-knowledge/types";

/** Default relative segment for campaign knowledge storage (one campaign per org). */
export const CAMPAIGN_KNOWLEDGE_SEGMENT = "campaign-knowledge";

/** Filenames treated as navigation/meta — excluded from document graph extraction. */
export const KNOWLEDGE_META_FILENAMES = new Set([
  "README.md",
  "_index.md",
  "_context.md",
  "index.md",
  "log.md",
  "TEMPLATE.md",
  "AGENTS.md",
]);

export function buildCampaignKnowledgeRoot(input: {
  organizationId: string;
  campaignId: string;
  basePath?: string;
}): CampaignKnowledgeRoot {
  const base = input.basePath ?? CAMPAIGN_KNOWLEDGE_SEGMENT;
  return {
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    rootPath: `${base}/${input.organizationId}/${input.campaignId}`,
  };
}

export function resolveKnowledgePath(
  root: CampaignKnowledgeRoot,
  ...segments: string[]
): string {
  const normalized = segments
    .flatMap((segment) => segment.split("/"))
    .filter((segment) => segment.length > 0 && segment !== ".");
  return [root.rootPath, ...normalized].join("/");
}

export function resolveFolderPath(
  root: CampaignKnowledgeRoot,
  folderId: CampaignFolderId,
): string {
  return resolveKnowledgePath(root, folderId);
}

export function parseKnowledgeRelativePath(relativePath: string): {
  folder: CampaignFolderId | null;
  remainder: string;
} {
  const trimmed = relativePath.replace(/^\/+/, "");
  const [first, ...rest] = trimmed.split("/");
  const folder = getCampaignFolderBySlug(first);
  if (!folder) {
    return { folder: null, remainder: trimmed };
  }
  return {
    folder: folder.id,
    remainder: rest.join("/"),
  };
}

export function isKnowledgeMetaFile(filename: string): boolean {
  return KNOWLEDGE_META_FILENAMES.has(filename);
}

export function listStandardFolderSlugs(): string[] {
  return CAMPAIGN_FOLDERS.map((folder) => folder.slug);
}

/** Path to the shipped empty template tree (for bootstrapping new campaigns). */
export const CAMPAIGN_KNOWLEDGE_TEMPLATE_ROOT =
  "src/lib/campaign-knowledge/templates";
