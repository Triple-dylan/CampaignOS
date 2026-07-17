"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { FolderOpen, Plus, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  approveAsset,
  rejectAsset,
  submitAssetForApproval,
  updateAssetContent,
} from "@/actions/assets";
import { AssetFormDialog } from "@/components/assets/asset-form-dialog";
import { AssetDetailSheet } from "@/components/assets/studio/asset-detail-sheet";
import { AssetViews } from "@/components/assets/studio/asset-views";
import {
  getCollection,
  type CollectionId,
} from "@/components/assets/studio/collections";
import { ResponsiveActionGroup } from "@/components/layout/responsive-action-group";
import { GenerateDialog } from "@/components/assets/studio/generate-dialog";
import {
  MobileCollectionPicker,
  StudioCollections,
} from "@/components/assets/studio/studio-collections";
import { TemplateGallery } from "@/components/assets/studio/template-gallery";
import {
  ViewSwitcher,
  type AssetView,
} from "@/components/assets/studio/view-switcher";
import { Button } from "@/components/ui/button";
import type { SocialAssetTemplate } from "@/lib/assets/social-templates";
import type { DbAsset } from "@/lib/db/schema";

type AssetStudioProps = {
  assets: DbAsset[];
  canApprove: boolean;
  openAiConfigured: boolean;
  /** Deep-link from graph or external URL — opens the matching asset detail. */
  initialAssetId?: string | null;
};

function assetMatchesFilters(
  asset: DbAsset,
  collectionId: CollectionId,
  query: string,
): boolean {
  if (!getCollection(collectionId).matches(asset)) return false;
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return (
    asset.title.toLowerCase().includes(normalized) ||
    (asset.content_text ?? "").toLowerCase().includes(normalized)
  );
}

/** Keep selection only when the asset is still on the active collection page. */
function selectionForFilters(
  selectedId: string | null,
  assets: DbAsset[],
  collectionId: CollectionId,
  query: string,
): string | null {
  if (!selectedId) return null;
  const asset = assets.find((item) => item.id === selectedId);
  // Not loaded yet (e.g. just generated) — keep the optimistic selection.
  if (!asset) return selectedId;
  return assetMatchesFilters(asset, collectionId, query) ? selectedId : null;
}

