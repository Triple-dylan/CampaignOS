"use client";

import { useState, useTransition } from "react";
import { CalendarRange, Loader2, Sparkles, Users } from "lucide-react";
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
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ResearchType } from "@/lib/validators/research-briefs";

const TEXTAREA_CLASS =
  "flex w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm shadow-xs outline-none backdrop-blur-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export type GuidedWorkflow = "event" | "incumbent";

const EVENT_TYPES = [
  "Town hall",
  "Candidate forum",
  "Debate",
  "House party",
  "Fundraiser",
  "Endorsement meeting",
  "Other",
];

const COMPARISON_DIMENSIONS = [
  "Voting record",
  "Fundraising",
  "Key votes",
  "Endorsements",
  "Message contrast",
  "Vulnerabilities",
];

const WORKFLOW_META: Record<
  GuidedWorkflow,
  {
    icon: typeof CalendarRange;
    title: string;
    description: string;
    researchType: ResearchType;
    cta: string;
  }
> = {
  event: {
    icon: CalendarRange,
    title: "New report — Event research",
    description:
      "Prep a town hall, debate, forum, or fundraiser. We collect the basics, then draft a briefing with talking points and sources.",
    researchType: "issue",
    cta: "Generate report",
  },
  incumbent: {
    icon: Users,
    title: "New comparison — Incumbent research",
    description:
      "Compare your race against an incumbent or rival candidates across the dimensions that matter, with sources and confidence notes.",
    researchType: "opponent",
    cta: "Generate comparison",
  },
};

type GuidedBriefDialogProps = {
  workflow: GuidedWorkflow | null;
  onOpenChange: (open: boolean) => void;
  openAiConfigured: boolean;
  topIssues?: string[];
  onSuccess?: () => void;
};

