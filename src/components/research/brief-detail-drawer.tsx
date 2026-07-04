"use client";

import { useState, useTransition } from "react";
import {
  Loader2,
  Network,
  Sparkles,
  SquareCheckBig,
  Trash2,
} from "lucide-react";
import {
  createTaskFromResearchBrief,
  deleteResearchBriefAction,
  updateResearchBriefContent,
} from "@/actions/research";
import {
  ResearchBriefStatusBadge,
  ResearchTypeBadge,
} from "@/components/research/brief-badges";
import { SourceCardList } from "@/components/research/source-card";
import {
  deriveStage,
  formatDate,
  keyFindings,
  normalizeSources,
  RESEARCH_STAGE_META,
  type BriefGraphLink,
  type NormalizedSource,
} from "@/components/research/research-stages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { DbResearchBrief } from "@/lib/db/schema";
import {
  RESEARCH_TYPE_LABELS,
  type ResearchBriefStatus,
  type ResearchSource,
  type ResearchType,
} from "@/lib/validators/research-briefs";

const TEXTAREA_CLASS =
  "flex w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm shadow-xs outline-none backdrop-blur-sm transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25";

function findingsToText(findings: string[]): string {
  return findings.join("\n");
}

function sourcesToText(sources: NormalizedSource[]): string {
  return sources
    .map((source) =>
      source.url && source.url !== source.title
        ? [source.url, source.title, source.snippet].filter(Boolean).join(" | ")
        : source.title,
    )
    .join("\n");
}

function parseKeyFindings(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseSources(value: string): ResearchSource[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      if (parts.length >= 2) {
        return {
          url: parts[0] || parts[1] || line,
          title: parts[1] || parts[0] || "Source",
          snippet: parts[2] || undefined,
        };
      }
      return { url: line, title: line, snippet: undefined };
    });
}

type BriefDetailDrawerProps = {
  brief: DbResearchBrief | null;
  graphLinks: BriefGraphLink[];
  onClose: () => void;
  onChanged: () => void;
};

/**
 * Right-side detail drawer that replaces the old centered modal. The Sheet is
 * the persistent shell; the editor remounts (via `key`) whenever a different
 * brief is opened so edit state initializes cleanly from the row without a
 * synchronizing effect.
 */
