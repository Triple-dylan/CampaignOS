import { getCampaignFolder } from "@/lib/campaign-knowledge/folders";
import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import type {
  DbCampaign,
  DbCampaignProfile,
  DbGraphEdge,
  DbGraphNode,
} from "@/lib/db/schema";
import { campaignDisplayName } from "@/lib/db/schema";
import {
  syntheticHubId,
} from "@/lib/graph/inject-folder-hubs";
import { folderForNode, CENTER_FOLDER } from "@/lib/graph/folder-clusters";
import { HARNESS_SKILL_PLAYBOOKS } from "@/lib/harness/skills/registry";

/**
 * Render-time wiki page synthesis for authenticated campaigns.
 *
 * Production `graph_nodes` rows are often bare entities without
 * `metadata_json.path`. This module assigns wiki-llm page paths (titles as
 * page names under the correct folder), enriches the candidate profile page,
 * and adds harness skill playbook nodes under `skills/` — complementing
 * `injectFolderHubs` without a DB migration.
 */

const SYNTHETIC_WIKI_PREFIX = "synthetic-wiki:";
const SYNTHETIC_EDGE_PREFIX = "synthetic-wiki-edge:";
const EPOCH = new Date(0).toISOString();

export function syntheticWikiSkillId(skillId: string): string {
  return `${SYNTHETIC_WIKI_PREFIX}skill:${skillId}`;
}

function slugFromTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "page";
}

function enrichNodeWithWikiPath(node: DbGraphNode): DbGraphNode {
  if (node.metadata_json?.cluster === true) return node;
  if (typeof node.metadata_json?.path === "string") {
    const folder =
      (node.metadata_json.folder as CampaignFolderId | undefined) ??
      folderForNode({ nodeType: node.node_type, metadata: node.metadata_json });
    return {
      ...node,
      metadata_json: {
        ...node.metadata_json,
        folder,
        knowledgeKind:
          node.metadata_json.knowledgeKind ??
          (node.source_object_id ? "entity" : "document"),
      },
    };
  }

  const folder = folderForNode({
    nodeType: node.node_type,
    metadata: node.metadata_json,
  });
  const folderDef = getCampaignFolder(folder);

  if (folder === CENTER_FOLDER && node.node_type === "candidate") {
    return {
      ...node,
      metadata_json: {
        ...node.metadata_json,
        folder: "campaign",
        path: "campaign/profile.md",
        knowledgeKind: "document",
        synthetic: true,
      },
    };
  }

  const slug = slugFromTitle(node.title);
  return {
    ...node,
    metadata_json: {
      ...node.metadata_json,
      folder,
      path: `${folderDef.slug}/${slug}.md`,
      knowledgeKind: node.source_object_id ? "entity" : "document",
      synthetic: true,
    },
  };
}

function enrichCandidateFromProfile(
  nodes: DbGraphNode[],
  campaign: DbCampaign | null | undefined,
  profile: DbCampaignProfile | null | undefined,
): DbGraphNode[] {
  if (!campaign) return nodes;

  const displayName = campaignDisplayName(campaign);
  const issues = profile?.top_issues?.slice(0, 3).join(", ");

  return nodes.map((node) => {
    if (node.node_type !== "candidate") return node;
    const office = campaign.office_sought;
    const jurisdiction = campaign.jurisdiction ?? campaign.state;
    const summaryParts = [
      office ? `Candidate for ${office}` : null,
      jurisdiction ? `in ${jurisdiction}` : null,
      issues ? `Top issues: ${issues}` : null,
    ].filter(Boolean);

    return {
      ...node,
      title: displayName || node.title,
      summary: summaryParts.join(" · ") || node.summary,
      metadata_json: {
        ...node.metadata_json,
        folder: "campaign",
        path: "campaign/profile.md",
        knowledgeKind: "document",
        synthetic: node.metadata_json?.synthetic ?? true,
      },
    };
  });
}

function synthesizeSkillNodes(
  campaignId: string,
  existingTitles: Set<string>,
): DbGraphNode[] {
  return HARNESS_SKILL_PLAYBOOKS.filter(
    (skill) => !existingTitles.has(skill.title.toLowerCase()),
  ).map((skill) => ({
    id: syntheticWikiSkillId(skill.id),
    campaign_id: campaignId,
    node_type: "task" as const,
    title: skill.title,
    summary: skill.summary,
    source_object_type: null,
    source_object_id: null,
    metadata_json: {
      folder: "skills" as CampaignFolderId,
      path: `skills/${skill.id}/SKILL.md`,
      knowledgeKind: "document",
      synthetic: true,
    },
    embedding: null,
    created_at: EPOCH,
    updated_at: EPOCH,
  }));
}

function findSkillsHubId(nodes: DbGraphNode[]): string | null {
  for (const node of nodes) {
    if (node.metadata_json?.cluster !== true) continue;
    const folder = folderForNode({
      nodeType: node.node_type,
      metadata: node.metadata_json,
    });
    if (folder === "skills") return node.id;
  }
  return null;
}

export function injectWikiPages(input: {
  nodes: DbGraphNode[];
  edges: DbGraphEdge[];
  campaignId: string;
  campaign?: DbCampaign | null;
  profile?: DbCampaignProfile | null;
}): { nodes: DbGraphNode[]; edges: DbGraphEdge[] } {
  const { campaignId, campaign, profile } = input;

  let nodes = enrichCandidateFromProfile(input.nodes, campaign, profile);
  nodes = nodes.map(enrichNodeWithWikiPath);

  const existingTitles = new Set(
    nodes.map((node) => node.title.toLowerCase()),
  );
  const skillNodes = synthesizeSkillNodes(campaignId, existingTitles);

  const belongsTo = new Map<string, Set<string>>();
  for (const edge of input.edges) {
    if (edge.relationship_type !== "belongs_to") continue;
    const set = belongsTo.get(edge.source_node_id) ?? new Set<string>();
    set.add(edge.target_node_id);
    belongsTo.set(edge.source_node_id, set);
  }

  const newEdges: DbGraphEdge[] = [...input.edges];
  let edgeCounter = input.edges.filter((edge) =>
    edge.id.startsWith(SYNTHETIC_EDGE_PREFIX),
  ).length;

  const addBelongsTo = (source: string, target: string) => {
    if (source === target) return;
    if (belongsTo.get(source)?.has(target)) return;
    edgeCounter += 1;
    newEdges.push({
      id: `${SYNTHETIC_EDGE_PREFIX}${edgeCounter}`,
      campaign_id: campaignId,
      source_node_id: source,
      target_node_id: target,
      relationship_type: "belongs_to",
      confidence: 1,
      metadata_json: { synthetic: true },
      created_at: EPOCH,
    });
    const set = belongsTo.get(source) ?? new Set<string>();
    set.add(target);
    belongsTo.set(source, set);
  };

  const skillsHubId = findSkillsHubId(nodes) ?? syntheticHubId("skills");
  const candidate = nodes.find((node) => node.node_type === "candidate");

  for (const skillNode of skillNodes) {
    addBelongsTo(skillNode.id, skillsHubId);
  }

  if (candidate && !findSkillsHubId(nodes)) {
    addBelongsTo(skillsHubId, candidate.id);
  }

  return {
    nodes: [...skillNodes, ...nodes],
    edges: newEdges,
  };
}
