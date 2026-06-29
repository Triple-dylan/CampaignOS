"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Network,
} from "lucide-react";
import {
  AssetStatusBadge,
  ComplianceStatusBadge,
} from "@/components/assets/asset-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { DbAsset } from "@/lib/db/schema";
import {
  type AssetStatus,
  type ComplianceReviewStatus,
} from "@/lib/validators/assets";
import { formatAssetType, formatDateTime } from "./collections";

type AssetDetailSheetProps = {
  asset: DbAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canApprove: boolean;
  isPending: boolean;
  actionError: string | null;
  onSave: (input: { title: string; contentText: string }) => void;
  onSubmit: () => void;
  onApprove: () => void;
  onReject: () => void;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
  );
}

export function AssetDetailSheet({
  asset,
  open,
  onOpenChange,
  canApprove,
  isPending,
  actionError,
  onSave,
  onSubmit,
  onApprove,
  onReject,
}: AssetDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-xl">
        {asset ? (
          // Remount per asset so edit fields re-initialize without effects.
          <AssetDetailBody
            key={asset.id}
            asset={asset}
            canApprove={canApprove}
            isPending={isPending}
            actionError={actionError}
            onSave={onSave}
            onSubmit={onSubmit}
            onApprove={onApprove}
            onReject={onReject}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function AssetDetailBody({
  asset,
  canApprove,
  isPending,
  actionError,
  onSave,
  onSubmit,
  onApprove,
  onReject,
}: {
  asset: DbAsset;
  canApprove: boolean;
  isPending: boolean;
  actionError: string | null;
  onSave: (input: { title: string; contentText: string }) => void;
  onSubmit: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [editTitle, setEditTitle] = useState(asset.title);
  const [editContent, setEditContent] = useState(asset.content_text ?? "");
  const [copied, setCopied] = useState(false);

  const editable = asset.status === "draft" || asset.status === "needs_review";

  async function handleCopy() {
    if (!asset.content_text) return;
    try {
      await navigator.clipboard.writeText(asset.content_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function handleDownload() {
    const blob = new Blob([asset.content_text ?? ""], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${asset.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "asset"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <SheetHeader className="border-b border-border p-4 pr-12">
        <div className="flex flex-wrap items-center gap-1.5">
          <AssetStatusBadge status={asset.status as AssetStatus} />
          <ComplianceStatusBadge
            status={asset.compliance_status as ComplianceReviewStatus}
          />
          {asset.ai_generated ? (
            <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900 dark:bg-violet-950 dark:text-violet-200">
              AI generated
            </span>
          ) : null}
        </div>
        <SheetTitle className="mt-1 text-lg">{asset.title}</SheetTitle>
        <SheetDescription className="capitalize">
          {formatAssetType(asset.asset_type)} · Updated{" "}
          {formatDateTime(asset.updated_at)}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {editable ? (
          <div className="space-y-2">
            <Label htmlFor="detail-title">Title</Label>
            <Input
              id="detail-title"
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <SectionLabel>Copy</SectionLabel>
          {editable ? (
            <textarea
              id="detail-content"
              className="flex min-h-56 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-relaxed shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={editContent}
              onChange={(event) => setEditContent(event.target.value)}
            />
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="whitespace-pre-line text-sm leading-relaxed">
                {asset.content_text?.trim() || "No content"}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <SectionLabel>Campaign context</SectionLabel>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <ContextItem label="Theme" value={asset.theme} />
            <ContextItem label="Issue" value={asset.issue} />
            <ContextItem label="Channel" value={asset.channel} />
          </dl>
        </div>

        {asset.description ? (
          <div className="space-y-2">
            <SectionLabel>Notes</SectionLabel>
            <p className="text-sm text-muted-foreground">{asset.description}</p>
          </div>
        ) : null}

        <div className="space-y-2">
          <SectionLabel>Linked graph nodes</SectionLabel>
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
            <Network className="size-4 shrink-0" aria-hidden />
            <span>
              Connected to the Campaign Brain graph. Inline node previews arrive
              with the graph-linking phase.
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <SectionLabel>History</SectionLabel>
          <dl className="space-y-1.5 text-sm">
            <HistoryRow label="Created" value={formatDateTime(asset.created_at)} />
            <HistoryRow
              label="Last updated"
              value={formatDateTime(asset.updated_at)}
            />
            {asset.approved_at ? (
              <HistoryRow
                label="Approved"
                value={formatDateTime(asset.approved_at)}
              />
            ) : null}
            {asset.template_used ? (
              <HistoryRow label="Template" value={asset.template_used} />
            ) : null}
          </dl>
        </div>

        <div className="space-y-2">
          <SectionLabel>Export</SectionLabel>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCopy}
              disabled={!asset.content_text}
            >
              {copied ? (
                <Check data-icon="inline-start" className="size-3.5" />
              ) : (
                <Copy data-icon="inline-start" className="size-3.5" />
              )}
              {copied ? "Copied" : "Copy text"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDownload}
              disabled={!asset.content_text}
            >
              <Download data-icon="inline-start" className="size-3.5" />
              Download .txt
            </Button>
            {asset.file_url ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                render={
                  <a href={asset.file_url} target="_blank" rel="noreferrer" />
                }
              >
                <ExternalLink data-icon="inline-start" className="size-3.5" />
                Open file
              </Button>
            ) : null}
          </div>
        </div>

        {actionError ? (
          <p className="text-sm text-destructive" role="alert">
            {actionError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border p-4">
        {editable ? (
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() =>
              onSave({
                title: editTitle.trim(),
                contentText: editContent.trim(),
              })
            }
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Save changes"
            )}
          </Button>
        ) : null}

        {asset.status === "draft" ? (
          <Button type="button" disabled={isPending} onClick={onSubmit}>
            Submit for approval
          </Button>
        ) : null}

        {asset.status === "needs_review" && canApprove ? (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={onReject}
            >
              Reject to draft
            </Button>
            <Button type="button" disabled={isPending} onClick={onApprove}>
              Approve
            </Button>
          </>
        ) : null}
      </div>
    </>
  );
}

function ContextItem({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="capitalize">{value?.trim() || "—"}</dd>
    </div>
  );
}

function HistoryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
