"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Loader2, Settings2, Sparkles, X } from "lucide-react";
import { GraphNodeCard } from "@/components/brain/graph-node-card";
import { GraphFloatingEdge } from "@/components/brain/graph-floating-edge";
import { GraphSettingsPanel } from "@/components/workspace/graph-settings-panel";
import {
  computeFolderFocusLevels,
  filterNodesByViewMode,
  type CampaignGraphFlow,
  type CampaignGraphNodeData,
  type GraphViewMode,
} from "@/lib/graph/to-react-flow";
import { useGraphForceSimulation } from "@/lib/graph/use-force-simulation";
import {
  compactLabelZoomFromTextFade,
  type CampaignGraphPreferences,
} from "@/lib/graph/graph-preferences";
import { getCampaignFolder } from "@/lib/campaign-knowledge/folders";
import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const nodeTypes = {
  graphNode: GraphNodeCard,
};

const edgeTypes = {
  floating: GraphFloatingEdge,
};

const EMPTY_SET: Set<string> = new Set();
const EMPTY_NODES: Node[] = [];

/** Shared easing duration (ms) for all camera moves — calm, never jarring. */
const CAMERA_EASE_MS = 800;
/** Entity labels fade out below this zoom so zoomed-out views stay readable. */
const DEFAULT_COMPACT_LABEL_ZOOM = 0.62;

/**
 * Camera moves are queued per animation frame with a priority so overlapping
 * triggers (select a node while a folder-focus push-in starts, chat dock
 * opening while the graph grows) never fight: only the strongest intent runs.
 */
const CAMERA_PRIORITY = {
  /** Ambient reframes: initial settle, growth, chat dock open/close. */
  frame: 1,
  /** Explicit node selection recenter. */
  select: 2,
  /** Folder-focus push-in / pull-back. */
  focus: 3,
} as const;

/**
 * Asymmetric padding so the constellation stays clear of the floating overlays:
 * the frosted breadcrumb bar at the top and the glass composer docked at the
 * bottom. Without the extra bottom space, nodes would hide behind the composer.
 */
const DESKTOP_FIT_VIEW_OPTIONS = {
  padding: { top: "80px", right: "88px", bottom: "236px", left: "88px" },
  duration: CAMERA_EASE_MS,
} as const;

/**
 * With a conversation open, the chat card (up to 34vh) + composer cover
 * roughly the bottom 40% of the canvas — the frame shifts visible nodes up
 * into the uncovered area.
 */
const DESKTOP_DOCK_OPEN_FIT_VIEW_OPTIONS = {
  padding: { top: "72px", right: "88px", bottom: "44%", left: "88px" },
  duration: CAMERA_EASE_MS,
} as const;

const MOBILE_FIT_VIEW_OPTIONS = {
  padding: { top: "72px", right: "48px", bottom: "148px", left: "48px" },
  duration: CAMERA_EASE_MS,
} as const;

const MOBILE_DOCK_OPEN_FIT_VIEW_OPTIONS = {
  padding: { top: "64px", right: "48px", bottom: "46%", left: "48px" },
  duration: CAMERA_EASE_MS,
} as const;

type WorkspaceGraphCanvasProps = {
  graph: CampaignGraphFlow | null;
  edgeCount: number;
  selectedNodeId: string | null;
  highlightedNodeIds?: Set<string>;
  searching?: boolean;
  /** True while a conversation card floats over the bottom of the canvas. */
  chatDockOpen?: boolean;
  onSelectNode: (node: CampaignGraphNodeData | null, id: string | null) => void;
  onFocusComposer?: () => void;
  /** Show folder / entity view toggle (default true). */
  showViewToggle?: boolean;
  /** Optional controlled view mode. */
  viewMode?: GraphViewMode;
  onViewModeChange?: (mode: GraphViewMode) => void;
  /** Per-campaign graph customization from gear panel. */
  graphPreferences?: CampaignGraphPreferences;
  onGraphPreferencesChange?: (
    patch: Partial<CampaignGraphPreferences>,
  ) => void;
  onRestoreGraphDefaults?: () => void;
};

