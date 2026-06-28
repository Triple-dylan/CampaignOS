"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { FolderOpen, Loader2, Plus, WandSparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  approveAsset,
  generateAssetFromTemplate,
  rejectAsset,
  submitAssetForApproval,
  updateAssetContent,
} from "@/actions/assets";
import {
  AssetStatusBadge,
  ComplianceStatusBadge,
} from "@/components/assets/asset-badges";
import { AssetFormDialog } from "@/components/assets/asset-form-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  SOCIAL_ASSET_TEMPLATES,
  type SocialAssetTemplateId,
} from "@/lib/assets/social-templates";
import type { DbAsset } from "@/lib/db/schema";
import {
  ASSET_STATUS_LABELS,
  ASSET_TYPE_LABELS,
  ASSET_WORKFLOW_STATUSES,
  COMPLIANCE_STATUS_LABELS,
  M7_ASSET_TYPES,
  type AssetStatus,
  type AssetType,
  type ComplianceReviewStatus,
  type M7AssetType,
} from "@/lib/validators/assets";

type AssetStudioProps = {
  assets: DbAsset[];
  canApprove: boolean;
  openAiConfigured: boolean;
};

type AssetFilters = {
  assetType: AssetType | "all";
  status: AssetStatus | "all";
  complianceStatus: ComplianceReviewStatus | "all";
};

function isM7AssetType(value: string): value is M7AssetType {
  return M7_ASSET_TYPES.includes(value as M7AssetType);
}

