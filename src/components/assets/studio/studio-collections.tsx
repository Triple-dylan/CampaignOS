"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DbAsset } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { BrandKitCard } from "./brand-kit-card";
import {
  ASSET_COLLECTIONS,
  countForCollection,
  type CollectionId,
} from "./collections";

type StudioCollectionsProps = {
  assets: DbAsset[];
  activeCollection: CollectionId;
  onSelect: (id: CollectionId) => void;
  onCreate: () => void;
};

/**
 * Notion-style folder rail. Each entry is a derived view over existing asset
 * fields (see {@link ASSET_COLLECTIONS}); the brand kit sits at the bottom like
 * a workspace footer.
 */
export function StudioCollections({
  assets,
  activeCollection,
  onSelect,
  onCreate,
}: StudioCollectionsProps) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border p-3 lg:flex">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Collections
        </p>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label="New asset"
          onClick={onCreate}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      <nav className="flex flex-col gap-0.5">
        {ASSET_COLLECTIONS.map((collection) => {
          const Icon = collection.icon;
          const count = countForCollection(collection, assets);
          const isActive = collection.id === activeCollection;
          return (
            <button
              key={collection.id}
              type="button"
              onClick={() => onSelect(collection.id)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "glass-hover flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                isActive
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{collection.label}</span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 text-[0.7rem] tabular-nums",
                  isActive
                    ? "bg-background text-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto">
        <BrandKitCard />
      </div>
    </aside>
  );
}
