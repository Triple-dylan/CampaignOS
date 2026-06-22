"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { GRAPH_NODE_TYPE_STYLES } from "@/lib/graph/node-styles";
import { GraphNodeTypeBadge } from "@/components/brain/graph-node-badge";
import type { CampaignGraphNodeData } from "@/lib/graph/to-react-flow";

export type GraphNodeCardNode = Node<CampaignGraphNodeData, "graphNode">;

export function GraphNodeCard({ data, selected }: NodeProps<GraphNodeCardNode>) {
  const styles = GRAPH_NODE_TYPE_STYLES[data.nodeType];
  const summary = data.summary?.trim();

  return (
    <div
      className={cn(
        "w-[220px] rounded-lg border-2 bg-card px-3 py-2 shadow-sm transition-shadow",
        styles.border,
        selected && "shadow-md ring-2 ring-ring ring-offset-2 ring-offset-background",
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!size-2 !border-background !bg-muted-foreground"
      />
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
          {data.title}
        </p>
      </div>
      <GraphNodeTypeBadge nodeType={data.nodeType} />
      {summary ? (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {summary}
        </p>
      ) : null}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-2 !border-background !bg-muted-foreground"
      />
    </div>
  );
}
