"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GraphNodeCard } from "@/components/brain/graph-node-card";
import { GraphFilters } from "@/components/brain/graph-filters";
import { NodeDetailSheet } from "@/components/brain/node-detail-sheet";
import {
  getMinimapNodeColor,
  type CampaignFlowNode,
  type CampaignGraphFlow,
} from "@/lib/graph/to-react-flow";
import type { GraphNodeType } from "@/lib/validators/enums";

const nodeTypes = {
  graphNode: GraphNodeCard,
};

type CampaignBrainGraphProps = {
  graph: CampaignGraphFlow;
  edgeCount: number;
};

function matchesSearch(title: string, query: string): boolean {
  if (!query.trim()) {
    return true;
  }
  return title.toLowerCase().includes(query.trim().toLowerCase());
}

export function CampaignBrainGraph({
  graph,
  edgeCount,
}: CampaignBrainGraphProps) {
  return (
    <ReactFlowProvider>
      <CampaignBrainGraphInner graph={graph} edgeCount={edgeCount} />
    </ReactFlowProvider>
  );
}

function CampaignBrainGraphInner({
  graph,
  edgeCount,
}: CampaignBrainGraphProps) {
  const availableTypes = useMemo(() => {
    const types = new Set<GraphNodeType>();
    for (const node of graph.nodes) {
      types.add(node.data.nodeType);
    }
    return [...types].sort((a, b) => a.localeCompare(b));
  }, [graph.nodes]);

  const [selectedTypes, setSelectedTypes] = useState<Set<GraphNodeType>>(
    () => new Set(availableTypes),
  );
  const [showEdges, setShowEdges] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<CampaignFlowNode["data"] | null>(
    null,
  );
  const [detailOpen, setDetailOpen] = useState(false);

  const visibleNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const node of graph.nodes) {
      if (
        selectedTypes.has(node.data.nodeType) &&
        matchesSearch(node.data.title, searchQuery)
      ) {
        ids.add(node.id);
      }
    }
    return ids;
  }, [graph.nodes, selectedTypes, searchQuery]);

  const filteredNodes = useMemo(
    () => graph.nodes.filter((node) => visibleNodeIds.has(node.id)),
    [graph.nodes, visibleNodeIds],
  );

  const filteredEdges = useMemo(() => {
    if (!showEdges) {
      return [];
    }

    return graph.edges.filter(
      (edge) =>
        visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
    );
  }, [graph.edges, showEdges, visibleNodeIds]);

  const onToggleType = useCallback((type: GraphNodeType) => {
    setSelectedTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const onSelectAllTypes = useCallback(() => {
    setSelectedTypes(new Set(availableTypes));
  }, [availableTypes]);

  const onClearTypes = useCallback(() => {
    setSelectedTypes(new Set());
  }, []);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const data = node.data as CampaignFlowNode["data"];
    setSelectedNode(data);
    setDetailOpen(true);
  }, []);

  const onSelectionChange = useCallback(
    ({ nodes }: OnSelectionChangeParams) => {
      if (nodes.length === 1 && nodes[0]?.data) {
        setSelectedNode(nodes[0].data as CampaignFlowNode["data"]);
      }
    },
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      {graph.truncated ? (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          This campaign has {graph.totalNodeCount} graph nodes. Displaying the
          first {graph.nodes.length} for performance — use filters to narrow the
          view.
        </div>
      ) : null}

      <GraphFilters
        availableTypes={availableTypes}
        selectedTypes={selectedTypes}
        onToggleType={onToggleType}
        onSelectAllTypes={onSelectAllTypes}
        onClearTypes={onClearTypes}
        showEdges={showEdges}
        onShowEdgesChange={setShowEdges}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        visibleNodeCount={filteredNodes.length}
        totalNodeCount={graph.totalNodeCount}
      />

      <div className="h-[min(70vh,720px)] min-h-[420px] overflow-hidden rounded-lg border bg-muted/20">
        {filteredNodes.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <p className="max-w-md text-sm text-muted-foreground">
              No nodes match your filters. Adjust node types or clear the search
              query to see more of the graph.
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={filteredNodes as Node[]}
            edges={filteredEdges as Edge[]}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onSelectionChange={onSelectionChange}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={(node) =>
                getMinimapNodeColor(
                  (node.data as CampaignFlowNode["data"]).nodeType,
                )
              }
              maskColor="rgba(0, 0, 0, 0.08)"
              className="!bg-background/80"
            />
          </ReactFlow>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {graph.totalNodeCount} nodes · {edgeCount} edges · Click a node for
        details and source links
      </p>

      <NodeDetailSheet
        node={selectedNode}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
