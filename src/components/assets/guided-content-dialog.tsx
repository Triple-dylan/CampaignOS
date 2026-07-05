"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, Loader2, PenLine, Sparkles } from "lucide-react";
import { previewAssetDrafts, saveAssetFromDraft } from "@/actions/assets";
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
import { cn } from "@/lib/utils";
import {
  ASSET_TYPE_LABELS,
  M7_ASSET_TYPES,
  defaultChannelForAssetType,
  type M7AssetType,
} from "@/lib/validators/assets";
import { TOP_ISSUE_PRESETS } from "@/lib/validators/onboarding";

const TEXTAREA_CLASS =
  "flex w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm shadow-xs outline-none backdrop-blur-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const CHANNEL_OPTIONS = [
  { value: "social", label: "Social media" },
  { value: "email", label: "Email" },
  { value: "print", label: "Print / flyer" },
  { value: "sms", label: "SMS / text" },
  { value: "website", label: "Website" },
];

const VARIANT_LABELS = ["Direct & urgent", "Story-driven", "Contrast & proof"];

type DraftOption = AssetGenerationOutput & { id: string; variantLabel: string };

type WizardStep = "brief" | "preview";

type GuidedContentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openAiConfigured: boolean;
  onSaved?: (assetId: string) => void;
};

export function GuidedContentDialog({
  open,
  onOpenChange,
  openAiConfigured,
  onSaved,
}: GuidedContentDialogProps) {
  const [step, setStep] = useState<WizardStep>("brief");
  const [contentNeed, setContentNeed] = useState("");
  const [theme, setTheme] = useState("");
  const [issue, setIssue] = useState("");
  const [audience, setAudience] = useState("");
  const [channel, setChannel] = useState("social");
  const [assetType, setAssetType] = useState<M7AssetType>("social_post");
  const [drafts, setDrafts] = useState<DraftOption[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setStep("brief");
    setContentNeed("");
    setTheme("");
    setIssue("");
    setAudience("");
    setChannel("social");
    setAssetType("social_post");
    setDrafts([]);
    setSelectedDraftId(null);
    setEditedTitle("");
    setEditedContent("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  function handleAssetTypeChange(nextType: M7AssetType) {
    setAssetType(nextType);
    setChannel(defaultChannelForAssetType(nextType));
  }

  function selectDraft(draft: DraftOption) {
    setSelectedDraftId(draft.id);
    setEditedTitle(draft.title);
    setEditedContent(draft.content);
  }

  const canGenerate = contentNeed.trim().length >= 3;
  const canSave =
    Boolean(selectedDraftId) &&
    editedTitle.trim().length > 0 &&
    editedContent.trim().length > 0;

  function handleGenerate(event: React.FormEvent) {
    event.preventDefault();
    if (!canGenerate) return;
    setError(null);

    startTransition(async () => {
      const result = await previewAssetDrafts({
        assetType,
        theme: theme.trim() || undefined,
        issue: issue.trim() || undefined,
        channel: channel.trim() || defaultChannelForAssetType(assetType),
        audience: audience.trim() || undefined,
        contentNeed: contentNeed.trim(),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const mapped = result.drafts.map((draft, index) => ({
        ...draft,
        id: String(index),
        variantLabel: VARIANT_LABELS[index] ?? `Variant ${index + 1}`,
      }));

      setDrafts(mapped);
      if (mapped[0]) {
        selectDraft(mapped[0]);
      }
      setStep("preview");
    });
  }

  function handleSave() {
    if (!canSave || selectedDraftId == null) return;
    setError(null);

    const selected = drafts.find((draft) => draft.id === selectedDraftId);
    if (!selected) return;

    startTransition(async () => {
      const result = await saveAssetFromDraft({
        draft: {
          title: editedTitle.trim(),
          content: editedContent.trim(),
          theme: theme.trim() || selected.theme,
          issue: issue.trim() || selected.issue,
          channel: channel.trim() || selected.channel,
        },
        assetType,
        channel: channel.trim() || defaultChannelForAssetType(assetType),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      handleOpenChange(false);
      onSaved?.(result.assetId);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg border border-border bg-card/70 text-muted-foreground">
              <PenLine className="size-4" aria-hidden />
            </span>
            New content — Content creation
          </DialogTitle>
          <DialogDescription>
            Describe what you need, compare AI draft variants, then save your
            pick to Asset Studio for review and approval.
          </DialogDescription>
        </DialogHeader>

        {step === "brief" ? (
          <form onSubmit={handleGenerate} className="space-y-4">
            {!openAiConfigured ? (
              <p className="text-xs text-muted-foreground">
                OpenAI is not configured — draft generation requires
                OPENAI_API_KEY.
              </p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="content-need">
                What are we creating and where will it run?
              </Label>
              <textarea
                id="content-need"
                className={`${TEXTAREA_CLASS} min-h-20`}
                value={contentNeed}
                onChange={(event) => setContentNeed(event.target.value)}
                placeholder="Instagram post for housing week, email to donors about the town hall…"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="content-theme">Theme</Label>
                <Input
                  id="content-theme"
                  value={theme}
                  onChange={(event) => setTheme(event.target.value)}
                  placeholder="Community leadership"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content-issue">Issue</Label>
                <Select
                  id="content-issue"
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="content-audience">Audience</Label>
                <Input
                  id="content-audience"
                  value={audience}
                  onChange={(event) => setAudience(event.target.value)}
                  placeholder="Suburban renters, small-dollar donors…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content-channel">Channel</Label>
                <Select
                  id="content-channel"
                  value={channel}
                  onChange={(event) => setChannel(event.target.value)}
                >
                  {CHANNEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content-asset-type">Asset type</Label>
              <Select
                id="content-asset-type"
                value={assetType}
                onChange={(event) =>
                  handleAssetTypeChange(event.target.value as M7AssetType)
                }
              >
                {M7_ASSET_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ASSET_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
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
                disabled={isPending || !canGenerate || !openAiConfigured}
              >
                {isPending ? (
                  <>
                    <Loader2
                      data-icon="inline-start"
                      className="size-4 animate-spin"
                    />
                    Generating drafts…
                  </>
                ) : (
                  <>
                    <Sparkles data-icon="inline-start" className="size-3.5" />
                    Generate drafts
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Pick the strongest variant, then edit before saving.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("brief");
                  setError(null);
                }}
                disabled={isPending}
              >
                <ArrowLeft data-icon="inline-start" className="size-3.5" />
                Back
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {drafts.map((draft) => {
                const active = selectedDraftId === draft.id;
                return (
                  <button
                    key={draft.id}
                    type="button"
                    onClick={() => selectDraft(draft)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border bg-card/60 hover:border-foreground/20",
                    )}
                  >
                    <span className="text-xs font-medium text-primary">
                      {draft.variantLabel}
                    </span>
                    <span className="line-clamp-2 text-sm font-medium">
                      {draft.title}
                    </span>
                    <span className="line-clamp-4 text-xs text-muted-foreground">
                      {draft.content}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Edit selected draft
              </p>
              <div className="space-y-2">
                <Label htmlFor="draft-title">Title</Label>
                <Input
                  id="draft-title"
                  value={editedTitle}
                  onChange={(event) => setEditedTitle(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="draft-content">Content</Label>
                <textarea
                  id="draft-content"
                  className={`${TEXTAREA_CLASS} min-h-40 font-mono text-xs`}
                  value={editedContent}
                  onChange={(event) => setEditedContent(event.target.value)}
                />
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
                type="button"
                onClick={handleSave}
                disabled={isPending || !canSave}
              >
                {isPending ? (
                  <>
                    <Loader2
                      data-icon="inline-start"
                      className="size-4 animate-spin"
                    />
                    Saving…
                  </>
                ) : (
                  "Save draft to Asset Studio"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
