"use client";

import { Columns3, LayoutGrid, List, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type AssetView = "gallery" | "board" | "list";

const VIEWS: Array<{ id: AssetView; label: string; icon: LucideIcon }> = [
  { id: "gallery", label: "Gallery", icon: LayoutGrid },
  { id: "board", label: "Board", icon: Columns3 },
  { id: "list", label: "List", icon: List },
];

type ViewSwitcherProps = {
  view: AssetView;
  onChange: (view: AssetView) => void;
};

export function ViewSwitcher({ view, onChange }: ViewSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="Asset view"
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5"
    >
      {VIEWS.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === view;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              isActive
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
