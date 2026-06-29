"use client";

import * as React from "react";
import { PanelRight } from "lucide-react";
import { useChat } from "@/components/chat/chat-provider";
import { useWorkspaceShell } from "@/components/layout/workspace-shell";
import { WorkspaceTopBar } from "@/components/workspace/workspace-top-bar";
import { ChatDock } from "@/components/workspace/chat-dock";
import { WorkspaceGraphCanvas } from "@/components/workspace/workspace-graph-canvas";
import {
  WorkspaceContextPanel,
  type WorkspaceMetrics,
} from "@/components/workspace/workspace-context-panel";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import type { OnboardingData } from "@/actions/campaigns";
import type {
  CampaignGraphFlow,
  CampaignGraphNodeData,
} from "@/lib/graph/to-react-flow";
import { useDynamicCampaignGraph } from "@/lib/graph/dynamic-graph";
import { nodeIdsForFolders } from "@/lib/graph/folder-clusters";
import type {
  DbCampaign,
  DbCampaignProfile,
  DbGraphEdge,
  DbGraphNode,
} from "@/lib/db/schema";
import type { KnowledgeNode } from "@/lib/campaign-knowledge/types";

type WorkspaceHomeProps = {
  isSetupComplete: boolean;
  campaign: DbCampaign | null;
  profile: DbCampaignProfile | null;
  graph: CampaignGraphFlow | null;
  edgeCount: number;
  metrics: WorkspaceMetrics;
  onboardingData: OnboardingData | null;
  /**
   * Optional live-graph seed. When provided (e.g. the preview workspace), the
   * graph becomes a client-side {@link useDynamicCampaignGraph} that can grow
   * as knowledge is added — demonstrating the dynamic knowledge graph.
   */
  liveSeed?: { nodes: DbGraphNode[]; edges: DbGraphEdge[] } | null;
  /** Knowledge steps cycled through by the "Add knowledge" affordance. */
  growthSteps?: KnowledgeNode[];
};

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
 * Node ids for resolver-driven graph folder highlights from chat.
 */
function useResolverGraphNodeIds(
  graph: CampaignGraphFlow | null,
  graphFolders: import("@/lib/campaign-knowledge/types").CampaignFolderId[],
): string[] {
  return React.useMemo(() => {
    if (!graph || graphFolders.length === 0) return [];
    return [...nodeIdsForFolders(graph.nodes, graphFolders)];
  }, [graph, graphFolders]);
}

export function WorkspaceHome({
  isSetupComplete,
  campaign,
  profile,
  graph,
  edgeCount,
  metrics,
  onboardingData,
  liveSeed = null,
  growthSteps = [],
}: WorkspaceHomeProps) {
  const { isSending, activeThread, graphFoldersToHighlight } = useChat();
  const { toggleRailMobile } = useWorkspaceShell();
  const [selectedNode, setSelectedNode] =
    React.useState<CampaignGraphNodeData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(
    null,
  );
  const [panelOpen, setPanelOpen] = React.useState(true);
  const composerRef = React.useRef<HTMLTextAreaElement>(null);
  const growthStepRef = React.useRef(0);

  // Live (client-side, growable) graph. Seeded only in live mode; otherwise the
  // server-provided `graph` prop is the source of truth.
  const liveController = useDynamicCampaignGraph({
    campaignId: campaign?.id ?? "campaign",
    nodes: liveSeed?.nodes ?? [],
    edges: liveSeed?.edges ?? [],
  });
  const liveMode = liveSeed !== null;
  const activeGraph = liveMode ? liveController.graph : graph;
  const activeEdgeCount = liveMode
    ? liveController.graph.edges.length
    : edgeCount;

  // Hold the "thinking" pass on long enough to be visible even for fast replies.
  const thinkingActive = useMinimumActive(isSending, 1800);
  const topicNodeIds = useResolverGraphNodeIds(
    activeGraph,
    graphFoldersToHighlight,
  );
  const activationIds = useGraphActivityHighlights(
    activeGraph,
    thinkingActive,
    topicNodeIds,
  );

  // While thinking, ripple from the topic cluster; otherwise keep the matched
  // cluster gently lit so the user sees which part of the graph is relevant.
  const highlightedNodeIds = React.useMemo(() => {
    if (thinkingActive) return activationIds;
    return new Set(topicNodeIds);
  }, [thinkingActive, activationIds, topicNodeIds]);

  const handleAddKnowledge = React.useCallback(() => {
    if (growthSteps.length === 0) return;
    const step = growthSteps[growthStepRef.current % growthSteps.length];
    growthStepRef.current += 1;
    liveController.syncFromKnowledgeFile(step);
  }, [growthSteps, liveController]);

  const handleSelectNode = React.useCallback(
    (node: CampaignGraphNodeData | null, id: string | null) => {
      setSelectedNode(node);
      setSelectedNodeId(id);
      if (node) setPanelOpen(true);
    },
    [],
  );

  const focusComposer = React.useCallback(() => {
    composerRef.current?.focus();
  }, []);

  if (!isSetupComplete) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <WorkspaceTopBar
          onToggleRail={toggleRailMobile}
          onTogglePanel={() => setPanelOpen((v) => !v)}
          panelOpen={panelOpen}
          showPanelToggle={false}
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8 md:px-8">
          <div className="mx-auto max-w-2xl">
            <h1 className="text-lg font-semibold tracking-tight">
              Set up your campaign
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Answer a few questions and your campaign map starts building
              itself.
            </p>
            <div className="mt-6">
              {onboardingData ? (
                <OnboardingWizard initialData={onboardingData} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select or create a campaign organization from the rail to
                  begin setup.
                </p>
              )}
            </div>
          </div>
        </div>
        <ChatDock composerRef={composerRef} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      {/* Center: full-bleed knowledge graph with floating glass overlays */}
      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* The graph fills the entire center compartment and sits behind the
            floating top bar and composer — Cursor/Codex style. */}
        <div className="absolute inset-0 z-0">
          <WorkspaceGraphCanvas
            graph={activeGraph}
            edgeCount={activeEdgeCount}
            selectedNodeId={selectedNodeId}
            highlightedNodeIds={highlightedNodeIds}
            searching={thinkingActive}
            onSelectNode={handleSelectNode}
            onFocusComposer={focusComposer}
            onAddKnowledge={
              liveMode && growthSteps.length > 0
                ? handleAddKnowledge
                : undefined
            }
          />
        </div>

        {/* Floating frosted breadcrumb bar — graph shows faintly through it. */}
        <div className="pointer-events-none relative z-20 p-2.5">
          <WorkspaceTopBar
            onToggleRail={toggleRailMobile}
            onTogglePanel={() => setPanelOpen((v) => !v)}
            panelOpen={panelOpen}
            showPanelToggle
          />
        </div>

        {/* Floating glass composer docked at the bottom. The wrapper lets
            pointer events fall through to the graph everywhere except the
            card itself, which opts back in. */}
        <div className="pointer-events-none relative z-20 mt-auto">
          <ChatDock composerRef={composerRef} />
        </div>
      </section>

      {/* Right rail: preview + accessibility (collapsible) */}
      {panelOpen ? (
        <WorkspaceContextPanel
          campaign={campaign}
          profile={profile}
          metrics={metrics}
          graph={activeGraph}
          selectedNode={selectedNode}
          onClose={() => setPanelOpen(false)}
          onClearSelection={() => handleSelectNode(null, null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          aria-label="Open preview panel"
          className="hidden w-10 shrink-0 items-start justify-center border-l border-border pt-3 text-muted-foreground transition-colors hover:text-foreground md:flex"
        >
          <PanelRight className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
