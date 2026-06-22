"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import {
  createResearchBriefManual,
  generateResearchBrief,
} from "@/actions/research";
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
import {
  RESEARCH_TYPE_LABELS,
  researchTypeSchema,
  type ResearchSource,
  type ResearchType,
} from "@/lib/validators/research-briefs";

const RESEARCH_TYPES = researchTypeSchema.options;

type BriefFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openAiConfigured: boolean;
  topIssues?: string[];
  onSuccess?: () => void;
};

function parseKeyFindings(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseSources(value: string): ResearchSource[] {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length >= 2) {
      return {
        url: parts[0] ?? "",
        title: parts[1] ?? "Source",
        snippet: parts[2],
      };
    }
    return { url: line, title: line, snippet: undefined };
  });
}

export function BriefFormDialog({
  open,
  onOpenChange,
  openAiConfigured,
  topIssues = [],
  onSuccess,
}: BriefFormDialogProps) {
  const [mode, setMode] = useState<"manual" | "ai">("manual");
  const [researchType, setResearchType] = useState<ResearchType>("issue");
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [keyFindingsText, setKeyFindingsText] = useState("");
  const [sourcesText, setSourcesText] = useState("");
  const [status, setStatus] = useState<"draft" | "complete">("draft");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setMode("manual");
    setResearchType("issue");
    setTitle("");
    setTopic("");
    setSummary("");
    setBody("");
    setKeyFindingsText("");
    setSourcesText("");
    setStatus("draft");
    setError(null);
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
        const result = await generateResearchBrief({
          researchType,
          topic: topic.trim(),
        });

        if (!result.ok) {
          setError(result.error);
          return;
        }
      } else {
        const result = await createResearchBriefManual({
          researchType,
          title: title.trim(),
          topic: topic.trim() || undefined,
          summary: summary.trim() || undefined,
          body: body.trim() || undefined,
          keyFindings: parseKeyFindings(keyFindingsText),
          sources: parseSources(sourcesText),
          status,
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
          <DialogTitle>Create research brief</DialogTitle>
          <DialogDescription>
            Document district intel, issue research, or opposition summaries
            manually or generate a first draft with AI.
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
            <Label htmlFor="research-type">Research type</Label>
            <select
              id="research-type"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={researchType}
              onChange={(event) =>
                setResearchType(event.target.value as ResearchType)
              }
            >
              {RESEARCH_TYPES.map((type) => (
                <option key={type} value={type}>
                  {RESEARCH_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          {mode === "manual" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="brief-title">Title</Label>
                <Input
                  id="brief-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Seattle housing policy landscape"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brief-topic">Topic / subject (optional)</Label>
                <Input
                  id="brief-topic"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="Specific focus area"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brief-summary">Summary</Label>
                <textarea
                  id="brief-summary"
                  className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  placeholder="Executive summary…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brief-findings">Key findings (one per line)</Label>
                <textarea
                  id="brief-findings"
                  className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={keyFindingsText}
                  onChange={(event) => setKeyFindingsText(event.target.value)}
                  placeholder={"Median rent trends in district\nOpponent voting record on HB 1110"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brief-sources">
                  Sources (url | title | snippet, one per line)
                </Label>
                <textarea
                  id="brief-sources"
                  className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={sourcesText}
                  onChange={(event) => setSourcesText(event.target.value)}
                  placeholder="https://example.gov | City housing report | Key stats"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brief-body">Notes (optional)</Label>
                <textarea
                  id="brief-body"
                  className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brief-status">Status</Label>
                <select
                  id="brief-status"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as "draft" | "complete")
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="complete">Complete</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="ai-topic">Research topic / query</Label>
                <textarea
                  id="ai-topic"
                  className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="What should we research? e.g. WA legislative district voter demographics on climate policy"
                  required
                />
              </div>
              {topIssues.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  AI will use your campaign issues: {topIssues.slice(0, 5).join(", ")}
                </p>
              ) : null}
              <p className="text-sm text-muted-foreground">
                AI will draft a {RESEARCH_TYPE_LABELS[researchType].toLowerCase()}{" "}
                brief using your campaign profile and message framework. Sources
                are AI-suggested — verify independently before use.
              </p>
            </>
          )}

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
                (mode === "ai" && (!openAiConfigured || topic.trim().length < 3)) ||
                (mode === "manual" && !title.trim())
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
                "Generate brief"
              ) : (
                "Create brief"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
