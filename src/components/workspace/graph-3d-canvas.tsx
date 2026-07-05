"use client";

import dynamic from "next/dynamic";
import * as React from "react";
import type { CampaignGraphFlow } from "@/lib/graph/to-react-flow";
import { getNodeVisualAccent } from "@/lib/graph/to-react-flow";

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Loading 3D view…
    </div>
  ),
});

type Graph3DCanvasProps = {
  graph: CampaignGraphFlow;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
};

/**
 * Experimental WebGL force-graph — same campaign data, alternate renderer.
 * Loaded only when the user toggles 3D in graph settings (no SSR).
 */
export function Graph3DCanvas({
  graph,
  selectedNodeId,
  onSelectNode,
}: Graph3DCanvasProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ width: 800, height: 600 });

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const graphData = React.useMemo(() => {
    const nodes = graph.nodes.map((node) => {
      const accent = getNodeVisualAccent(node.data);
      const dist = Math.hypot(node.position.x, node.position.y);
      const depth = Math.max(0, 1 - dist / 720);
      return {
        id: node.id,
        name: node.data.title,
        val: node.data.isCampaignCenter
          ? 12
          : node.data.isFolderHub
            ? 8
            : 2 + Math.sqrt(node.data.degree ?? 0),
        color: accent,
        fx: node.data.isCampaignCenter ? 0 : undefined,
        fy: node.data.isCampaignCenter ? 0 : undefined,
        fz: node.data.isCampaignCenter ? 0 : undefined,
        x: node.position.x * 0.55,
        y: node.position.y * 0.55,
        z: (depth - 0.5) * 280,
      };
    });
    const links = graph.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
    }));
    return { nodes, links };
  }, [graph]);

  return (
    <div ref={containerRef} className="graph-stage-3d absolute inset-0 z-[1]">
      <ForceGraph3D
        width={size.width}
        height={size.height}
        graphData={graphData}
        backgroundColor="rgba(0,0,0,0)"
        nodeOpacity={0.92}
        linkOpacity={0.35}
        linkWidth={0.6}
        enableNodeDrag
        onNodeClick={(node) => {
          onSelectNode((node as { id?: string }).id ?? null);
        }}
        onBackgroundClick={() => onSelectNode(null)}
        nodeLabel={(node) => (node as { name?: string }).name ?? ""}
        nodeColor={(node) =>
          node.id === selectedNodeId
            ? "#3b82f6"
            : ((node as { color?: string }).color ?? "#94a3b8")
        }
      />
    </div>
  );
}
