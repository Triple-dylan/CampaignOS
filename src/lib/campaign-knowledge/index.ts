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

export {
  bootstrapCampaignKnowledge,
  type BootstrapCampaignKnowledgeInput,
} from "@/lib/campaign-knowledge/bootstrap";
export { ensureCampaignKnowledgeBootstrapped } from "@/lib/campaign-knowledge/ensure";
export { campaignKnowledgeExists } from "@/lib/campaign-knowledge/exists";
export {
  appendKnowledgeLog,
  buildAssetKnowledgePage,
  buildContentCalendarKnowledgePage,
  buildResearchBriefKnowledgePage,
  writeKnowledgePage,
} from "@/lib/campaign-knowledge/write";
export {
  readCampaignKnowledgeContext,
  readCampaignKnowledgeIndex,
} from "@/lib/campaign-knowledge/read";
export { syncCampaignKnowledgeToGraph } from "@/lib/campaign-knowledge/sync-to-graph";
export { syncKnowledgeAfterWrite } from "@/lib/campaign-knowledge/sync-after-write";
export { slugifyKnowledgeTitle } from "@/lib/campaign-knowledge/slug";
