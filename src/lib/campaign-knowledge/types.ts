import type { GraphNodeType, GraphRelationshipType } from "@/lib/validators/enums";

/** Stable identifier for a standard campaign knowledge folder. */
export type CampaignFolderId =
  | "campaign"
  | "skills"
  | "assets"
  | "initiatives"
  | "events"
  | "fundraising"
  | "accounting"
  | "social-media"
  | "people"
  | "team"
  | "research"
  | "compliance"
  | "messaging"
  | "field"
  | "communications"
  | "vendors"
  | "media"
  | "polling"
  | "endorsements"
  | "ballot-access";

/** Runtime folder definition (aligned with DB entities and graph node types). */
export type CampaignFolder = {
  id: CampaignFolderId;
  /** URL-safe directory name under the campaign knowledge root. */
  slug: string;
  label: string;
  description: string;
  /** Primary graph node types produced by documents in this folder. */
  graphNodeTypes: GraphNodeType[];
  /** DB `source_object_type` values linked from this folder. */
  sourceObjectTypes: string[];
  /** When true, the folder itself maps to a cluster node in the knowledge graph. */
  isCluster: boolean;
};

/**
 * Knowledge-layer node before or during sync to `graph_nodes`.
 * - `document`: one markdown file with extractable frontmatter
 * - `cluster`: a standard folder hub (virtual grouping)
 * - `meta`: index, log, README, or _context (not synced as graph nodes)
 */
export type KnowledgeNodeKind = "document" | "cluster" | "meta";

export type KnowledgeNode = {
  kind: KnowledgeNodeKind;
  /** Relative path from the campaign knowledge root (e.g. `fundraising/q2-call-time.md`). */
  path: string;
  folder: CampaignFolderId;
  title: string;
  summary?: string;
  nodeType?: GraphNodeType;
  sourceObjectType?: string;
  sourceObjectId?: string;
  relationships?: KnowledgeRelationship[];
  metadata?: Record<string, unknown>;
};

export type KnowledgeRelationship = {
  targetPath: string;
  type: GraphRelationshipType;
  confidence?: number;
};

/** YAML frontmatter on wiki-llm knowledge pages. */
export type KnowledgeFrontmatter = {
  title: string;
  type?: string;
  node_type?: GraphNodeType;
  summary?: string;
  tags?: string[];
  folder?: CampaignFolderId;
  source_object_type?: string;
  source_object_id?: string;
  status?: "draft" | "reviewed" | "verified" | "stale" | "archived";
  created?: string;
  updated?: string;
  /** Wikilink-style related paths for graph edge extraction. */
  related?: Array<{
    path: string;
    relationship?: GraphRelationshipType;
  }>;
};

/** Resolved location for a campaign's knowledge base on disk or in object storage. */
export type CampaignKnowledgeRoot = {
  organizationId: string;
  campaignId: string;
  /** Absolute or storage-relative root, e.g. `campaign-knowledge/{orgId}/{campaignId}`. */
  rootPath: string;
};
