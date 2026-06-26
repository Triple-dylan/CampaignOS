"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { createAssetManual, generateAsset } from "@/actions/assets";
import { Button } from "@/components/ui/button";
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
  ASSET_TYPE_LABELS,
  M7_ASSET_TYPES,
  defaultChannelForAssetType,
  type M7AssetType,
} from "@/lib/validators/assets";
import { TOP_ISSUE_PRESETS } from "@/lib/validators/onboarding";

type AssetFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openAiConfigured: boolean;
  onSuccess?: () => void;
};

export function AssetFormDialog({
  open,
  onOpenChange,
  openAiConfigured,
  onSuccess,
}: AssetFormDialogProps) {
  const [mode, setMode] = useState<"manual" | "ai">("manual");
  const [assetType, setAssetType] = useState<M7AssetType>("social_post");
  const [title, setTitle] = useState("");
  const [contentText, setContentText] = useState("");
  const [theme, setTheme] = useState("");
  const [issue, setIssue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setTitle("");
    setContentText("");
    setTheme("");
    setIssue("");
    setError(null);
    setMode("manual");
    setAssetType("social_post");
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      resetForm();
    }
    onOpenChange(next);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      if (mode === "ai") {
        const result = await generateAsset({
          assetType,
          theme: theme.trim() || undefined,
          issue: issue.trim() || undefined,
          channel: defaultChannelForAssetType(assetType),
        });

        if (!result.ok) {
          setError(result.error);
          return;
        }
      } else {
        const result = await createAssetManual({
          assetType,
          title: title.trim(),
          contentText: contentText.trim(),
          theme: theme.trim() || undefined,
          issue: issue.trim() || undefined,
          channel: defaultChannelForAssetType(assetType),
        });

        if (!result.ok) {
          setError(result.error);
          return;
        }
      }

      handleOpenChange(false);
      onSuccess?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create asset</DialogTitle>
          <DialogDescription>
            Draft campaign content manually or generate a first pass with AI
            using your Campaign Brain context.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "manual" ? "default" : "outline"}
              onClick={() => setMode("manual")}
            >
              Manual
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "ai" ? "default" : "outline"}
              disabled={!openAiConfigured}
              onClick={() => setMode("ai")}
            >
              <Sparkles data-icon="inline-start" className="size-3.5" />
              AI generate
            </Button>
          </div>

          {!openAiConfigured && mode === "ai" ? (
            <p className="text-sm text-muted-foreground">
              OpenAI is not configured. Add OPENAI_API_KEY to enable AI
              generation, or switch to manual create.
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="asset-type">Asset type</Label>
            <Select
              id="asset-type"
              value={assetType}
              onChange={(event) =>
                setAssetType(event.target.value as M7AssetType)
              }
            >
              {M7_ASSET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ASSET_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </div>

          {mode === "manual" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="asset-title">Title</Label>
                <Input
                  id="asset-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Housing week social post"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset-content">Content</Label>
                <textarea
                  id="asset-content"
                  className="flex min-h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={contentText}
                  onChange={(event) => setContentText(event.target.value)}
                  placeholder="Write the full asset body…"
                  required
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              AI will draft a {ASSET_TYPE_LABELS[assetType].toLowerCase()} using
              your campaign profile and message framework. You can edit the
              result before submitting for approval.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="asset-theme">Theme (optional)</Label>
              <Input
                id="asset-theme"
                value={theme}
                onChange={(event) => setTheme(event.target.value)}
                placeholder="Community leadership"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-issue">Issue (optional)</Label>
              <Select
                id="asset-issue"
                value={issue}
                onChange={(event) => setIssue(event.target.value)}
              >
                <option value="">None</option>
                {TOP_ISSUE_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isPending ||
                (mode === "ai" && !openAiConfigured) ||
                (mode === "manual" && (!title.trim() || !contentText.trim()))
              }
            >
              {isPending ? (
                <>
                  <Loader2
                    data-icon="inline-start"
                    className="size-4 animate-spin"
                  />
                  {mode === "ai" ? "Generating…" : "Creating…"}
                </>
              ) : mode === "ai" ? (
                "Generate asset"
              ) : (
                "Create asset"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