export function WorkspaceGraphCanvas(props: WorkspaceGraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkspaceGraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function WorkspaceGraphCanvasInner({
  graph,
  edgeCount,
  selectedNodeId,
  highlightedNodeIds,
  searching = false,
  chatDockOpen = false,
  onSelectNode,
  onFocusComposer,
  showViewToggle = true,
  viewMode: controlledViewMode,
  onViewModeChange,
  graphPreferences,
  onGraphPreferencesChange,
  onRestoreGraphDefaults,
}: WorkspaceGraphCanvasProps) {
  const highlighted = highlightedNodeIds ?? EMPTY_SET;
  const isMobile = useIsMobile();
  const displayPrefs = graphPreferences?.display;
  const compactLabelZoom = displayPrefs
    ? compactLabelZoomFromTextFade(displayPrefs.textFadeMultiplier)
    : DEFAULT_COMPACT_LABEL_ZOOM;
  const lineSizeMultiplier = displayPrefs?.lineSizeMultiplier ?? 1;
  const nodeSizeMultiplier = displayPrefs?.nodeSizeMultiplier ?? 1;
  const forcePrefs = graphPreferences?.forces;
  const showOrphans = graphPreferences?.filters.showOrphans ?? true;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fitViewOptions = isMobile
    ? chatDockOpen
      ? MOBILE_DOCK_OPEN_FIT_VIEW_OPTIONS
      : MOBILE_FIT_VIEW_OPTIONS
    : chatDockOpen
      ? DESKTOP_DOCK_OPEN_FIT_VIEW_OPTIONS
      : DESKTOP_FIT_VIEW_OPTIONS;
  const { fitView, setCenter, getZoom } = useReactFlow();
  // Boolean selector: re-renders only when the zoom threshold is crossed —
  // never once per zoom frame. Label fading itself is pure CSS.
  const compactLabels = useStore(
    (state) => state.transform[2] < compactLabelZoom,
  );
  const paneHeight = useStore((state) => state.height);
  const [internalViewMode, setInternalViewMode] = useState<GraphViewMode>("all");
  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;

  // Obsidian-style local-graph focus: clicking a folder hub pops its children
  // to the foreground while everything else dims to ambient context.
  const [focusFolderId, setFocusFolderId] = useState<CampaignFolderId | null>(
    null,
  );

  // Hovered node: its touching edges brighten so the local neighbourhood
  // reads at a glance (cheap CSS class toggle, no layout work).
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const visibleFlowNodes = useMemo(() => {
    if (!graph) return [];
    let nodes = filterNodesByViewMode(graph.nodes, viewMode);
    if (!showOrphans) {
      nodes = nodes.filter(
        (node) =>
          node.data.isFolderHub ||
          node.data.isCampaignCenter ||
          (node.data.degree ?? 0) > 0,
      );
    }
    return nodes;
  }, [graph, viewMode, showOrphans]);

  const visibleNodeIds = useMemo(
    () => new Set(visibleFlowNodes.map((node) => node.id)),
    [visibleFlowNodes],
  );

  const visibleEdges = useMemo<CampaignGraphFlow["edges"]>(() => {
    if (!graph) return [];
    return graph.edges.filter(
      (edge) =>
        visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
    );
  }, [graph, visibleNodeIds]);

  // Live physics: the d3-force simulation owns node positions and streams
  // them straight into React Flow's internal store (uncontrolled nodes) —
  // per-frame ticks never re-render this component, and node `data` stays
  // referentially stable so the memoized node components skip too.
  const simulation = useGraphForceSimulation({
    flowNodes: visibleFlowNodes,
    flowEdges: visibleEdges,
    forces: forcePrefs,
    nodeSizeMultiplier,
  });
  const { settleCount, getPosition } = simulation;
  const { setNodes } = useReactFlow();

  // Map every visible node to its focus level (focus / foreground / midground /
  // background). Null when no folder is focused — the global graph.
  const focusLevels = useMemo(() => {
    if (!focusFolderId) return null;
    const levels = computeFolderFocusLevels({
      nodes: visibleFlowNodes,
      edges: visibleEdges,
      focusFolderId,
    });
    return levels.size > 0 ? levels : null;
  }, [focusFolderId, visibleFlowNodes, visibleEdges]);

  // Derived (never stored) so a focused folder that vanishes — graph changed or
  // the view mode hid every member — silently drops its breadcrumb and dimming
  // without a state-resetting effect.
  const activeFocusFolderId = focusLevels ? focusFolderId : null;

  // Apply transient per-node flags (chat highlight, folder-focus level,
  // selection) by mutating only the nodes whose flags actually changed.
  // Untouched nodes keep their object + data identity, so this never causes
  // a graph-wide re-render or replays entrance animations.
  useEffect(() => {
    setNodes((current) => {
      let changed = false;
      const next = current.map((node) => {
        const data = node.data as CampaignGraphNodeData;
        const isHighlighted = highlighted.has(node.id);
        const focusLevel = focusLevels?.get(node.id);
        const isSelected = node.id === selectedNodeId;
        if (
          (data.highlighted ?? false) === isHighlighted &&
          data.focusLevel === focusLevel &&
          (node.selected ?? false) === isSelected
        ) {
          return node;
        }
        changed = true;
        return {
          ...node,
          selected: isSelected,
          data: {
            ...data,
            highlighted: isHighlighted,
            focusLevel,
          },
        };
      });
      return changed ? next : current;
    });
  }, [highlighted, focusLevels, selectedNodeId, setNodes]);

  // Push display multipliers into node data so memoized cards re-render once.
  useEffect(() => {
    setNodes((current) => {
      let changed = false;
      const next = current.map((node) => {
        const data = node.data as CampaignGraphNodeData;
        if (data.nodeSizeMultiplier === nodeSizeMultiplier) return node;
        changed = true;
        return {
          ...node,
          data: { ...data, nodeSizeMultiplier },
        };
      });
      return changed ? next : current;
    });
  }, [nodeSizeMultiplier, setNodes]);

  const edges = useMemo<Edge[]>(() => {
    return visibleEdges.map((edge) => {
      const classes: string[] = [];
      // Structural `belongs_to` links (member → folder hub → candidate) are the
      // quiet scaffolding of the graph; relationship edges carry the meaning, so
      // they read a touch stronger. This separation cuts visual noise.
      if (edge.data?.relationshipType === "belongs_to") {
        classes.push("is-structural");
      }
      if (highlighted.has(edge.source) && highlighted.has(edge.target)) {
        classes.push("is-active");
      }
      if (
        hoveredNodeId &&
        (edge.source === hoveredNodeId || edge.target === hoveredNodeId)
      ) {
        classes.push("is-hover");
      }
      if (focusLevels) {
        const sourceLevel = focusLevels.get(edge.source);
        const targetLevel = focusLevels.get(edge.target);
        const inside = (level: string | undefined) =>
          level === "focus" || level === "foreground";
        if (inside(sourceLevel) && inside(targetLevel)) {
          classes.push("is-focus-path");
        } else if (
          sourceLevel === "background" ||
          targetLevel === "background"
        ) {
          classes.push("is-shadowed");
        }
      }
      return {
        ...edge,
        selectable: false,
        focusable: false,
        interactionWidth: 0,
        className: classes.length > 0 ? classes.join(" ") : undefined,
      };
    }) as Edge[];
  }, [visibleEdges, highlighted, hoveredNodeId, focusLevels]);

  /* ------------------------------------------------------------------ *
   * Camera controller. Every programmatic move funnels through a single
   * per-frame queue: within a frame only the highest-priority request runs,
   * and while the user is actively panning/zooming, ambient reframes are
   * deferred until shortly after the gesture ends — the camera cooperates
   * with the user instead of seizing control.
   * ------------------------------------------------------------------ */
  const cameraPendingRef = useRef<{ priority: number; run: () => void } | null>(
    null,
  );
  const cameraRafRef = useRef<number | null>(null);
  const userGestureRef = useRef(false);
  const deferredCameraRef = useRef<{
    priority: number;
    run: () => void;
  } | null>(null);
  const deferredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestCameraMove = useCallback(
    (priority: number, run: () => void) => {
      if (userGestureRef.current) {
        const deferred = deferredCameraRef.current;
        if (!deferred || priority >= deferred.priority) {
          deferredCameraRef.current = { priority, run };
        }
        return;
      }
      const pending = cameraPendingRef.current;
      if (pending && pending.priority > priority) return;
      cameraPendingRef.current = { priority, run };
      if (cameraRafRef.current === null) {
        cameraRafRef.current = requestAnimationFrame(() => {
          cameraRafRef.current = null;
          const next = cameraPendingRef.current;
          cameraPendingRef.current = null;
          next?.run();
        });
      }
    },
    [],
  );

  const onMoveStart = useCallback(
    (event: MouseEvent | TouchEvent | null | undefined) => {
      // A real input event means the user grabbed the camera; programmatic
      // transitions (fitView / setCenter) pass no event.
      if (event) userGestureRef.current = true;
    },
    [],
  );

  const onMoveEnd = useCallback(() => {
    if (!userGestureRef.current) return;
    userGestureRef.current = false;
    const deferred = deferredCameraRef.current;
    deferredCameraRef.current = null;
    if (!deferred) return;
    // Breathe before applying a deferred reframe so it reads as a follow-up,
    // not the app snatching the camera back the instant the user lets go.
    if (deferredTimerRef.current) clearTimeout(deferredTimerRef.current);
    deferredTimerRef.current = setTimeout(() => {
      requestCameraMove(deferred.priority, deferred.run);
    }, 350);
  }, [requestCameraMove]);

  useEffect(() => {
    return () => {
      if (cameraRafRef.current !== null)
        cancelAnimationFrame(cameraRafRef.current);
      if (deferredTimerRef.current) clearTimeout(deferredTimerRef.current);
    };
  }, []);

  /* ------------------------------------------------------------------ *
   * Physics-aware dragging: pin the grabbed node (fx/fy) and re-heat the
   * simulation so its neighbourhood elastically follows, then release on
   * drop so everything re-settles.
   * ------------------------------------------------------------------ */
  const onNodeDragStart = useCallback(
    (_event: MouseEvent | TouchEvent, node: Node) => {
      simulation.startDrag(node.id, node.position);
    },
    [simulation],
  );

  const onNodeDrag = useCallback(
    (_event: MouseEvent | TouchEvent, node: Node) => {
      simulation.moveDrag(node.id, node.position);
    },
    [simulation],
  );

  const onNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, node: Node) => {
      simulation.endDrag(node.id);
    },
    [simulation],
  );

  const exitFocus = useCallback(() => {
    setFocusFolderId(null);
  }, []);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const data = node.data as CampaignGraphNodeData;
      // Clicking a folder hub commits folder focus; clicking elsewhere keeps
      // any active focus so children can be inspected without losing context.
      if (data.isFolderHub && data.folder) {
        setFocusFolderId(data.folder);
      }
      onSelectNode(data, node.id);
    },
    [onSelectNode],
  );

  const onPaneClick = useCallback(() => {
    setFocusFolderId(null);
    onSelectNode(null, null);
  }, [onSelectNode]);

  // Escape exits focus (and clears the selected node when nothing is focused).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (activeFocusFolderId) {
        setFocusFolderId(null);
      } else if (selectedNodeId) {
        onSelectNode(null, null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeFocusFolderId, selectedNodeId, onSelectNode]);

  // Once the physics settles for the first time, gently reframe the settled
  // constellation. (The initial `fitView` prop frames the seeded layout, but
  // the simulation contracts/expands it while finding equilibrium.)
  const didSettleFitRef = useRef(false);
  useEffect(() => {
    if (settleCount === 0 || didSettleFitRef.current) return;
    didSettleFitRef.current = true;
    requestCameraMove(CAMERA_PRIORITY.frame, () => {
      fitView(fitViewOptions);
    });
  }, [settleCount, requestCameraMove, fitView, fitViewOptions]);

  // Smooth re-frame whenever the graph grows: keep the whole constellation in
  // view, easing the camera out instead of snapping.
  const nodeCountRef = useRef(graph?.totalNodeCount ?? 0);
  useEffect(() => {
    const count = graph?.totalNodeCount ?? 0;
    if (count !== nodeCountRef.current) {
      const grew = count > nodeCountRef.current;
      nodeCountRef.current = count;
      if (grew) {
        requestCameraMove(CAMERA_PRIORITY.frame, () => {
          fitView(fitViewOptions);
        });
      }
    }
  }, [graph?.totalNodeCount, requestCameraMove, fitView, fitViewOptions]);

  // When the chat dock opens or closes over the canvas, re-frame the graph so
  // visible nodes glide up into (or back from) the uncovered area — a gentle
  // ease using the shared camera duration, never a jump.
  const dockOpenRef = useRef(chatDockOpen);
  useEffect(() => {
    if (dockOpenRef.current === chatDockOpen) return;
    dockOpenRef.current = chatDockOpen;
    requestCameraMove(CAMERA_PRIORITY.frame, () => {
      fitView(fitViewOptions);
    });
  }, [chatDockOpen, requestCameraMove, fitView, fitViewOptions]);

  // Folder focus reads as a camera push-in toward the cluster; exiting eases
  // back out to the full constellation.
  const focusCameraRef = useRef<CampaignFolderId | null>(null);
  useEffect(() => {
    if (focusCameraRef.current === activeFocusFolderId) return;
    const previous = focusCameraRef.current;
    focusCameraRef.current = activeFocusFolderId;

    if (activeFocusFolderId && focusLevels) {
      const clusterIds: { id: string }[] = [];
      for (const [id, level] of focusLevels) {
        if (level === "focus" || level === "foreground") clusterIds.push({ id });
      }
      if (clusterIds.length === 0) return;
      requestCameraMove(CAMERA_PRIORITY.focus, () => {
        fitView({
          nodes: clusterIds,
          padding: fitViewOptions.padding,
          duration: CAMERA_EASE_MS,
          maxZoom: 1.15,
        });
      });
      return;
    }

    // Exiting focus (but not the initial mount) — ease back to the full view.
    if (previous) {
      requestCameraMove(CAMERA_PRIORITY.focus, () => {
        fitView(fitViewOptions);
      });
    }
  }, [
    activeFocusFolderId,
    focusLevels,
    requestCameraMove,
    fitView,
    fitViewOptions,
  ]);

  // Glide to the selected node (clicked on canvas, or chosen from chat / rail)
  // without changing the zoom — a gentle recenter, not a teleport. Folder hubs
  // are skipped: their click triggers the focus push-in above, and centering
  // on top of it would double-move the camera.
  useEffect(() => {
    if (!selectedNodeId) return;
    const flowNode = visibleFlowNodes.find((n) => n.id === selectedNodeId);
    if (!flowNode || flowNode.data.isFolderHub) return;
    const targetZoom = Math.min(Math.max(getZoom(), 0.85), 1.25);
    const position = getPosition(selectedNodeId) ?? flowNode.position;
    // With the chat dock covering the bottom of the canvas, bias the target
    // upward so the node centers within the *visible* area, not behind chat.
    const dockBias = chatDockOpen ? (paneHeight * 0.19) / targetZoom : 0;
    requestCameraMove(CAMERA_PRIORITY.select, () => {
      setCenter(position.x, position.y + dockBias, {
        zoom: targetZoom,
        duration: CAMERA_EASE_MS,
      });
    });
    // Intentionally excludes live position/zoom deps: recenter once per selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, setCenter, getZoom, requestCameraMove]);

  const isEmpty = !graph || graph.totalNodeCount === 0;

  if (isEmpty) {
    return (
      <div className="relative flex h-full w-full items-center justify-center p-6">
        <div className="graph-aurora" aria-hidden />
        <div className="relative max-w-md text-center">
          <div className="brand-mark mx-auto mb-4 flex size-11 items-center justify-center rounded-xl">
            <Sparkles className="size-5" aria-hidden />
          </div>
          <h2 className="text-base font-semibold tracking-tight">
            Start building your campaign map
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Your knowledge graph is empty. Ask the assistant below, or add
            assets, events, research, and prospects — each becomes a connected
            node here.
          </p>
          {onFocusComposer ? (
            <button
              type="button"
              onClick={onFocusComposer}
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              Start the conversation
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full touch-none"
      style={
        {
          "--graph-edge-width": lineSizeMultiplier,
        } as CSSProperties
      }
    >
      <div className="graph-aurora" aria-hidden />
      <ReactFlow
        defaultNodes={EMPTY_NODES}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeMouseEnter={(_event, node) => setHoveredNodeId(node.id)}
        onNodeMouseLeave={() => setHoveredNodeId(null)}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onMoveStart={(event) => onMoveStart(event)}
        onMoveEnd={onMoveEnd}
        nodeDragThreshold={4}
        fitView
        fitViewOptions={fitViewOptions}
        minZoom={isMobile ? 0.35 : 0.2}
        maxZoom={1.8}
        nodesConnectable={false}
        edgesFocusable={false}
        edgesReconnectable={false}
        elevateNodesOnSelect
        proOptions={{ hideAttribution: true }}
        className={cn(
          "bg-transparent",
          compactLabels && "graph-labels-compact",
        )}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1}
          color="var(--border)"
        />
      </ReactFlow>

      <div className="pointer-events-none absolute left-3 top-16 z-10 flex items-center gap-2">
        {searching ? (
          <span className="badge-blue inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium">
            <Loader2 className="size-3 animate-spin" aria-hidden />
            Searching campaign…
          </span>
        ) : null}
        {showViewToggle ? (
          <div className="glass-chrome-pill pointer-events-auto inline-flex rounded-full p-0.5">
            {(
              [
                ["folders", "Folders"],
                ["entities", "Entities"],
                ["all", "All"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[0.7rem] font-medium transition-colors",
                  viewMode === mode
                    ? "is-active-pill bg-card text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}

        {activeFocusFolderId ? (
          <div className="glass-chrome-pill pointer-events-auto inline-flex items-center gap-1.5 rounded-full py-1 pl-2.5 pr-1 text-[0.7rem]">
            <button
              type="button"
              onClick={exitFocus}
              className="font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              All folders
            </button>
            <span aria-hidden className="text-muted-foreground/60">
              ›
            </span>
            <span className="font-semibold text-foreground">
              {getCampaignFolder(activeFocusFolderId).label}/
            </span>
            <button
              type="button"
              onClick={exitFocus}
              aria-label="Reset graph focus"
              title="Reset focus (Esc)"
              className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>

      {/* Top-right: graph stats + gear settings. */}
      <div className="pointer-events-none absolute right-3 top-16 z-10 flex flex-col items-end gap-2">
        <div className="flex items-center gap-1.5">
          {onGraphPreferencesChange ? (
            <button
              type="button"
              data-graph-settings-trigger
              onClick={() => setSettingsOpen((open) => !open)}
              aria-label="Graph settings"
              aria-expanded={settingsOpen}
              className={cn(
                "glass-chrome-pill pointer-events-auto inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground",
                settingsOpen && "is-active-pill text-foreground",
              )}
            >
              <Settings2 className="size-3.5" aria-hidden />
            </button>
          ) : null}
          <div className="glass-chrome-pill rounded-full px-2.5 py-1 text-[0.7rem] text-muted-foreground">
            {visibleFlowNodes.length} visible · {graph.totalNodeCount} nodes ·{" "}
            {edgeCount} edges
          </div>
        </div>
        {settingsOpen && graphPreferences && onGraphPreferencesChange ? (
          <GraphSettingsPanel
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            preferences={graphPreferences}
            onChange={onGraphPreferencesChange}
            onRestoreDefaults={() => {
              onRestoreGraphDefaults?.();
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