export function GuidedBriefDialog({
  workflow,
  onOpenChange,
  openAiConfigured,
  topIssues = [],
  onSuccess,
}: GuidedBriefDialogProps) {
  const [mode, setMode] = useState<"ai" | "manual">(
    openAiConfigured ? "ai" : "manual",
  );

  // Event Research fields.
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventAudience, setEventAudience] = useState("");
  const [eventGoals, setEventGoals] = useState("");
  const [eventQuestions, setEventQuestions] = useState("");

  // Incumbent Research fields.
  const [candidates, setCandidates] = useState("");
  const [raceContext, setRaceContext] = useState("");
  const [dimensions, setDimensions] = useState<string[]>([
    "Voting record",
    "Key votes",
  ]);
  const [timeframe, setTimeframe] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setMode(openAiConfigured ? "ai" : "manual");
    setEventType(EVENT_TYPES[0]);
    setEventDate("");
    setEventLocation("");
    setEventAudience("");
    setEventGoals("");
    setEventQuestions("");
    setCandidates("");
    setRaceContext("");
    setDimensions(["Voting record", "Key votes"]);
    setTimeframe("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  function toggleDimension(value: string) {
    setDimensions((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function buildEventPayload() {
    const topic = [
      `Event research for a ${eventType.toLowerCase()}${
        eventDate ? ` on ${eventDate}` : ""
      }${eventLocation ? ` in ${eventLocation}` : ""}.`,
      eventAudience ? `Audience: ${eventAudience}.` : "",
      eventGoals ? `Goal: ${eventGoals}.` : "",
      eventQuestions ? `Prepare for: ${eventQuestions}.` : "",
      "Include a summary, key findings, risks, and suggested talking points.",
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 500);

    const title = `Event prep: ${eventType}${
      eventLocation ? ` — ${eventLocation}` : ""
    }`.slice(0, 200);

    const body = [
      `Event type: ${eventType}`,
      eventDate ? `Date: ${eventDate}` : "",
      eventLocation ? `Location: ${eventLocation}` : "",
      eventAudience ? `Audience: ${eventAudience}` : "",
      eventGoals ? `Goals: ${eventGoals}` : "",
      eventQuestions ? `Likely questions / issues: ${eventQuestions}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return { topic, title, body };
  }

  function buildIncumbentPayload() {
    const topic = [
      `Candidate comparison${candidates ? ` of ${candidates}` : ""}.`,
      raceContext ? `Race context: ${raceContext}.` : "",
      dimensions.length ? `Compare on: ${dimensions.join(", ")}.` : "",
      timeframe ? `Treat ${timeframe} as the current timeframe.` : "",
      "Label unverified claims clearly and include sources.",
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 500);

    const title = `Comparison: ${candidates || "incumbent"}`.slice(0, 200);

    const body = [
      candidates ? `Candidates: ${candidates}` : "",
      raceContext ? `Race context: ${raceContext}` : "",
      dimensions.length ? `Comparison dimensions: ${dimensions.join(", ")}` : "",
      timeframe ? `Timeframe: ${timeframe}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return { topic, title, body };
  }

  const canSubmit =
    workflow === "event"
      ? Boolean(
          eventAudience.trim() || eventGoals.trim() || eventLocation.trim(),
        )
      : workflow === "incumbent"
        ? Boolean(candidates.trim())
        : false;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!workflow) return;
    setError(null);

    const meta = WORKFLOW_META[workflow];
    const payload =
      workflow === "event" ? buildEventPayload() : buildIncumbentPayload();

    startTransition(async () => {
      if (mode === "ai") {
        const result = await generateResearchBrief({
          researchType: meta.researchType,
          topic: payload.topic,
          relatedIssues:
            workflow === "event" && topIssues.length
              ? topIssues.slice(0, 5)
              : undefined,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
      } else {
        const result = await createResearchBriefManual({
          researchType: meta.researchType,
          title: payload.title,
          topic: payload.topic.slice(0, 300),
          body: payload.body || undefined,
          status: "draft",
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

  const meta = workflow ? WORKFLOW_META[workflow] : null;
  const Icon = meta?.icon;

  return (
    <Dialog open={Boolean(workflow)} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {workflow && meta ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {Icon ? (
                  <span className="flex size-7 items-center justify-center rounded-lg border border-border bg-card/70 text-muted-foreground">
                    <Icon className="size-4" aria-hidden />
                  </span>
                ) : null}
                {meta.title}
              </DialogTitle>
              <DialogDescription>{meta.description}</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "ai" ? "default" : "outline"}
                  disabled={!openAiConfigured}
                  onClick={() => setMode("ai")}
                >
                  <Sparkles data-icon="inline-start" className="size-3.5" />
                  Generate with AI
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "manual" ? "default" : "outline"}
                  onClick={() => setMode("manual")}
                >
                  Save as draft
                </Button>
              </div>

              {!openAiConfigured ? (
                <p className="text-xs text-muted-foreground">
                  OpenAI is not configured — this will save a structured draft
                  you can fill in. Add OPENAI_API_KEY to generate automatically.
                </p>
              ) : null}

              {workflow === "event" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="event-type">Event type</Label>
                      <Select
                        id="event-type"
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                      >
                        {EVENT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-date">Date &amp; time</Label>
                      <Input
                        id="event-date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        placeholder="May 4, 6:00pm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-location">Location</Label>
                    <Input
                      id="event-location"
                      value={eventLocation}
                      onChange={(e) => setEventLocation(e.target.value)}
                      placeholder="District 5 community center, Seattle"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-audience">Audience</Label>
                    <Input
                      id="event-audience"
                      value={eventAudience}
                      onChange={(e) => setEventAudience(e.target.value)}
                      placeholder="Neighborhood association, ~80 residents"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-goals">
                      What should the candidate accomplish?
                    </Label>
                    <textarea
                      id="event-goals"
                      className={`${TEXTAREA_CLASS} min-h-20`}
                      value={eventGoals}
                      onChange={(e) => setEventGoals(e.target.value)}
                      placeholder="Introduce housing plan, build trust with renters…"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-questions">
                      Likely questions or issues to prepare for
                    </Label>
                    <textarea
                      id="event-questions"
                      className={`${TEXTAREA_CLASS} min-h-20`}
                      value={eventQuestions}
                      onChange={(e) => setEventQuestions(e.target.value)}
                      placeholder="Zoning reform, public safety, transit funding…"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="comparison-candidates">
                      Candidates / incumbents to compare
                    </Label>
                    <textarea
                      id="comparison-candidates"
                      className={`${TEXTAREA_CLASS} min-h-16`}
                      value={candidates}
                      onChange={(e) => setCandidates(e.target.value)}
                      placeholder="Rep. Jane Doe (incumbent) vs. our candidate"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comparison-context">
                      Office, district, or race context
                    </Label>
                    <Input
                      id="comparison-context"
                      value={raceContext}
                      onChange={(e) => setRaceContext(e.target.value)}
                      placeholder="WA State House, LD 36"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Comparison dimensions</Label>
                    <div className="flex flex-wrap gap-2">
                      {COMPARISON_DIMENSIONS.map((dimension) => {
                        const active = dimensions.includes(dimension);
                        return (
                          <button
                            key={dimension}
                            type="button"
                            onClick={() => toggleDimension(dimension)}
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                              active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background/60 hover:bg-muted",
                            )}
                          >
                            {dimension}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comparison-timeframe">
                      What timeframe counts as current?
                    </Label>
                    <Input
                      id="comparison-timeframe"
                      value={timeframe}
                      onChange={(e) => setTimeframe(e.target.value)}
                      placeholder="Current term, 2023–present"
                    />
                  </div>
                </div>
              )}

              {mode === "ai" && topIssues.length > 0 && workflow === "event" ? (
                <p className="text-xs text-muted-foreground">
                  AI will weave in your campaign issues:{" "}
                  {topIssues.slice(0, 5).join(", ")}
                </p>
              ) : null}

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
                <Button type="submit" disabled={isPending || !canSubmit}>
                  {isPending ? (
                    <>
                      <Loader2
                        data-icon="inline-start"
                        className="size-4 animate-spin"
                      />
                      {mode === "ai" ? "Generating…" : "Saving…"}
                    </>
                  ) : mode === "ai" ? (
                    meta.cta
                  ) : (
                    "Save draft"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
