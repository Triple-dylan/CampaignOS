"use client";

import * as React from "react";
import { PanelRight } from "lucide-react";
import { useWorkspaceShell } from "@/components/layout/workspace-shell";
import { WorkspaceTopBar } from "@/components/workspace/workspace-top-bar";
import { ChatDock } from "@/components/workspace/chat-dock";
import { WorkspaceGraphCanvasLazy as WorkspaceGraphCanvas } from "@/components/workspace/workspace-graph-canvas.lazy";
import {
  WorkspaceContextPanel,
  type WorkspaceMetrics,
} from "@/components/workspace/workspace-context-panel";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { MobileContextSheet } from "@/components/layout/mobile-context-sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import type { OnboardingData } from "@/actions/campaigns";
import type {
  CampaignGraphFlow,
  CampaignGraphNodeData,
} from "@/lib/graph/to-react-flow";
import { useDynamicCampaignGraph } from "@/lib/graph/dynamic-graph";
import { useChatGraphHighlights } from "@/hooks/use-chat-graph-highlights";
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
  const { toggleRailMobile } = useWorkspaceShell();
  const [selectedNode, setSelectedNode] =
    React.useState<CampaignGraphNodeData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(
    null,
  );
  const [panelOpen, setPanelOpen] = React.useState(false);
  const isMobile = useIsMobile();

  // Open the preview panel by default on desktop so campaign context (and the
  // node-click → file preview affordance) is present from the first paint.
  // Runs once on mount; mobile keeps the sheet closed until asked for.
  React.useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPanelOpen(true);
    }
  }, []);
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

  // Shared "agent thought" layer: ripple while the assistant works, then keep
  // the matched cluster gently lit (same treatment as the /brain page).
  const { highlightedNodeIds, searching: thinkingActive } =
    useChatGraphHighlights(activeGraph);

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

  const handleSelectNodeId = React.useCallback(
    (id: string) => {
      const node = activeGraph?.nodes.find((n) => n.id === id);
      if (node) handleSelectNode(node.data, id);
    },
    [activeGraph, handleSelectNode],
  );

  const contextPanelProps = {
    campaign,
    profile,
    metrics,
    graph: activeGraph,
    selectedNode,
    onClose: () => setPanelOpen(false),
    onClearSelection: () => handleSelectNode(null, null),
    onSelectNodeId: handleSelectNodeId,
  };

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
      {panelOpen && !isMobile ? (
        <WorkspaceContextPanel {...contextPanelProps} />
      ) : !panelOpen && !isMobile ? (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          aria-label="Open preview panel"
          className="hidden w-10 shrink-0 items-start justify-center border-l border-border pt-3 text-muted-foreground transition-colors hover:text-foreground md:flex"
        >
          <PanelRight className="size-4" aria-hidden />
        </button>
      ) : null}

      <MobileContextSheet
        open={panelOpen && isMobile}
        onOpenChange={setPanelOpen}
        {...contextPanelProps}
      />
    </div>
  );
}