function formatAssetType(value: string): string {
  if (isM7AssetType(value)) {
    return ASSET_TYPE_LABELS[value];
  }
  return value.replace(/_/g, " ");
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AssetStudio({
  assets,
  canApprove,
  openAiConfigured,
}: AssetStudioProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<DbAsset | null>(null);
  const [filters, setFilters] = useState<AssetFilters>({
    assetType: "all",
    status: "all",
    complianceStatus: "all",
  });
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [templateId, setTemplateId] = useState<SocialAssetTemplateId>(
    SOCIAL_ASSET_TEMPLATES[0].id,
  );
  const [templateTheme, setTemplateTheme] = useState("");
  const [templateIssue, setTemplateIssue] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [templateMessage, setTemplateMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedTemplate = useMemo(
    () =>
      SOCIAL_ASSET_TEMPLATES.find((template) => template.id === templateId) ??
      SOCIAL_ASSET_TEMPLATES[0],
    [templateId],
  );

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (
        filters.assetType !== "all" &&
        asset.asset_type !== filters.assetType
      ) {
        return false;
      }
      if (filters.status !== "all" && asset.status !== filters.status) {
        return false;
      }
      if (
        filters.complianceStatus !== "all" &&
        asset.compliance_status !== filters.complianceStatus
      ) {
        return false;
      }
      return true;
    });
  }, [assets, filters]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  function openAssetDetail(asset: DbAsset) {
    setSelectedAsset(asset);
    setEditTitle(asset.title);
    setEditContent(asset.content_text ?? "");
    setActionError(null);
  }

  function closeAssetDetail() {
    setSelectedAsset(null);
    setActionError(null);
  }

  function runAction(action: () => Promise<{ ok: boolean; error?: string }>) {
    setActionError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setActionError(result.error ?? "Action failed");
        return;
      }
      closeAssetDetail();
      refresh();
    });
  }

  function handleGenerateFromTemplate() {
    setTemplateMessage(null);
    startTransition(async () => {
      const result = await generateAssetFromTemplate({
        templateId: selectedTemplate.id,
        provider: selectedTemplate.provider,
        theme: templateTheme.trim() || undefined,
        issue: templateIssue.trim() || undefined,
      });

      if (!result.ok) {
        setTemplateMessage(result.error);
        return;
      }

      refresh();
    });
  }

  const selectedEditable =
    selectedAsset?.status === "draft" ||
    selectedAsset?.status === "needs_review";

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {assets.length} asset{assets.length === 1 ? "" : "s"} in this
            campaign
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus data-icon="inline-start" className="size-4" />
          Create asset
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <WandSparkles className="size-4 text-primary" />
                Generate from template
              </CardTitle>
              <CardDescription>
                Pick a standard social format now; connect Canva or Higgsfield
                to render designs from Campaign Brain context.
              </CardDescription>
            </div>
            <Button variant="outline" render={<Link href="/settings" />}>
              Connect integrations
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.6fr)]">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="template-picker">Template</Label>
              <Select
                id="template-picker"
                value={templateId}
                onChange={(event) =>
                  setTemplateId(event.target.value as SocialAssetTemplateId)
                }
              >
                {SOCIAL_ASSET_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-theme">Theme</Label>
              <Input
                id="template-theme"
                value={templateTheme}
                onChange={(event) => setTemplateTheme(event.target.value)}
                placeholder="Accountability"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-issue">Issue</Label>
              <Input
                id="template-issue"
                value={templateIssue}
                onChange={(event) => setTemplateIssue(event.target.value)}
                placeholder="Housing"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                className="w-full"
                disabled={isPending}
                onClick={handleGenerateFromTemplate}
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Generate"
                )}
              </Button>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="font-medium">{selectedTemplate.label}</p>
            <p className="mt-1 text-muted-foreground">
              {selectedTemplate.description}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs text-muted-foreground">Provider</dt>
                <dd className="capitalize">{selectedTemplate.provider}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Size</dt>
                <dd>{selectedTemplate.dimensions}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Platform</dt>
                <dd>{selectedTemplate.platform}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Channel</dt>
                <dd>{selectedTemplate.channel}</dd>
              </div>
            </dl>
            {templateMessage ? (
              <p className="mt-4 text-sm text-muted-foreground" role="status">
                {templateMessage}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <section className="flex flex-wrap gap-3">
        <FilterSelect
          label="Type"
          value={filters.assetType}
          onChange={(value) =>
            setFilters((current) => ({
              ...current,
              assetType: value as AssetFilters["assetType"],
            }))
          }
          options={[
            { value: "all", label: "All types" },
            ...M7_ASSET_TYPES.map((type) => ({
              value: type,
              label: ASSET_TYPE_LABELS[type],
            })),
          ]}
        />
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(value) =>
            setFilters((current) => ({
              ...current,
              status: value as AssetFilters["status"],
            }))
          }
          options={[
            { value: "all", label: "All statuses" },
            ...ASSET_WORKFLOW_STATUSES.map((status) => ({
              value: status,
              label: ASSET_STATUS_LABELS[status],
            })),
          ]}
        />
        <FilterSelect
          label="Compliance"
          value={filters.complianceStatus}
          onChange={(value) =>
            setFilters((current) => ({
              ...current,
              complianceStatus: value as AssetFilters["complianceStatus"],
            }))
          }
          options={[
            { value: "all", label: "All compliance" },
            ...(
              Object.keys(COMPLIANCE_STATUS_LABELS) as Array<
                keyof typeof COMPLIANCE_STATUS_LABELS
              >
            ).map((status) => ({
              value: status,
              label: COMPLIANCE_STATUS_LABELS[status],
            })),
          ]}
        />
      </section>

      {filteredAssets.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
              <FolderOpen className="size-6 text-muted-foreground" />
            </div>
            <CardTitle>No assets yet</CardTitle>
            <CardDescription>
              Create social posts, flyer copy, and emails manually or with AI.
              Each asset gets a compliance record and graph node automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus data-icon="inline-start" className="size-4" />
              Create your first asset
            </Button>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredAssets.map((asset) => (
            <Card
              key={asset.id}
              className="cursor-pointer transition-colors hover:bg-muted/30"
              onClick={() => openAssetDetail(asset)}
            >
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">
                    {asset.title}
                  </CardTitle>
                  <div className="flex flex-wrap gap-1">
                    <AssetStatusBadge status={asset.status as AssetStatus} />
                    <ComplianceStatusBadge
                      status={asset.compliance_status as ComplianceReviewStatus}
                    />
                  </div>
                </div>
                <CardDescription>
                  {formatAssetType(asset.asset_type)}
                  {asset.ai_generated ? " · AI generated" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="line-clamp-4 whitespace-pre-line text-muted-foreground">
                  {asset.content_text?.trim() || "No content"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Updated {formatDate(asset.updated_at)}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <AssetFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        openAiConfigured={openAiConfigured}
        onSuccess={refresh}
      />

      <Dialog
        open={Boolean(selectedAsset)}
        onOpenChange={(open) => {
          if (!open) closeAssetDetail();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          {selectedAsset ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedAsset.title}</DialogTitle>
                <DialogDescription>
                  {formatAssetType(selectedAsset.asset_type)} · Updated{" "}
                  {formatDate(selectedAsset.updated_at)}
                </DialogDescription>
                <div className="flex flex-wrap gap-2 pt-1">
                  <AssetStatusBadge
                    status={selectedAsset.status as AssetStatus}
                  />
                  <ComplianceStatusBadge
                    status={
                      selectedAsset.compliance_status as ComplianceReviewStatus
                    }
                  />
                  {selectedAsset.ai_generated ? (
                    <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900 dark:bg-violet-950 dark:text-violet-200">
                      AI generated
                    </span>
                  ) : null}
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {selectedEditable ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="edit-title">Title</Label>
                      <Input
                        id="edit-title"
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-content">Content</Label>
                      <textarea
                        id="edit-content"
                        className="flex min-h-48 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        value={editContent}
                        onChange={(event) => setEditContent(event.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="whitespace-pre-line text-sm leading-relaxed">
                      {selectedAsset.content_text?.trim() || "No content"}
                    </p>
                  </div>
                )}

                {(selectedAsset.theme ||
                  selectedAsset.issue ||
                  selectedAsset.channel) && (
                  <dl className="grid gap-2 text-sm sm:grid-cols-3">
                    {selectedAsset.theme ? (
                      <div>
                        <dt className="text-xs text-muted-foreground">Theme</dt>
                        <dd>{selectedAsset.theme}</dd>
                      </div>
                    ) : null}
                    {selectedAsset.issue ? (
                      <div>
                        <dt className="text-xs text-muted-foreground">Issue</dt>
                        <dd>{selectedAsset.issue}</dd>
                      </div>
                    ) : null}
                    {selectedAsset.channel ? (
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Channel
                        </dt>
                        <dd>{selectedAsset.channel}</dd>
                      </div>
                    ) : null}
                  </dl>
                )}

                {actionError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {actionError}
                  </p>
                ) : null}
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:flex-wrap">
                {selectedEditable ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      runAction(async () =>
                        updateAssetContent({
                          assetId: selectedAsset.id,
                          title: editTitle.trim(),
                          contentText: editContent.trim(),
                        }),
                      )
                    }
                  >
                    {isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Save changes"
                    )}
                  </Button>
                ) : null}

                {selectedAsset.status === "draft" ? (
                  <Button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      runAction(async () =>
                        submitAssetForApproval(selectedAsset.id),
                      )
                    }
                  >
                    Submit for approval
                  </Button>
                ) : null}

                {selectedAsset.status === "needs_review" && canApprove ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending}
                      onClick={() =>
                        runAction(async () => rejectAsset(selectedAsset.id))
                      }
                    >
                      Reject to draft
                    </Button>
                    <Button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        runAction(async () => approveAsset(selectedAsset.id))
                      }
                    >
                      Approve
                    </Button>
                  </>
                ) : null}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <select
        className="h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
