"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Loader2, Plus, Sparkles, X } from "lucide-react";
import { GraphNodeCard } from "@/components/brain/graph-node-card";
import { GraphFloatingEdge } from "@/components/brain/graph-floating-edge";
import {
  computeFolderFocusLevels,
  filterNodesByViewMode,
  type CampaignFlowNode,
  type CampaignGraphFlow,
  type CampaignGraphNodeData,
  type GraphViewMode,
} from "@/lib/graph/to-react-flow";
import { getCampaignFolder } from "@/lib/campaign-knowledge/folders";
import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import { cn } from "@/lib/utils";

const nodeTypes = {
  graphNode: GraphNodeCard,
};

const edgeTypes = {
  floating: GraphFloatingEdge,
};

const EMPTY_SET: Set<string> = new Set();

/** Shared easing duration (ms) for all camera moves — calm, never jarring. */
const CAMERA_EASE_MS = 720;
/** Entity labels hide below this zoom so zoomed-out views stay readable. */
const COMPACT_LABEL_ZOOM = 0.62;
/**
 * Asymmetric padding so the constellation stays clear of the floating overlays:
 * the frosted breadcrumb bar at the top and the glass composer docked at the
 * bottom. Without the extra bottom space, nodes would hide behind the composer.
 */
const FIT_VIEW_OPTIONS = {
  padding: { top: "88px", right: "88px", bottom: "216px", left: "88px" },
  duration: CAMERA_EASE_MS,
} as const;

type WorkspaceGraphCanvasProps = {
  graph: CampaignGraphFlow | null;
  edgeCount: number;
  selectedNodeId: string | null;
  highlightedNodeIds?: Set<string>;
  searching?: boolean;
  onSelectNode: (node: CampaignGraphNodeData | null, id: string | null) => void;
  onFocusComposer?: () => void;
  /** When provided, renders a "grow the graph" affordance (demo / live mode). */
  onAddKnowledge?: () => void;
  addKnowledgeLabel?: string;
  /** Show folder / entity view toggle (default true). */
  showViewToggle?: boolean;
  /** Optional controlled view mode. */
  viewMode?: GraphViewMode;
  onViewModeChange?: (mode: GraphViewMode) => void;
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
  onSelectNode,
  onFocusComposer,
  onAddKnowledge,
  addKnowledgeLabel = "Add knowledge",
  showViewToggle = true,
  viewMode: controlledViewMode,
  onViewModeChange,
}: WorkspaceGraphCanvasProps) {
  const highlighted = highlightedNodeIds ?? EMPTY_SET;
  const { fitView, setCenter, getNode, getZoom } = useReactFlow();
  const zoom = useStore((state) => state.transform[2]);
  const compactLabels = zoom < COMPACT_LABEL_ZOOM;
  const [internalViewMode, setInternalViewMode] = useState<GraphViewMode>("all");
  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;

  // Obsidian-style local-graph focus: clicking a folder hub pops its children
  // to the foreground while everything else dims to ambient context.
  const [focusFolderId, setFocusFolderId] = useState<CampaignFolderId | null>(
    null,
  );

  const visibleFlowNodes = useMemo(() => {
    if (!graph) return [];
    return filterNodesByViewMode(graph.nodes, viewMode);
  }, [graph, viewMode]);

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

  const nodes = useMemo<Node[]>(() => {
    return visibleFlowNodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId,
      data: {
        ...node.data,
        highlighted: highlighted.has(node.id),
        focusLevel: focusLevels?.get(node.id),
        compactLabels,
      },
    })) as Node[];
  }, [visibleFlowNodes, selectedNodeId, highlighted, focusLevels, compactLabels]);

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
  }, [visibleEdges, highlighted, focusLevels]);

  const exitFocus = useCallback(() => {
    setFocusFolderId(null);
  }, []);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const data = node.data as CampaignFlowNode["data"];
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

  // Smooth re-frame whenever the graph grows: keep the whole constellation in
  // view, easing the camera out instead of snapping.
  const nodeCountRef = useRef(graph?.totalNodeCount ?? 0);
  useEffect(() => {
    const count = graph?.totalNodeCount ?? 0;
    if (count !== nodeCountRef.current) {
      const grew = count > nodeCountRef.current;
      nodeCountRef.current = count;
      if (grew) {
        // Let the new node mount before fitting so it's included in the frame.
        const raf = requestAnimationFrame(() => {
          fitView(FIT_VIEW_OPTIONS);
        });
        return () => cancelAnimationFrame(raf);
      }
    }
  }, [graph?.totalNodeCount, fitView]);

  // Glide to the selected node (clicked on canvas, or chosen from chat / rail)
  // without changing the zoom — a gentle recenter, not a teleport.
  useEffect(() => {
    if (!selectedNodeId) return;
    const node = getNode(selectedNodeId);
    if (!node) return;
    const width = node.measured?.width ?? 0;
    const height = node.measured?.height ?? 0;
    const targetZoom = Math.min(Math.max(getZoom(), 0.85), 1.25);
    setCenter(node.position.x + width / 2, node.position.y + height / 2, {
      zoom: targetZoom,
      duration: CAMERA_EASE_MS,
    });
  }, [selectedNodeId, getNode, setCenter, getZoom]);

  const isEmpty = !graph || graph.totalNodeCount === 0;

  if (isEmpty) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <div className="max-w-md text-center">
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
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        minZoom={0.2}
        maxZoom={1.8}
        nodesConnectable={false}
        edgesFocusable={false}
        edgesReconnectable={false}
        elevateNodesOnSelect
        proOptions={{ hideAttribution: true }}
        className="bg-transparent"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1}
          color="var(--border)"
        />
        <Controls
          showInteractive={false}
          position="bottom-right"
          className="!rounded-lg !border !border-border !bg-card !shadow-[var(--shadow-panel)] [&_button]:!border-border [&_button]:!bg-card [&_button]:!text-foreground"
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
          <div className="glass-bar pointer-events-auto inline-flex rounded-full p-0.5">
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
                    ? "bg-card text-foreground shadow-[var(--shadow-panel)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}

        {activeFocusFolderId ? (
          <div className="glass-bar pointer-events-auto inline-flex items-center gap-1.5 rounded-full py-1 pl-2.5 pr-1 text-[0.7rem]">
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

      {onAddKnowledge ? (
        <button
          type="button"
          onClick={onAddKnowledge}
          className="glass-bar absolute right-3 top-16 z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.7rem] font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Plus className="size-3.5 text-brand-blue" aria-hidden />
          {addKnowledgeLabel}
        </button>
      ) : null}

      <div className="glass-bar pointer-events-none absolute bottom-3 left-3 z-10 rounded-full px-2.5 py-1 text-[0.7rem] text-muted-foreground">
        {visibleFlowNodes.length} visible · {graph.totalNodeCount} nodes ·{" "}
        {edgeCount} edges
      </div>
    </div>
  );
}
