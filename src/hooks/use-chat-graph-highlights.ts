"use client";

import * as React from "react";
import { useChat } from "@/components/chat/chat-provider";
import { nodeIdsForFolders } from "@/lib/graph/folder-clusters";
import { resolveRetrievalNodeIdsFromFlow } from "@/lib/graph/retrieval-highlights";
import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import type { CampaignGraphFlow } from "@/lib/graph/to-react-flow";

/**
 * Keeps a boolean "on" for at least `minMs` after it first turns on, so a fast
 * assistant reply still produces a visible "thinking" pass over the graph.
 */
function useMinimumActive(active: boolean, minMs: number): boolean {
  const [held, setHeld] = React.useState(false);
  const sinceRef = React.useRef(0);

  React.useEffect(() => {
    if (active) {
      sinceRef.current = Date.now();
      // Edge-triggered: turn the "thinking" pass on the moment activity starts.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHeld(true);
      return;
    }
    const elapsed = Date.now() - sinceRef.current;
    const remaining = Math.max(0, minMs - elapsed);
    const timeout = setTimeout(() => setHeld(false), remaining);
    return () => clearTimeout(timeout);
  }, [active, minMs]);

  return held;
}

/**
 * Outward-spreading activation while the assistant works — BFS from the topic
 * seed(s) so the graph visualizes the model searching campaign context.
 */
function useGraphActivityHighlights(
  graph: CampaignGraphFlow | null,
  active: boolean,
  seedIds?: string[],
): Set<string> {
  const [highlighted, setHighlighted] = React.useState<Set<string>>(
    () => new Set(),
  );

  const seedKey = (seedIds ?? []).join(",");

  const waves = React.useMemo<string[][]>(() => {
    if (!graph || graph.nodes.length === 0) return [];

    const adjacency = new Map<string, string[]>();
    for (const node of graph.nodes) adjacency.set(node.id, []);
    for (const edge of graph.edges) {
      adjacency.get(edge.source)?.push(edge.target);
      adjacency.get(edge.target)?.push(edge.source);
    }

    const nodeIds = new Set(graph.nodes.map((n) => n.id));
    const requestedSeeds = (seedIds ?? []).filter((id) => nodeIds.has(id));
    const seeds =
      requestedSeeds.length > 0
        ? requestedSeeds
        : [
            [...graph.nodes].sort(
              (a, b) => (b.data.degree ?? 0) - (a.data.degree ?? 0),
            )[0].id,
          ];

    const visited = new Set<string>(seeds);
    const layers: string[][] = [[...seeds]];
    let frontier = [...seeds];
    while (frontier.length > 0) {
      const next: string[] = [];
      for (const id of frontier) {
        for (const neighbor of adjacency.get(id) ?? []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            next.push(neighbor);
          }
        }
      }
      if (next.length > 0) layers.push(next);
      frontier = next;
    }

    const stragglers = graph.nodes
      .map((n) => n.id)
      .filter((id) => !visited.has(id));
    if (stragglers.length > 0) layers.push(stragglers);

    return layers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, seedKey]);

  React.useEffect(() => {
    if (!active || waves.length === 0) {
      if (highlighted.size === 0) return;
      const timeout = setTimeout(() => setHighlighted(new Set()), 320);
      return () => clearTimeout(timeout);
    }

    let wave = 0;
    const tick = () => {
      const picks = new Set<string>();
      for (const id of waves[wave % waves.length] ?? []) picks.add(id);
      const trailing = waves[(wave - 1 + waves.length) % waves.length] ?? [];
      for (const id of trailing) picks.add(id);
      setHighlighted(picks);
      wave += 1;
    };

    tick();
    const interval = setInterval(tick, 520);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, waves]);

  return highlighted;
}

function useResolverGraphSeeds(
  graph: CampaignGraphFlow | null,
  graphFolders: CampaignFolderId[],
  graphNodeIds: string[],
  contextPaths: string[],
): string[] {
  return React.useMemo(() => {
    if (!graph) return [];

    const nodeIdSet = new Set(graph.nodes.map((node) => node.id));
    const serverIds = graphNodeIds.filter((id) => nodeIdSet.has(id));
    if (serverIds.length > 0) return serverIds;

    const retrievalIds = resolveRetrievalNodeIdsFromFlow(graph.nodes, {
      contextPaths,
      graphFolders,
    });
    if (retrievalIds.length > 0) return retrievalIds;

    return [...nodeIdsForFolders(graph.nodes, graphFolders)];
  }, [graph, graphFolders, graphNodeIds, contextPaths]);
}

/**
 * Shared "agent thought" layer for any campaign graph canvas: ripple while the
 * assistant works, then keep the matched cluster gently lit.
 */
export function useChatGraphHighlights(graph: CampaignGraphFlow | null): {
  highlightedNodeIds: Set<string>;
  searching: boolean;
} {
  const {
    isSending,
    graphFoldersToHighlight,
    graphNodeIdsToHighlight,
    harnessContextPaths,
  } = useChat();

  const searching = useMinimumActive(isSending, 1800);
  const topicNodeIds = useResolverGraphSeeds(
    graph,
    graphFoldersToHighlight,
    graphNodeIdsToHighlight,
    harnessContextPaths,
  );
  const activationIds = useGraphActivityHighlights(
    graph,
    searching,
    topicNodeIds,
  );

  const highlightedNodeIds = React.useMemo(() => {
    if (searching) return activationIds;
    return new Set(topicNodeIds);
  }, [searching, activationIds, topicNodeIds]);

  return { highlightedNodeIds, searching };
}
