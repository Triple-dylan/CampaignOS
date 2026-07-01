"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Sparkles, WandSparkles } from "lucide-react";
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
import type { SocialAssetTemplate } from "@/lib/assets/social-templates";
import {
  ASSET_TYPE_LABELS,
  defaultChannelForAssetType,
  type M7AssetType,
} from "@/lib/validators/assets";
import { cn } from "@/lib/utils";

const GENERATE_COLLECTIONS: Array<{ value: M7AssetType; label: string }> = [
  { value: "social_post", label: "Social" },
  { value: "flyer", label: "Print" },
  { value: "email", label: "Email" },
];

const TONE_PRESETS = [
  "Confident",
  "Optimistic",
  "Urgent",
  "Warm",
  "Authoritative",
];

type GenerateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: SocialAssetTemplate | null;
  openAiConfigured: boolean;
  onGenerated: (assetId: string) => void;
};

export function GenerateDialog({
  open,
  onOpenChange,
  template,
  openAiConfigured,
  onGenerated,
}: GenerateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WandSparkles className="size-4 text-primary" />
            Generate asset
          </DialogTitle>
          <DialogDescription>
            {template
              ? `Draft copy for the ${template.label} format using your Campaign Brain context.`
              : "Draft copy for a collection using your Campaign Brain context."}
          </DialogDescription>
        </DialogHeader>

        {/* Remount per template so the form re-initializes without effects. */}
        <GenerateForm
          key={template?.id ?? "blank"}
          template={template}
          openAiConfigured={openAiConfigured}
          onGenerated={onGenerated}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function GenerateForm({
  template,
  openAiConfigured,
  onGenerated,
  onClose,
}: {
  template: SocialAssetTemplate | null;
  openAiConfigured: boolean;
  onGenerated: (assetId: string) => void;
  onClose: () => void;
}) {
  const [assetType, setAssetType] = useState<M7AssetType>(
    (template?.assetType as M7AssetType) ?? "social_post",
  );
  const [theme, setTheme] = useState("");
  const [issue, setIssue] = useState("");
  const [tone, setTone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const channel = useMemo(
    () => template?.channel ?? defaultChannelForAssetType(assetType),
    [template, assetType],
  );

  function combinedTheme(): string | undefined {
    const base = theme.trim();
    const toneValue = tone.trim();
    if (!base && !toneValue) return undefined;
    const combined = toneValue ? `${base} (${toneValue} tone)`.trim() : base;
    return combined.slice(0, 100);
  }

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const themeValue = combinedTheme();
      const issueValue = issue.trim() || undefined;

      if (openAiConfigured) {
        const result = await generateAsset({
          assetType,
          theme: themeValue,
          issue: issueValue,
          channel,
          templateId: template?.id,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        onGenerated(result.assetId);
        return;
      }

      // No AI configured — still deliver a usable draft using the manual action
      // so the generation flow always produces something to preview/export.
      const label = ASSET_TYPE_LABELS[assetType];
      const result = await createAssetManual({
        assetType,
        title: themeValue ? `${label}: ${themeValue}` : `${label} draft`,
        contentText: scaffoldBody({
          label,
          theme: themeValue,
          issue: issueValue,
          template,
        }),
        theme: themeValue,
        issue: issueValue,
        channel,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onGenerated(result.assetId);
    });
  }

  return (
    <>
      <div className="space-y-4">
        {template ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="size-12 shrink-0 rounded-md bg-gradient-to-br from-primary/70 to-primary" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{template.label}</p>
              <p className="text-xs text-muted-foreground">
                {template.platform} · {template.dimensions} ·{" "}
                <span className="capitalize">{template.provider}</span>
              </p>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="generate-collection">Collection</Label>
          <Select
            id="generate-collection"
            value={assetType}
            onChange={(event) => setAssetType(event.target.value as M7AssetType)}
          >
            {GENERATE_COLLECTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="generate-theme">Theme</Label>
            <Input
              id="generate-theme"
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
              placeholder="Accountability"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="generate-issue">Issue</Label>
            <Input
              id="generate-issue"
              value={issue}
              onChange={(event) => setIssue(event.target.value)}
              placeholder="Housing"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="generate-tone">Tone</Label>
          <div className="flex flex-wrap gap-1.5">
            {TONE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() =>
                  setTone((current) => (current === preset ? "" : preset))
                }
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  tone === preset
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {!openAiConfigured ? (
          <p className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
            OpenAI is not configured. Generation will create an editable starter
            draft instead of AI copy — add OPENAI_API_KEY to enable full
            generation.
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="button" onClick={handleGenerate} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 data-icon="inline-start" className="size-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles data-icon="inline-start" className="size-3.5" />
              Generate
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

function scaffoldBody({
  label,
  theme,
  issue,
  template,
}: {
  label: string;
  theme?: string;
  issue?: string;
  template: SocialAssetTemplate | null;
}): string {
  const lines = [
    `${label} draft${theme ? ` — ${theme}` : ""}`,
    "",
    issue ? `Issue focus: ${issue}` : "Issue focus: [add issue]",
    template ? `Format: ${template.label} (${template.dimensions})` : "",
    "",
    "Headline: [write a sharp, benefit-led headline]",
    "Body: [2-3 sentences in the campaign voice]",
    "Call to action: [what should the voter do next?]",
  ];
  return lines.filter(Boolean).join("\n");
}
