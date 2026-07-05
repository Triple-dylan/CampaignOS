import type { CampaignGraphNodeData } from "@/lib/graph/to-react-flow";

/**
 * Simple CampaignOS graph search dialect (Obsidian-inspired):
 * - `folder:messaging` — match folder slug
 * - `type:donor` or `node_type:issue` — match node type
 * - plain text — title, summary, knowledge path
 */
export function nodeMatchesGraphSearch(
  node: CampaignGraphNodeData,
  rawQuery: string,
): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  const tokens = query.split(/\s+/).filter(Boolean);
  return tokens.every((token) => tokenMatches(node, token));
}

function tokenMatches(node: CampaignGraphNodeData, token: string): boolean {
  if (token.startsWith("folder:")) {
    const folder = token.slice("folder:".length);
    return (node.folder ?? "").toLowerCase().includes(folder);
  }
  if (token.startsWith("type:") || token.startsWith("node_type:")) {
    const prefix = token.startsWith("type:") ? "type:" : "node_type:";
    const type = token.slice(prefix.length);
    return node.nodeType.toLowerCase().includes(type);
  }
  const haystack = [
    node.title,
    node.summary,
    node.knowledgePath,
    node.folder,
    node.nodeType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(token);
}

/** Returns node ids that match the search query (empty query → all match). */
export function graphSearchMatchIds(
  nodes: Array<{ id: string; data: CampaignGraphNodeData }>,
  query: string,
): Set<string> {
  const trimmed = query.trim();
  if (!trimmed) {
    return new Set(nodes.map((n) => n.id));
  }
  return new Set(
    nodes.filter((n) => nodeMatchesGraphSearch(n.data, trimmed)).map((n) => n.id),
  );
}
