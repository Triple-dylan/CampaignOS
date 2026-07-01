"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getNodeDiameter,
  getNodeVisualAccent,
  type CampaignGraphNodeData,
  type GraphFocusLevel,
} from "@/lib/graph/to-react-flow";
import { graphNodeTooltip } from "@/lib/graph/node-metadata";

export type GraphNodeCardNode = Node<CampaignGraphNodeData, "graphNode">;

const HIDDEN_HANDLE =
  "!h-px !w-px !min-h-0 !min-w-0 !border-0 !bg-transparent !opacity-0";

/**
 * Obsidian-style folder focus: the focused folder's hub and children pop out at
 * full opacity (and slightly scaled up), while unrelated context dims back so
 * the user reads a clear local neighbourhood. Transitions are CSS-driven and
 * respect `prefers-reduced-motion` (see `.graph-node-focusable` in globals.css).
 */
const FOCUS_LEVEL_STYLE: Record<
  GraphFocusLevel,
  { opacity: number; scale: number }
> = {
  focus: { opacity: 1, scale: 1.12 },
  foreground: { opacity: 1, scale: 1.04 },
  midground: { opacity: 0.58, scale: 0.98 },
  background: { opacity: 0.16, scale: 0.9 },
};

/**
 * Wiki-llm knowledge graph node. Folder hubs are larger containers with a dashed
 * ring and folder icon; documents and entities are smaller dots with labels.
 */
export function GraphNodeCard({ data, selected }: NodeProps<GraphNodeCardNode>) {
  const accent = getNodeVisualAccent(data);
  const diameter = getNodeDiameter(data.degree ?? 0, data.isFolderHub);
  const tooltip = graphNodeTooltip(data);
  const focus = data.focusLevel ? FOCUS_LEVEL_STYLE[data.focusLevel] : null;

  return (
    <div
      className={cn(
        "group relative flex items-center justify-center",
        data.focusLevel && "graph-node-focusable",
        data.focusLevel === "background" && "graph-node-shadowed",
      )}
      style={{
        width: diameter,
        height: diameter,
        ...(focus
          ? { opacity: focus.opacity, transform: `scale(${focus.scale})` }
          : null),
      }}
      title={tooltip}
    >
      <Handle type="target" position={Position.Top} className={HIDDEN_HANDLE} />

      <div
        className={cn(
          "relative flex items-center justify-center transition-[transform,box-shadow] duration-150",
          data.isFolderHub
            ? "graph-folder-hub size-full"
            : "graph-dot size-full rounded-full border-[1.5px] group-hover:scale-110",
          !data.isFolderHub && selected && "graph-dot-selected",
          data.highlighted && "graph-node-active",
          data.isFolderHub && selected && "graph-folder-hub-selected",
        )}
        style={
          {
            width: diameter,
            height: diameter,
            backgroundColor: data.isFolderHub
              ? `color-mix(in oklch, ${accent} 14%, var(--card))`
              : `color-mix(in oklch, ${accent} 24%, var(--card))`,
            borderColor: data.isFolderHub
              ? `color-mix(in oklch, ${accent} 65%, transparent)`
              : `color-mix(in oklch, ${accent} 80%, transparent)`,
            "--node-accent": accent,
          } as React.CSSProperties
        }
      >
        {data.isFolderHub ? (
          <Folder
            className="size-[42%] shrink-0"
            style={{ color: accent }}
            aria-hidden
          />
        ) : null}
      </div>

      <span
        className={cn(
          "graph-node-label pointer-events-none absolute left-1/2 top-[calc(100%+6px)] -translate-x-1/2 text-center font-medium leading-tight transition-[color,opacity]",
          data.isFolderHub
            ? "max-w-[170px] text-[12px] font-semibold"
            : "max-w-[132px] truncate text-[10.5px]",
          selected ? "text-foreground" : "text-muted-foreground",
          "group-hover:text-foreground",
          // Quiet entity labels into ambient context so dense clusters read
          // cleanly; hub labels (the navigation anchors) always stay legible.
          !data.isFolderHub &&
            !selected &&
            !data.highlighted &&
            "opacity-70 group-hover:opacity-100",
          data.compactLabels &&
            !data.isFolderHub &&
            !selected &&
            !data.highlighted &&
            "opacity-0 group-hover:opacity-100",
          data.focusLevel === "background" && "opacity-0",
        )}
      >
        {data.isFolderHub ? (
          <span className="inline-flex flex-col items-center gap-0.5">
            <span className="text-[0.62rem] font-medium uppercase tracking-[0.08em] text-muted-foreground/80">
              {data.folder}/
            </span>
            <span>{data.title}</span>
          </span>
        ) : (
          data.title
        )}
      </span>

      <Handle
        type="source"
        position={Position.Bottom}
        className={HIDDEN_HANDLE}
      />
    </div>
  );
}
