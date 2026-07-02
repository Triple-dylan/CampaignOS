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
    // Activity ended — keep the pass visible until at least minMs has elapsed.
    const elapsed = Date.now() - sinceRef.current;
    const remaining = Math.max(0, minMs - elapsed);
    const timeout = setTimeout(() => setHeld(false), remaining);
    return () => clearTimeout(timeout);
  }, [active, minMs]);

  return held;
}

/**
 * Builds an outward-spreading set of highlighted node ids while the assistant
 * is working — a simulated "spreading activation" that starts at the most
 * connected node and ripples across the graph along its edges, visualizing the
 * model searching and connecting campaign context.
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

  // Order nodes by BFS distance from the seed node(s), following edges. The
  // seeds default to the most-connected node, but a chat topic can re-seed the
  // ripple at the relevant cluster so activation visibly starts there.
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

    // Catch any disconnected nodes so they still participate.
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
      // Current wave plus a trailing wave, so activation visibly ripples out.
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

/**
 * Node ids for resolver-driven graph highlights from chat.
 * Prefers specific retrieval node ids over whole-folder BFS seeds.
 */
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
 * The "agent thought" layer of any campaign graph canvas: while the assistant
 * works, activation ripples outward from the chat topic's cluster; once it
 * answers, the matched cluster stays gently lit. Shared by the dashboard work
 * desk and the full knowledge-graph page so agent thinking looks identical
 * everywhere the graph appears.
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

  // Hold the "thinking" pass on long enough to be visible even for fast replies.
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

  // While thinking, ripple from the topic cluster; otherwise keep the matched
  // cluster gently lit so the user sees which part of the graph is relevant.
  const highlightedNodeIds = React.useMemo(() => {
    if (searching) return activationIds;
    return new Set(topicNodeIds);
  }, [searching, activationIds, topicNodeIds]);

  return { highlightedNodeIds, searching };
}
