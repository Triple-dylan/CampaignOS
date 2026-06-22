import { cn } from "@/lib/utils";
import {
  GRAPH_NODE_TYPE_LABELS,
  GRAPH_NODE_TYPE_STYLES,
} from "@/lib/graph/node-styles";
import type { GraphNodeType } from "@/lib/validators/enums";

export function GraphNodeTypeBadge({
  nodeType,
  className,
}: {
  nodeType: GraphNodeType;
  className?: string;
}) {
  const styles = GRAPH_NODE_TYPE_STYLES[nodeType];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        styles.badge,
        className,
      )}
    >
      {GRAPH_NODE_TYPE_LABELS[nodeType]}
    </span>
  );
}
