"use client";

import { useCallback, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Sparkles } from "lucide-react";
import { GraphNodeCard } from "@/components/brain/graph-node-card";
import {
  getMinimapNodeColor,
  type CampaignFlowNode,
  type CampaignGraphFlow,
  type CampaignGraphNodeData,
} from "@/lib/graph/to-react-flow";

const nodeTypes = {
  graphNode: GraphNodeCard,
};

type WorkspaceGraphCanvasProps = {
  graph: CampaignGraphFlow | null;
  edgeCount: number;
  selectedNodeId: string | null;
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
  onSelectNode,
  onFocusComposer,
}: WorkspaceGraphCanvasProps) {
  const nodes = useMemo<Node[]>(() => {
    if (!graph) return [];
    return graph.nodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId,
    })) as Node[];
  }, [graph, selectedNodeId]);

  const edges = useMemo<Edge[]>(
    () => (graph ? (graph.edges as Edge[]) : []),
    [graph],
  );

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
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden p-6">
        <div className="glass-card pointer-events-auto z-10 max-w-md rounded-2xl p-8 text-center">
          <div className="brand-mark mx-auto mb-4 flex size-12 items-center justify-center rounded-xl text-white">
            <Sparkles className="size-6" aria-hidden />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">
            Tell me about your campaign to start building your map
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your knowledge graph is empty. Chat below, or create assets, events,
            tasks, research, and prospects — every item becomes a connected node
            here.
          </p>
          {onFocusComposer ? (
            <button
              type="button"
              onClick={onFocusComposer}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Sparkles className="size-4" aria-hidden />
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
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        className="bg-transparent"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          className="opacity-60"
        />
        <Controls
          showInteractive={false}
          className="!rounded-lg !border !border-border/60 !bg-background/80 !shadow-sm backdrop-blur"
        />
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) =>
            getMinimapNodeColor(
              (node.data as CampaignFlowNode["data"]).nodeType,
            )
          }
          maskColor="oklch(0.55 0.05 257 / 0.1)"
          className="!rounded-lg !border !border-border/60 !bg-background/70 backdrop-blur"
        />
      </ReactFlow>
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[0.6875rem] text-muted-foreground backdrop-blur">
        {graph.totalNodeCount} nodes · {edgeCount} edges
      </div>
    </div>
  );
}
