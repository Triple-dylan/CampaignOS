"use client";

import {
  FileText,
  Image as ImageIcon,
  Mail,
  Printer,
} from "lucide-react";
import {
  AssetStatusBadge,
  ComplianceStatusBadge,
} from "@/components/assets/asset-badges";
import type { DbAsset } from "@/lib/db/schema";
import {
  ASSET_STATUS_LABELS,
  ASSET_WORKFLOW_STATUSES,
  type AssetStatus,
  type ComplianceReviewStatus,
} from "@/lib/validators/assets";
import { cn } from "@/lib/utils";
import { formatAssetType, formatDate } from "./collections";
import type { AssetView } from "./view-switcher";

function AssetTypeIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  switch (type) {
    case "email":
    case "fundraising_email":
      return <Mail className={className} aria-hidden />;
    case "flyer":
      return <Printer className={className} aria-hidden />;
    case "social_post":
    case "event_graphic":
      return <ImageIcon className={className} aria-hidden />;
    default:
      return <FileText className={className} aria-hidden />;
  }
}

type AssetViewsProps = {
  view: AssetView;
  assets: DbAsset[];
  selectedId: string | null;
  onSelect: (asset: DbAsset) => void;
};

export function AssetViews({
  view,
  assets,
  selectedId,
  onSelect,
}: AssetViewsProps) {
  if (view === "list") {
    return <ListView assets={assets} selectedId={selectedId} onSelect={onSelect} />;
  }
  if (view === "board") {
    return <BoardView assets={assets} selectedId={selectedId} onSelect={onSelect} />;
  }
  return <GalleryView assets={assets} selectedId={selectedId} onSelect={onSelect} />;
}

function AssetThumb({ asset }: { asset: DbAsset }) {
  return (
    <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-muted to-muted/40">
      <span className="flex size-9 items-center justify-center rounded-lg bg-background/70 text-muted-foreground shadow-sm">
        <AssetTypeIcon type={asset.asset_type} className="size-4" />
      </span>
    </div>
  );
}

function GalleryView({
  assets,
  selectedId,
  onSelect,
}: Omit<AssetViewsProps, "view">) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {assets.map((asset) => (
        <button
          key={asset.id}
          type="button"
          onClick={() => onSelect(asset)}
          className={cn(
            "group/asset flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-shadow hover:shadow-md",
            selectedId === asset.id && "ring-2 ring-ring",
          )}
        >
          <AssetThumb asset={asset} />
          <div className="flex flex-1 flex-col gap-2 p-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 text-sm font-medium leading-snug">
                {asset.title}
              </h3>
              <AssetStatusBadge status={asset.status as AssetStatus} />
            </div>
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {asset.content_text?.trim() || "No content yet"}
            </p>
            <div className="mt-auto flex items-center justify-between gap-2 text-[0.7rem] text-muted-foreground">
              <span className="capitalize">{formatAssetType(asset.asset_type)}</span>
              <span>{formatDate(asset.updated_at)}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function ListView({
  assets,
  selectedId,
  onSelect,
}: Omit<AssetViewsProps, "view">) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="hidden grid-cols-[1fr_8rem_8rem_7rem] gap-3 border-b border-border px-3 py-2 text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase sm:grid">
        <span>Title</span>
        <span>Type</span>
        <span>Status</span>
        <span className="text-right">Updated</span>
      </div>
      <ul>
        {assets.map((asset) => {
          return (
            <li key={asset.id}>
              <button
                type="button"
                onClick={() => onSelect(asset)}
                className={cn(
                  "grid w-full grid-cols-1 gap-1 border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent/60 sm:grid-cols-[1fr_8rem_8rem_7rem] sm:items-center sm:gap-3",
                  selectedId === asset.id && "bg-accent",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <AssetTypeIcon
                    type={asset.asset_type}
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <span className="truncate text-sm font-medium">{asset.title}</span>
                </span>
                <span className="truncate text-xs text-muted-foreground capitalize">
                  {formatAssetType(asset.asset_type)}
                </span>
                <span className="flex gap-1">
                  <AssetStatusBadge status={asset.status as AssetStatus} />
                  <ComplianceStatusBadge
                    status={asset.compliance_status as ComplianceReviewStatus}
                  />
                </span>
                <span className="text-xs text-muted-foreground sm:text-right">
                  {formatDate(asset.updated_at)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const BOARD_COLUMNS = ASSET_WORKFLOW_STATUSES;

function BoardView({
  assets,
  selectedId,
  onSelect,
}: Omit<AssetViewsProps, "view">) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {BOARD_COLUMNS.map((status) => {
        const columnAssets = assets.filter((asset) => asset.status === status);
        return (
          <div
            key={status}
            className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-2"
          >
            <div className="flex items-center justify-between px-1 py-0.5">
              <span className="text-xs font-semibold">
                {ASSET_STATUS_LABELS[status]}
              </span>
              <span className="rounded-full bg-background px-1.5 text-[0.7rem] tabular-nums text-muted-foreground">
                {columnAssets.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {columnAssets.length === 0 ? (
                <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                  Nothing here
                </p>
              ) : (
                columnAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => onSelect(asset)}
                    className={cn(
                      "rounded-lg border border-border bg-card p-2.5 text-left transition-shadow hover:shadow-sm",
                      selectedId === asset.id && "ring-2 ring-ring",
                    )}
                  >
                    <p className="line-clamp-2 text-sm font-medium leading-snug">
                      {asset.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {asset.content_text?.trim() || "No content yet"}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[0.7rem] text-muted-foreground capitalize">
                        {formatAssetType(asset.asset_type)}
                      </span>
                      <ComplianceStatusBadge
                        status={asset.compliance_status as ComplianceReviewStatus}
                      />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
