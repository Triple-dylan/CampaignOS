export type {
  CampaignFolder,
  CampaignFolderId,
  CampaignKnowledgeRoot,
  KnowledgeFrontmatter,
  KnowledgeNode,
  KnowledgeNodeKind,
  KnowledgeRelationship,
} from "@/lib/campaign-knowledge/types";

export {
  CAMPAIGN_FOLDERS,
  CAMPAIGN_FOLDER_IDS,
  getCampaignFolder,
  getCampaignFolderBySlug,
} from "@/lib/campaign-knowledge/folders";

export {
  CAMPAIGN_KNOWLEDGE_SEGMENT,
  CAMPAIGN_KNOWLEDGE_TEMPLATE_ROOT,
  KNOWLEDGE_META_FILENAMES,
  buildCampaignKnowledgeRoot,
  isKnowledgeMetaFile,
  listStandardFolderSlugs,
  parseKnowledgeRelativePath,
  resolveFolderPath,
  resolveKnowledgePath,
} from "@/lib/campaign-knowledge/paths";

export {
  allFolderClusterNodes,
  documentNodeFromFrontmatter,
  folderClusterNode,
  knowledgeNodeKindForFile,
} from "@/lib/campaign-knowledge/graph-mapping";
