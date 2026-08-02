"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { getCampaignGraph } from "@/actions/brain";
import { useCampaign } from "@/components/campaign/campaign-context";
import { WorkspaceGraphCanvasLazy as WorkspaceGraphCanvas } from "@/components/workspace/workspace-graph-canvas.lazy";
import { useCampaignGraphPreferences } from "@/hooks/use-campaign-graph-preferences";
import { applyCenterDisplayToGraph } from "@/lib/graph/apply-center-display";
import type {
  CampaignGraphFlow,
  CampaignGraphNodeData,
} from "@/lib/graph/to-react-flow";
import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import type { CampaignGraphPreferences } from "@/lib/graph/graph-preferences";
import {
  folderForPathname,
  isWorkingPanelRoute,
} from "@/lib/navigation/route-graph-folders";
import { cn } from "@/lib/utils";

type GraphStageContextValue = {
  /** True when the persistent stage is mounted (setup complete + graph host). */
  active: boolean;
  graph: CampaignGraphFlow | null;
  edgeCount: number;
  loading: boolean;
  /** Push a server/demo/live graph into the persistent stage (no remount). */
  hydrateGraph: (
    next: CampaignGraphFlow | null,
    nextEdgeCount?: number,
  ) => void;
  travelFolderId: CampaignFolderId | null;
  travelToFolder: (folderId: CampaignFolderId | null) => void;
  selectedNodeId: string | null;
  selectedNode: CampaignGraphNodeData | null;
  selectNode: (
    node: CampaignGraphNodeData | null,
    id: string | null,
  ) => void;
  highlightedNodeIds: Set<string>;
  setHighlightedNodeIds: (ids: Set<string>) => void;
  searching: boolean;
  setSearching: (searching: boolean) => void;
  chatDockOpen: boolean;
  setChatDockOpen: (open: boolean) => void;
  workingPanelOpen: boolean;
  graphPreferences: CampaignGraphPreferences;
  updateGraphPreferences: (
    patch:
      | Partial<CampaignGraphPreferences>
      | ((prev: CampaignGraphPreferences) => CampaignGraphPreferences),
  ) => void;
  resetGraphPreferences: () => void;
  focusComposer: () => void;
  setFocusComposerHandler: (handler: (() => void) | null) => void;
};

const GraphStageContext = React.createContext<GraphStageContextValue | null>(
  null,
);

export function useGraphStage(): GraphStageContextValue {
  const context = React.useContext(GraphStageContext);
  if (!context) {
    throw new Error("useGraphStage must be used within GraphStageProvider.");
  }
  return context;
}

export function useOptionalGraphStage(): GraphStageContextValue | null {
  return React.useContext(GraphStageContext);
}

type GraphStageProviderProps = {
  children: React.ReactNode;
};

/**
 * Persistent campaign knowledge-graph stage.
 *
 * The graph paints behind every authenticated route once onboarding is
 * complete. App navigation travels the camera to folder hubs; floating
 * features and the right working panel sit above as overlays.
 */
