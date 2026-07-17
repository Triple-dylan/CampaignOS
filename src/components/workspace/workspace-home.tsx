"use client";

import * as React from "react";
import { useChat } from "@/components/chat/chat-provider";
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
import { useCampaignGraphPreferences } from "@/hooks/use-campaign-graph-preferences";
import { useChatGraphHighlights } from "@/hooks/use-chat-graph-highlights";
import { applyCenterDisplayToGraph } from "@/lib/graph/apply-center-display";
import type {
  DbCampaign,
  DbCampaignProfile,
  DbGraphEdge,
  DbGraphNode,
} from "@/lib/db/schema";
import type { WorkspaceDigest } from "@/lib/workspace/digest";
import { useOptionalCampaignFocus } from "@/components/focus/focus-provider";
import { useGraphPresenceByObject } from "@/components/presence/use-graph-presence";

type WorkspaceHomeProps = {
  isSetupComplete: boolean;
  campaign: DbCampaign | null;
  profile: DbCampaignProfile | null;
  graph: CampaignGraphFlow | null;
  edgeCount: number;
  metrics: WorkspaceMetrics;
  /** Actionable digest for the right rail's default view. */
  digest?: WorkspaceDigest | null;
  onboardingData: OnboardingData | null;
  /**
   * Optional live-graph seed. When provided (e.g. the preview workspace), the
   * graph becomes a client-side {@link useDynamicCampaignGraph} that can grow
   * as knowledge is added — demonstrating the dynamic knowledge graph.
   */
  liveSeed?: { nodes: DbGraphNode[]; edges: DbGraphEdge[] } | null;
};

export function WorkspaceHome({
  isSetupComplete,
  campaign,
  profile,
  graph,
  edgeCount,
  metrics,
  digest = null,
  onboardingData,
  liveSeed = null,
}: WorkspaceHomeProps) {
  const { activeThread } = useChat();
  const { toggleRailMobile } = useWorkspaceShell();
  const [selectedNode, setSelectedNode] =
    React.useState<CampaignGraphNodeData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(
    null,
  );
  const [panelOpen, setPanelOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const composerRef = React.useRef<HTMLTextAreaElement>(null);

  // Live (client-side, growable) graph. Seeded only in live mode; otherwise the
  // server-provided `graph` prop is the source of truth.
  const liveController = useDynamicCampaignGraph({
    campaignId: campaign?.id ?? "campaign",
    nodes: liveSeed?.nodes ?? [],
    edges: liveSeed?.edges ?? [],
  });
  const liveMode = liveSeed !== null;
  const activeGraph = liveMode ? liveController.graph : graph;
  const {
    preferences: graphPreferences,
    updatePreferences: updateGraphPreferences,
    resetPreferences: resetGraphPreferences,
  } = useCampaignGraphPreferences(
    campaign?.id,
    campaign?.graph_preferences,
  );
  const activeEdgeCount = liveMode
    ? liveController.graph.edges.length
    : edgeCount;

  const displayGraph = React.useMemo(
    () =>
      applyCenterDisplayToGraph(activeGraph, {
        displayMode: graphPreferences.center.displayMode,
        customLabel: graphPreferences.center.customLabel,
        customSubtitle: graphPreferences.center.customSubtitle,
        campaign,
        profile,
        digest,
      }),
    [
      activeGraph,
      graphPreferences.center,
      campaign,
      profile,
      digest,
    ],
  );

  // With a conversation on screen, the chat card + composer cover the bottom
  // of the canvas — the graph re-frames itself into the uncovered upper area.
  const chatDockOpen = (activeThread?.messages.length ?? 0) > 0;

  const { highlightedNodeIds, searching: thinkingActive } =
    useChatGraphHighlights(displayGraph);

  const focusApi = useOptionalCampaignFocus();
  const presenceByObject = useGraphPresenceByObject();
  const presencePeerCount = selectedNodeId
    ? (presenceByObject.get(selectedNodeId) ?? 0)
    : 0;

  const handleSelectNode = React.useCallback(
    (node: CampaignGraphNodeData | null, id: string | null) => {
      setSelectedNode(node);
      setSelectedNodeId(id);
      if (node) setPanelOpen(true);
      if (node && id) {
        focusApi?.focusObject({
          objectType: "graph_node",
          objectId: id,
          objectTitle: node.title,
          module: "dashboard",
        });
      } else {
        focusApi?.clearFocus();
      }
    },
    [focusApi],
  );

  const handleSelectNodeId = React.useCallback(
    (id: string) => {
      const node = displayGraph?.nodes.find((n) => n.id === id);
      if (node) handleSelectNode(node.data, id);
    },
    [displayGraph, handleSelectNode],
  );

  const focusComposer = React.useCallback(() => {
    composerRef.current?.focus();
  }, []);

  const contextPanelProps = {
    campaign,
    profile,
    metrics,
    digest,
    graph: displayGraph,
    selectedNode,
    onClose: () => setPanelOpen(false),
    onClearSelection: () => handleSelectNode(null, null),
    onSelectNodeId: handleSelectNodeId,
    graphPreferences,
    onGraphPreferencesChange: updateGraphPreferences,
    presencePeerCount,
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
            graph={displayGraph}
            edgeCount={activeEdgeCount}
            selectedNodeId={selectedNodeId}
            highlightedNodeIds={highlightedNodeIds}
            searching={thinkingActive}
            chatDockOpen={chatDockOpen}
            onSelectNode={handleSelectNode}
            onFocusComposer={focusComposer}
            graphPreferences={graphPreferences}
            onGraphPreferencesChange={updateGraphPreferences}
            onRestoreGraphDefaults={resetGraphPreferences}
          />
        </div>

        {/* Full-bleed frosted breadcrumb bar — graph shows through the blur,
            edge to edge like every module page's command bar. */}
        <WorkspaceTopBar
          onToggleRail={toggleRailMobile}
          onTogglePanel={() => setPanelOpen((v) => !v)}
          panelOpen={panelOpen}
          showPanelToggle
        />

        {/* Floating glass composer docked at the bottom. The wrapper lets
            pointer events fall through to the graph everywhere except the
            card itself, which opts back in. */}
        <div className="pointer-events-none relative z-20 mt-auto">
          <ChatDock composerRef={composerRef} />
        </div>
      </section>

      {/* Right rail: preview + accessibility (collapsible). Always mounted on
          desktop so it can animate open/closed; the top bar owns the single
          toggle control. */}
      {!isMobile ? (
        <WorkspaceContextPanel open={panelOpen} {...contextPanelProps} />
      ) : null}

      <MobileContextSheet
        open={panelOpen && isMobile}
        onOpenChange={setPanelOpen}
        {...contextPanelProps}
      />
    </div>
  );
}
