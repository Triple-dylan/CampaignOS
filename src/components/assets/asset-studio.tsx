"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
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
  const [createOpen, setCreateOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateTemplate, setGenerateTemplate] =
    useState<SocialAssetTemplate | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeCollection = getCollection(collection);

  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return assets.filter((asset) => {
      if (!activeCollection.matches(asset)) return false;
      if (!normalized) return true;
      return (
        asset.title.toLowerCase().includes(normalized) ||
        (asset.content_text ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [assets, activeCollection, query]);

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
        onSelect={setCollection}
        onCreate={() => setCreateOpen(true)}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col gap-4 p-4 md:p-5">
          <TemplateGallery onUseTemplate={handleUseTemplate} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-col gap-2">
              <MobileCollectionPicker
                assets={assets}
                activeCollection={collection}
                onSelect={setCollection}
                onCreate={() => setCreateOpen(true)}
              />
              <div>
                <h2 className="hidden text-sm font-semibold lg:block">
                  {activeCollection.label}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {filteredAssets.length} asset
                  {filteredAssets.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative w-full sm:w-auto">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search assets"
                  className="h-8 w-full rounded-lg border border-input bg-background/60 pr-2.5 pl-7 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-40"
                />
              </div>
              <ViewSwitcher view={view} onChange={setView} />
              <ResponsiveActionGroup
                primary={
                  <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus data-icon="inline-start" className="size-3.5" />
                    Create
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

          {filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                <FolderOpen className="size-6 text-muted-foreground" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-medium">No assets here yet</p>
                <p className="text-xs text-muted-foreground">
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
                <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus data-icon="inline-start" className="size-3.5" />
                  Create asset
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
        onSave={({ title, contentText }) => {
          if (!selectedAsset) return;
          runAction(async () =>
            updateAssetContent({
              assetId: selectedAsset.id,
              title,
              contentText,
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