export function GraphStageProvider({ children }: GraphStageProviderProps) {
  const pathname = usePathname();
  const { campaign, profile, isSetupComplete } = useCampaign();
  const campaignId = campaign?.id ?? null;
  const stageActive = Boolean(isSetupComplete && campaignId);
  const workingPanelOpen = isWorkingPanelRoute(pathname);

  const [graph, setGraph] = React.useState<CampaignGraphFlow | null>(null);
  const [edgeCount, setEdgeCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [travelFolderId, setTravelFolderId] =
    React.useState<CampaignFolderId | null>(null);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(
    null,
  );
  const [selectedNode, setSelectedNode] =
    React.useState<CampaignGraphNodeData | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = React.useState<
    Set<string>
  >(() => new Set());
  const [searching, setSearching] = React.useState(false);
  const [chatDockOpen, setChatDockOpen] = React.useState(false);
  const focusComposerRef = React.useRef<(() => void) | null>(null);

  const [lastPathname, setLastPathname] = React.useState(pathname);
  const [lastCampaignId, setLastCampaignId] = React.useState(campaignId);
  const [lastStageActive, setLastStageActive] = React.useState(stageActive);

  // Route changes pull the camera through the map (adjust during render —
  // same pattern as WorkspaceShell's pathname close).
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    const folder = folderForPathname(pathname);
    if (folder !== undefined) {
      setTravelFolderId(folder);
    }
  }

  // Reset stage when leaving a completed campaign.
  if (stageActive !== lastStageActive || campaignId !== lastCampaignId) {
    setLastStageActive(stageActive);
    setLastCampaignId(campaignId);
    if (!stageActive) {
      setGraph(null);
      setEdgeCount(0);
      setLoading(false);
      setTravelFolderId(null);
      setSelectedNode(null);
      setSelectedNodeId(null);
    } else {
      setLoading(true);
    }
  }

  const {
    preferences: graphPreferences,
    updatePreferences: updateGraphPreferences,
    resetPreferences: resetGraphPreferences,
  } = useCampaignGraphPreferences(campaignId, campaign?.graph_preferences);

  // Async fetch for the persistent stage (external system).
  React.useEffect(() => {
    if (!stageActive || !campaignId) return;

    let cancelled = false;
    void getCampaignGraph().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setGraph(result.graph);
        setEdgeCount(result.edgeCount);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [stageActive, campaignId]);

  const displayGraph = React.useMemo(
    () =>
      applyCenterDisplayToGraph(graph, {
        displayMode: graphPreferences.center.displayMode,
        customLabel: graphPreferences.center.customLabel,
        customSubtitle: graphPreferences.center.customSubtitle,
        campaign,
        profile,
      }),
    [graph, graphPreferences.center, campaign, profile],
  );

  const hydrateGraph = React.useCallback(
    (next: CampaignGraphFlow | null, nextEdgeCount?: number) => {
      setGraph(next);
      setEdgeCount(nextEdgeCount ?? next?.edges.length ?? 0);
      setLoading(false);
    },
    [],
  );

  const travelToFolder = React.useCallback(
    (folderId: CampaignFolderId | null) => {
      setTravelFolderId(folderId);
    },
    [],
  );

  const selectNode = React.useCallback(
    (node: CampaignGraphNodeData | null, id: string | null) => {
      setSelectedNode(node);
      setSelectedNodeId(id);
    },
    [],
  );

  const setFocusComposerHandler = React.useCallback(
    (handler: (() => void) | null) => {
      focusComposerRef.current = handler;
    },
    [],
  );

  const focusComposer = React.useCallback(() => {
    focusComposerRef.current?.();
  }, []);

  const value = React.useMemo<GraphStageContextValue>(
    () => ({
      active: stageActive,
      graph: displayGraph,
      edgeCount,
      loading,
      hydrateGraph,
      travelFolderId,
      travelToFolder,
      selectedNodeId,
      selectedNode,
      selectNode,
      highlightedNodeIds,
      setHighlightedNodeIds,
      searching,
      setSearching,
      chatDockOpen,
      setChatDockOpen,
      workingPanelOpen,
      graphPreferences,
      updateGraphPreferences,
      resetGraphPreferences,
      focusComposer,
      setFocusComposerHandler,
    }),
    [
      stageActive,
      displayGraph,
      edgeCount,
      loading,
      hydrateGraph,
      travelFolderId,
      travelToFolder,
      selectedNodeId,
      selectedNode,
      selectNode,
      highlightedNodeIds,
      searching,
      chatDockOpen,
      workingPanelOpen,
      graphPreferences,
      updateGraphPreferences,
      resetGraphPreferences,
      focusComposer,
      setFocusComposerHandler,
    ],
  );

  return (
    <GraphStageContext.Provider value={value}>
      {stageActive ? (
        <div
          className={cn(
            "pointer-events-auto absolute inset-0 z-0",
            workingPanelOpen && "max-md:opacity-40",
          )}
        >
          <WorkspaceGraphCanvas
            graph={displayGraph}
            edgeCount={edgeCount}
            selectedNodeId={selectedNodeId}
            highlightedNodeIds={highlightedNodeIds}
            searching={searching}
            chatDockOpen={chatDockOpen && !workingPanelOpen}
            workingPanelOpen={workingPanelOpen}
            travelFolderId={travelFolderId}
            onTravelFolderChange={setTravelFolderId}
            onSelectNode={selectNode}
            onFocusComposer={focusComposer}
            graphPreferences={graphPreferences}
            onGraphPreferencesChange={updateGraphPreferences}
            onRestoreGraphDefaults={resetGraphPreferences}
            showAurora={false}
          />
        </div>
      ) : null}
      {children}
    </GraphStageContext.Provider>
  );
}
