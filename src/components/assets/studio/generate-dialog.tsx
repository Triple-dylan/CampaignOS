"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Sparkles, WandSparkles } from "lucide-react";
import { createAssetManual, previewAssetDrafts, saveAssetFromDraft } from "@/actions/assets";
import type { AssetGenerationOutput } from "@/lib/ai/schemas/asset";
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
  const [drafts, setDrafts] = useState<AssetGenerationOutput[] | null>(null);
  const [selectedDraftIndex, setSelectedDraftIndex] = useState(0);
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
    setDrafts(null);
    startTransition(async () => {
      const themeValue = combinedTheme();
      const issueValue = issue.trim() || undefined;

      if (openAiConfigured) {
        const result = await previewAssetDrafts({
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
        setDrafts(result.drafts);
        setSelectedDraftIndex(0);
        return;
      }

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

  function handleSaveSelectedDraft() {
    if (!drafts?.length) return;
    setError(null);
    startTransition(async () => {
      const selected = drafts[selectedDraftIndex];
      if (!selected) return;

      const result = await saveAssetFromDraft({
        draft: selected,
        assetType,
        channel,
        templateId: template?.id,
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

        <div className="space-y-1.5">
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
          <div className="space-y-1.5">
            <Label htmlFor="generate-theme">Theme</Label>
            <Input
              id="generate-theme"
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
              placeholder="Accountability"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="generate-issue">Issue</Label>
            <Input
              id="generate-issue"
              value={issue}
              onChange={(event) => setIssue(event.target.value)}
              placeholder="Housing"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="generate-tone">Tone</Label>
          <div className="flex flex-wrap gap-1.5">
            {TONE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={tone === preset}
                onClick={() =>
                  setTone((current) => (current === preset ? "" : preset))
                }
                className={cn(
                  "h-7 rounded-full border px-2.5 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
                  tone === preset
                    ? "border-primary/50 bg-primary/10 font-medium text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {!openAiConfigured ? (
          <p className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
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

        {drafts?.length ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Choose a draft
            </p>
            <div className="grid gap-2">
              {drafts.map((draft, index) => (
                <button
                  key={`${draft.title}-${index}`}
                  type="button"
                  onClick={() => setSelectedDraftIndex(index)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    selectedDraftIndex === index
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <p className="text-sm font-medium">{draft.title}</p>
                  <p className="mt-1 line-clamp-3 text-xs text-muted-foreground whitespace-pre-wrap">
                    {draft.content}
                  </p>
                </button>
              ))}
            </div>
          </div>
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
        {drafts?.length ? (
          <Button type="button" onClick={handleSaveSelectedDraft} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 data-icon="inline-start" className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save selected draft"
            )}
          </Button>
        ) : (
          <Button type="button" onClick={handleGenerate} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 data-icon="inline-start" className="size-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles data-icon="inline-start" className="size-3.5" />
                Generate drafts
              </>
            )}
          </Button>
        )}
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
