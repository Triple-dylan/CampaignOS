import { cn } from "@/lib/utils";
import {
  GRAPH_NODE_FALLBACK_ACCENT,
  GRAPH_NODE_TYPE_ACCENTS,
  GRAPH_NODE_TYPE_LABELS,
} from "@/lib/graph/node-styles";
import type { GraphNodeType } from "@/lib/validators/enums";

export function GraphNodeTypeBadge({
  nodeType,
  className,
}: {
  nodeType: GraphNodeType;
  className?: string;
}) {
  const accent = GRAPH_NODE_TYPE_ACCENTS[nodeType] ?? GRAPH_NODE_FALLBACK_ACCENT;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        className,
      )}
      style={{
        color: `color-mix(in oklch, ${accent} 80%, var(--foreground))`,
        backgroundColor: `color-mix(in oklch, ${accent} 10%, transparent)`,
        borderColor: `color-mix(in oklch, ${accent} 30%, transparent)`,
      }}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ backgroundColor: accent }}
      />
      {GRAPH_NODE_TYPE_LABELS[nodeType]}
    </span>
  );
}
