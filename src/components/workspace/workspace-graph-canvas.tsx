"use client";

import { useCallback, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Loader2, Sparkles } from "lucide-react";
import { GraphNodeCard } from "@/components/brain/graph-node-card";
import { GraphFloatingEdge } from "@/components/brain/graph-floating-edge";
import {
  type CampaignFlowNode,
  type CampaignGraphFlow,
  type CampaignGraphNodeData,
} from "@/lib/graph/to-react-flow";

const nodeTypes = {
  graphNode: GraphNodeCard,
};

const edgeTypes = {
  floating: GraphFloatingEdge,
};

const EMPTY_SET: Set<string> = new Set();

type WorkspaceGraphCanvasProps = {
  graph: CampaignGraphFlow | null;
  edgeCount: number;
  selectedNodeId: string | null;
  highlightedNodeIds?: Set<string>;
  searching?: boolean;
  onSelectNode: (node: CampaignGraphNodeData | null, id: string | null) => void;
  onFocusComposer?: () => void;
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
}: WorkspaceGraphCanvasProps) {
  const highlighted = highlightedNodeIds ?? EMPTY_SET;

  const nodes = useMemo<Node[]>(() => {
    if (!graph) return [];
    return graph.nodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId,
      data: { ...node.data, highlighted: highlighted.has(node.id) },
    })) as Node[];
  }, [graph, selectedNodeId, highlighted]);

  const edges = useMemo<Edge[]>(() => {
    if (!graph) return [];
    return graph.edges.map((edge) => ({
      ...edge,
      // Edges are visual connectors only — never interaction targets.
      selectable: false,
      focusable: false,
      interactionWidth: 0,
      className:
        highlighted.has(edge.source) && highlighted.has(edge.target)
          ? "is-active"
          : undefined,
    })) as Edge[];
  }, [graph, highlighted]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onSelectNode(node.data as CampaignFlowNode["data"], node.id);
    },
    [onSelectNode],
  );

  const onPaneClick = useCallback(() => {
    onSelectNode(null, null);
  }, [onSelectNode]);

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
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        className="bg-transparent"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={26}
          size={1}
          color="var(--border)"
        />
        <Controls
          showInteractive={false}
          className="!rounded-lg !border !border-border !bg-card !shadow-[var(--shadow-panel)] [&_button]:!border-border [&_button]:!bg-card [&_button]:!text-foreground"
        />
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) =>
            getMinimapNodeColor(
              (node.data as CampaignFlowNode["data"]).nodeType,
            )
          }
          maskColor="color-mix(in oklch, var(--muted) 70%, transparent)"
          bgColor="var(--card)"
          className="!rounded-lg !border !border-border !shadow-[var(--shadow-panel)]"
        />
      </ReactFlow>

      <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2">
        {searching ? (
          <span className="badge-blue inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium">
            <Loader2 className="size-3 animate-spin" aria-hidden />
            Searching campaign…
          </span>
        ) : null}
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full border border-border bg-card/90 px-2.5 py-1 text-[0.7rem] text-muted-foreground backdrop-blur-sm">
        {graph.totalNodeCount} nodes · {edgeCount} edges
      </div>
    </div>
  );
}
