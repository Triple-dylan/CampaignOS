"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import {
  getNodeAccentColor,
  getNodeDiameter,
  type CampaignGraphNodeData,
} from "@/lib/graph/to-react-flow";

export type GraphNodeCardNode = Node<CampaignGraphNodeData, "graphNode">;

const HIDDEN_HANDLE =
  "!h-px !w-px !min-h-0 !min-w-0 !border-0 !bg-transparent !opacity-0";

/**
 * An Obsidian-style graph node: a soft, type-tinted dot with a readable label
 * beneath it. The dot is the only interactive surface; edges are drawn between
 * dot centers by the floating edge and are purely visual.
 */
export function GraphNodeCard({ data, selected }: NodeProps<GraphNodeCardNode>) {
  const accent = getNodeAccentColor(data.nodeType);
  const diameter = getNodeDiameter(data.degree ?? 0);

  return (
    <div
      className="group relative flex items-center justify-center"
      style={{ width: diameter, height: diameter }}
    >
      <Handle type="target" position={Position.Top} className={HIDDEN_HANDLE} />

      <div
        className={cn(
          "graph-dot size-full rounded-full border-[1.5px] transition-[transform,box-shadow] duration-150",
          "group-hover:scale-110",
          selected && "graph-dot-selected",
          data.highlighted && "graph-node-active",
        )}
        style={
          {
            backgroundColor: `color-mix(in oklch, ${accent} 24%, var(--card))`,
            borderColor: `color-mix(in oklch, ${accent} 80%, transparent)`,
            "--node-accent": accent,
          } as React.CSSProperties
        }
      />

      <span
        className={cn(
          "pointer-events-none absolute left-1/2 top-[calc(100%+5px)] max-w-[140px] -translate-x-1/2 truncate rounded px-1 text-center text-[11px] font-medium leading-tight transition-colors",
          selected ? "text-foreground" : "text-muted-foreground",
          "group-hover:text-foreground",
        )}
      >
        {data.title}
      </span>

      <Handle
        type="source"
        position={Position.Bottom}
        className={HIDDEN_HANDLE}
      />
    </div>
  );
}