export function AssetStudio({
  assets,
  canApprove,
  openAiConfigured,
  initialAssetId = null,
}: AssetStudioProps) {
  const router = useRouter();
  const [collection, setCollection] = useState<CollectionId>("all");
  const [view, setView] = useState<AssetView>("gallery");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialAssetId ?? null,
  );
  const [seenInitialAssetId, setSeenInitialAssetId] = useState(initialAssetId);
  const [createOpen, setCreateOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateTemplate, setGenerateTemplate] =
    useState<SocialAssetTemplate | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const mainScrollRef = useRef<HTMLElement>(null);

  // Accept deep-link changes during render (no effect / remount needed).
  if (initialAssetId !== seenInitialAssetId) {
    setSeenInitialAssetId(initialAssetId);
    if (initialAssetId) {
      setSelectedId(initialAssetId);
      setActionError(null);
    }
  }

  const activeCollection = getCollection(collection);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) =>
      assetMatchesFilters(asset, collection, query),
    );
  }, [assets, collection, query]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedId) ?? null,
    [assets, selectedId],
  );

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  function runAction(
    action: () => Promise<{ ok: boolean; error?: string }>,
  ) {
    setActionError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setActionError(result.error ?? "Action failed");
        return;
      }
      refresh();
    });
  }

  function handleSelectCollection(next: CollectionId) {
    if (next === collection) return;
    setCollection(next);
    setActionError(null);
    setSelectedId((current) =>
      selectionForFilters(current, assets, next, query),
    );
    // Scroll the content pane to the top so the new label reads like a page.
    requestAnimationFrame(() => {
      mainScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function handleQueryChange(next: string) {
    setQuery(next);
    setSelectedId((current) =>
      selectionForFilters(current, assets, collection, next),
    );
  }

  function handleUseTemplate(template: SocialAssetTemplate) {
    setGenerateTemplate(template);
    setGenerateOpen(true);
  }

  function handleGenerated(assetId: string) {
    setGenerateOpen(false);
    setGenerateTemplate(null);
    // selectedAsset is derived from `assets`; once refresh lands the new asset,
    // the detail sheet opens automatically.
    setSelectedId(assetId);
    refresh();
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <StudioCollections
        assets={assets}
        activeCollection={collection}
        onSelect={handleSelectCollection}
        onCreate={() => setCreateOpen(true)}
      />

      <main
        ref={mainScrollRef}
        className="flex min-w-0 flex-1 flex-col overflow-y-auto"
      >
        <div className="flex flex-col gap-5 p-3 md:p-5">
          <TemplateGallery onUseTemplate={handleUseTemplate} />

          <div className="sticky top-0 z-10 -mx-3 border-b border-border/60 bg-background/85 px-3 py-3 backdrop-blur-md md:-mx-5 md:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 flex-col gap-2">
                <MobileCollectionPicker
                  assets={assets}
                  activeCollection={collection}
                  onSelect={handleSelectCollection}
                  onCreate={() => setCreateOpen(true)}
                />
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold tracking-tight">
                    {activeCollection.label}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {activeCollection.description}
                    <span className="mx-1.5 text-border">·</span>
                    {filteredAssets.length} asset
                    {filteredAssets.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="relative w-full sm:w-auto">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => handleQueryChange(event.target.value)}
                    placeholder="Search assets"
                    className="h-9 w-full rounded-lg border border-input bg-background pr-3 pl-8 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 sm:w-48"
                  />
                </div>
                <ViewSwitcher view={view} onChange={setView} />
                <ResponsiveActionGroup
                  primary={
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus data-icon="inline-start" className="size-3.5" />
                      New Content
                    </Button>
                  }
                  overflow={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setGenerateTemplate(null);
                        setGenerateOpen(true);
                      }}
                    >
                      <Sparkles data-icon="inline-start" className="size-3.5" />
                      Generate
                    </Button>
                  }
                  overflowLabel="Asset actions"
                />
              </div>
            </div>
          </div>

          <div key={`${collection}:${view}`} className="motion-fade">
            {filteredAssets.length === 0 ? (
              <div className="flex flex-col items-center gap-3 border-y border-dashed border-border py-16 text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-muted">
                  <FolderOpen
                    className="size-5 text-muted-foreground"
                    aria-hidden
                  />
                </span>
                <div className="max-w-sm">
                  <p className="text-sm font-medium">No assets here yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Start from a template above, generate with AI, or create one
                    manually.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setGenerateTemplate(null);
                      setGenerateOpen(true);
                    }}
                  >
                    <Sparkles data-icon="inline-start" className="size-3.5" />
                    Generate
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setCreateOpen(true)}
                  >
                    <Plus data-icon="inline-start" className="size-3.5" />
                    New Content
                  </Button>
                </div>
              </div>
            ) : (
              <AssetViews
                view={view}
                assets={filteredAssets}
                selectedId={selectedId}
                onSelect={(asset) => {
                  setActionError(null);
                  setSelectedId(asset.id);
                }}
              />
            )}
          </div>
        </div>
      </main>

      <AssetDetailSheet
        asset={selectedAsset}
        open={Boolean(selectedAsset)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
            setActionError(null);
          }
        }}
        canApprove={canApprove}
        isPending={isPending}
        actionError={actionError}
        onSave={({ title, contentText, expectedVersion }) => {
          if (!selectedAsset) return;
          runAction(async () =>
            updateAssetContent({
              assetId: selectedAsset.id,
              title,
              contentText,
              expectedVersion,
            }),
          );
        }}
        onSubmit={() => {
          if (!selectedAsset) return;
          runAction(async () => submitAssetForApproval(selectedAsset.id));
        }}
        onApprove={() => {
          if (!selectedAsset) return;
          runAction(async () => approveAsset(selectedAsset.id));
        }}
        onReject={() => {
          if (!selectedAsset) return;
          runAction(async () => rejectAsset(selectedAsset.id));
        }}
      />

      <AssetFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        openAiConfigured={openAiConfigured}
        onSuccess={refresh}
      />

      <GenerateDialog
        open={generateOpen}
        onOpenChange={(open) => {
          setGenerateOpen(open);
          if (!open) setGenerateTemplate(null);
        }}
        template={generateTemplate}
        openAiConfigured={openAiConfigured}
        onGenerated={handleGenerated}
      />
    </div>
  );
}
