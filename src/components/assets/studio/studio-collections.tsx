"use client";

import * as React from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { DbAsset } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { BrandKitCard } from "./brand-kit-card";
import {
  ASSET_COLLECTIONS,
  countForCollection,
  getCollection,
  type CollectionId,
} from "./collections";

type CollectionsNavProps = {
  assets: DbAsset[];
  activeCollection: CollectionId;
  onSelect: (id: CollectionId) => void;
  onCreate: () => void;
};

export function CollectionsNav({
  assets,
  activeCollection,
  onSelect,
  onCreate,
}: CollectionsNavProps) {
  return (
    <>
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

      <nav className="flex flex-col gap-0.5" aria-label="Asset collections">
        {ASSET_COLLECTIONS.map((collection) => {
          const Icon = collection.icon;
          const count = countForCollection(collection, assets);
          const isActive = collection.id === activeCollection;
          return (
            <button
              key={collection.id}
              type="button"
              onClick={() => onSelect(collection.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-[background-color,color,transform] duration-150",
                isActive
                  ? "bg-background font-medium text-foreground shadow-sm ring-1 ring-border/70"
                  : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{collection.label}</span>
              <span
                className={cn(
                  "shrink-0 text-[0.7rem] tabular-nums",
                  isActive ? "text-foreground" : "text-muted-foreground",
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
    </>
  );
}

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
    <aside className="hidden w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border/70 bg-muted/15 p-3 lg:flex">
      <CollectionsNav
        assets={assets}
        activeCollection={activeCollection}
        onSelect={onSelect}
        onCreate={onCreate}
      />
    </aside>
  );
}

type MobileCollectionPickerProps = {
  assets: DbAsset[];
  activeCollection: CollectionId;
  onSelect: (id: CollectionId) => void;
  onCreate: () => void;
};

export function MobileCollectionPicker({
  assets,
  activeCollection,
  onSelect,
  onCreate,
}: MobileCollectionPickerProps) {
  const [open, setOpen] = React.useState(false);
  const active = getCollection(activeCollection);
  const ActiveIcon = active.icon;
  const count = countForCollection(active, assets);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-9 items-center gap-2 rounded-lg border border-border bg-card/70 px-2.5 text-sm transition-colors hover:bg-accent lg:hidden"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <ActiveIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 truncate font-medium">{active.label}</span>
        <span className="shrink-0 rounded-full bg-muted px-1.5 text-[0.7rem] tabular-nums text-muted-foreground">
          {count}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[18rem] gap-3 p-3 sm:max-w-xs">
          <SheetHeader className="sr-only">
            <SheetTitle>Asset collections</SheetTitle>
            <SheetDescription>
              Filter assets by collection type and status.
            </SheetDescription>
          </SheetHeader>
          <CollectionsNav
            assets={assets}
            activeCollection={activeCollection}
            onCreate={() => {
              onCreate();
              setOpen(false);
            }}
            onSelect={(id) => {
              onSelect(id);
              setOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
