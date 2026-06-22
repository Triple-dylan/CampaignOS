"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { GRAPH_NODE_TYPE_LABELS } from "@/lib/graph/node-styles";
import type { GraphNodeType } from "@/lib/validators/enums";

type GraphFiltersProps = {
  availableTypes: GraphNodeType[];
  selectedTypes: Set<GraphNodeType>;
  onToggleType: (type: GraphNodeType) => void;
  onSelectAllTypes: () => void;
  onClearTypes: () => void;
  showEdges: boolean;
  onShowEdgesChange: (show: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  visibleNodeCount: number;
  totalNodeCount: number;
};

export function GraphFilters({
  availableTypes,
  selectedTypes,
  onToggleType,
  onSelectAllTypes,
  onClearTypes,
  showEdges,
  onShowEdgesChange,
  searchQuery,
  onSearchQueryChange,
  visibleNodeCount,
  totalNodeCount,
}: GraphFiltersProps) {
  const allSelected = selectedTypes.size === availableTypes.length;

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Filters</p>
          <p className="text-xs text-muted-foreground">
            Showing {visibleNodeCount} of {totalNodeCount} nodes
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search by title…"
            className="pl-8"
            aria-label="Search graph nodes by title"
          />
          {searchQuery ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-1 top-1/2 -translate-y-1/2"
              onClick={() => onSearchQueryChange("")}
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={allSelected ? "default" : "outline"}
          size="sm"
          onClick={onSelectAllTypes}
        >
          All types
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onClearTypes}>
          Clear
        </Button>
        <Button
          type="button"
          variant={showEdges ? "default" : "outline"}
          size="sm"
          onClick={() => onShowEdgesChange(!showEdges)}
        >
          {showEdges ? "Hide edges" : "Show edges"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {availableTypes.map((type) => {
          const active = selectedTypes.has(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => onToggleType(type)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
              )}
            >
              {GRAPH_NODE_TYPE_LABELS[type]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
