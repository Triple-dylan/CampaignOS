"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Folder, Target } from "lucide-react";
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
 * Obsidian-style knowledge graph node: a small round dot sized by
 * connectivity, with a label underneath that fades with zoom (entities) or
 * stays put (folder hubs — the navigation anchors).
 *
 * Perf contract: this component is memoized on `data` identity + `selected`
 * only. While the force simulation streams positions every frame, React Flow
 * moves the node wrapper via transform and this component never re-renders.
 */
function GraphNodeCardInner({ data, selected }: NodeProps<GraphNodeCardNode>) {
  const accent = getNodeVisualAccent(data);
  const diameter = getNodeDiameter(
    data.degree ?? 0,
    data.isFolderHub,
    data.isCampaignCenter,
    data.nodeSizeMultiplier ?? 1,
  );
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
      title={graphNodeTooltip(data)}
    >
      <Handle type="target" position={Position.Top} className={HIDDEN_HANDLE} />

      <div
        className={cn(
          "relative flex items-center justify-center",
          data.isCampaignCenter
            ? "graph-campaign-center size-full"
            : data.isFolderHub
              ? "graph-folder-hub size-full"
              : "graph-dot size-full",
          data.entering && "graph-node-enter",
          !data.isFolderHub &&
            !data.isCampaignCenter &&
            selected &&
            "graph-dot-selected",
          data.highlighted && "graph-node-active",
          data.isFolderHub && selected && "graph-folder-hub-selected",
          data.isCampaignCenter && selected && "graph-campaign-center-selected",
        )}
        style={
          {
            width: diameter,
            height: diameter,
            backgroundColor: data.isCampaignCenter
              ? `color-mix(in oklch, ${accent} 18%, var(--card))`
              : data.isFolderHub
                ? `color-mix(in oklch, ${accent} 14%, var(--card))`
                : `color-mix(in oklch, ${accent} 30%, var(--card))`,
            borderColor: data.isCampaignCenter
              ? `color-mix(in oklch, ${accent} 75%, transparent)`
              : data.isFolderHub
                ? `color-mix(in oklch, ${accent} 65%, transparent)`
                : `color-mix(in oklch, ${accent} 85%, transparent)`,
            "--node-accent": accent,
          } as React.CSSProperties
        }
      >
        {data.isCampaignCenter ? (
          <Target
            className="size-[38%] shrink-0"
            style={{ color: accent }}
            aria-hidden
          />
        ) : data.isFolderHub ? (
          <Folder
            className="size-[42%] shrink-0"
            style={{ color: accent }}
            aria-hidden
          />
        ) : null}
      </div>

      <span
        className={cn(
          "graph-node-label pointer-events-none absolute left-1/2 top-[calc(100%+6px)] -translate-x-1/2 text-center font-medium leading-tight",
          data.isCampaignCenter
            ? "graph-center-label max-w-[200px] text-[11px] font-semibold"
            : data.isFolderHub
              ? "graph-hub-label max-w-[170px] text-[12px] font-semibold"
              : "graph-entity-label max-w-[132px] truncate text-[10.5px]",
          selected || data.highlighted
            ? "is-emphasized text-foreground"
            : "text-muted-foreground",
          data.focusLevel === "background" && "!opacity-0",
        )}
      >
        {data.isCampaignCenter ? (
          <span className="inline-flex flex-col items-center gap-0.5">
            <span>{data.title}</span>
            {data.electionCountdown ? (
              <span className="text-[0.65rem] font-medium text-brand-blue">
                {data.electionCountdown}
              </span>
            ) : null}
            {data.summary ? (
              <span className="text-[0.62rem] font-normal text-muted-foreground/80">
                {data.summary.split(" · ")[1] ?? data.summary}
              </span>
            ) : null}
          </span>
        ) : data.isFolderHub ? (
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

/**
 * Memo comparator intentionally ignores `positionAbsoluteX/Y`, `zIndex`, and
 * `dragging` — none affect this component's output, and skipping them means
 * zero node re-renders while the simulation streams positions every frame.
 */
export const GraphNodeCard = memo(
  GraphNodeCardInner,
  (prev, next) =>
    prev.data === next.data &&
    prev.selected === next.selected &&
    (prev.data.nodeSizeMultiplier ?? 1) === (next.data.nodeSizeMultiplier ?? 1),
);