export function BriefDetailDrawer({
  brief,
  graphLinks,
  onClose,
  onChanged,
}: BriefDetailDrawerProps) {
  return (
    <Sheet
      open={Boolean(brief)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 data-[side=right]:sm:max-w-2xl"
      >
        {brief ? (
          <BriefDetailEditor
            key={brief.id}
            brief={brief}
            graphLinks={graphLinks}
            onClose={onClose}
            onChanged={onChanged}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function BriefDetailEditor({
  brief,
  graphLinks,
  onClose,
  onChanged,
}: {
  brief: DbResearchBrief;
  graphLinks: BriefGraphLink[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(brief.title);
  const [topic, setTopic] = useState(brief.topic ?? "");
  const [summary, setSummary] = useState(brief.summary ?? "");
  const [body, setBody] = useState(brief.body ?? "");
  const [findingsText, setFindingsText] = useState(() =>
    findingsToText(keyFindings(brief)),
  );
  const [sourcesText, setSourcesText] = useState(() =>
    sourcesToText(normalizeSources(brief.sources_json)),
  );
  const [status, setStatus] = useState<ResearchBriefStatus>(
    brief.status === "complete" ? "complete" : "draft",
  );
  const [showSourceEditor, setShowSourceEditor] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(action: () => Promise<{ ok: boolean; error?: string }>) {
    setActionError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setActionError(result.error ?? "Action failed");
        return;
      }
      onClose();
      onChanged();
    });
  }

  const previewSources = parseSources(sourcesText).map((source) => ({
    url: source.url,
    title: source.title,
    snippet: source.snippet,
  }));

  const stage = deriveStage(brief);

  return (
    <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-border p-5 pr-12">
              <div className="flex flex-wrap items-center gap-1.5">
                <ResearchTypeBadge type={brief.research_type} />
                <ResearchBriefStatusBadge status={brief.status} />
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {RESEARCH_STAGE_META[stage].label}
                </span>
                {brief.ai_generated ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900 dark:bg-violet-950 dark:text-violet-200">
                    <Sparkles className="size-3" aria-hidden />
                    AI generated
                  </span>
                ) : null}
              </div>
              <SheetTitle className="sr-only">{brief.title}</SheetTitle>
              <input
                aria-label="Brief title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1 w-full rounded-md bg-transparent font-heading text-xl font-semibold leading-tight text-foreground outline-none focus-visible:bg-accent/40"
              />
              <SheetDescription>
                {RESEARCH_TYPE_LABELS[brief.research_type as ResearchType] ??
                  brief.research_type}
                {" · Updated "}
                {formatDate(brief.updated_at)}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              <Field label="Topic">
                <Input
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="Specific focus area"
                />
              </Field>

              <Field label="Summary">
                <textarea
                  className={`${TEXTAREA_CLASS} min-h-20`}
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  placeholder="Executive summary…"
                />
              </Field>

              <Field
                label="Outline"
                hint="Key findings — one per line."
              >
                <textarea
                  className={`${TEXTAREA_CLASS} min-h-28`}
                  value={findingsText}
                  onChange={(event) => setFindingsText(event.target.value)}
                  placeholder={"Median rent trends in district\nOpponent voting record on HB 1110"}
                />
              </Field>

              <Field label="Notes">
                <textarea
                  className={`${TEXTAREA_CLASS} min-h-16`}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Working notes, risks, talking points…"
                />
              </Field>

              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Sources
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setShowSourceEditor((value) => !value)}
                  >
                    {showSourceEditor ? "Done" : "Edit"}
                  </Button>
                </div>
                {brief.ai_generated ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                    AI-generated references — verify independently before use in
                    paid media, mailers, or public statements.
                  </p>
                ) : null}
                <SourceCardList sources={previewSources} />
                {showSourceEditor ? (
                  <textarea
                    className={`${TEXTAREA_CLASS} min-h-20 font-mono text-xs`}
                    value={sourcesText}
                    onChange={(event) => setSourcesText(event.target.value)}
                    placeholder="https://example.gov | City housing report | Key stats"
                  />
                ) : null}
              </section>

              <section className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Network className="size-3.5" aria-hidden />
                  Graph links
                </Label>
                {graphLinks.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {graphLinks.map((link) => (
                      <span
                        key={link.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-2.5 py-1 text-xs text-foreground"
                      >
                        <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                        <span className="max-w-[16rem] truncate">{link.title}</span>
                        <span className="text-muted-foreground">{link.type}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
                    This brief isn&rsquo;t connected to other nodes yet. Linked
                    issues, candidates, and tasks will appear here as the
                    knowledge graph grows.
                  </p>
                )}
              </section>

              <Field label="Status">
                <Select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as ResearchBriefStatus)
                  }
                  className="max-w-40"
                >
                  <option value="draft">Draft</option>
                  <option value="complete">Complete</option>
                </Select>
              </Field>

              {actionError ? (
                <p className="text-sm text-destructive" role="alert">
                  {actionError}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border p-4">
              <Button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(async () => {
                    const result = await updateResearchBriefContent({
                      briefId: brief.id,
                      title: title.trim(),
                      topic: topic.trim() || null,
                      summary: summary.trim() || null,
                      body: body.trim() || null,
                      keyFindings: parseKeyFindings(findingsText),
                      sources: parseSources(sourcesText),
                      status,
                    });
                    return result.ok
                      ? { ok: true }
                      : { ok: false, error: result.error };
                  })
                }
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Save changes"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  runAction(async () => {
                    const result = await createTaskFromResearchBrief(brief.id);
                    return result.ok
                      ? { ok: true }
                      : { ok: false, error: result.error };
                  })
                }
              >
                <SquareCheckBig data-icon="inline-start" className="size-4" />
                Create task
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="ml-auto"
                disabled={isPending}
                onClick={() =>
                  runAction(async () => {
                    const result = await deleteResearchBriefAction(brief.id);
                    return result.ok
                      ? { ok: true }
                      : { ok: false, error: result.error };
                  })
                }
              >
                <Trash2 data-icon="inline-start" className="size-4" />
                Delete
              </Button>
            </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground/80">{hint}</p> : null}
    </div>
  );
}
