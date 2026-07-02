"use client";

import { useState, useTransition } from "react";
import { CalendarDays, Loader2, Sparkles, Timeline } from "lucide-react";
import {
  generatePlannerContentCalendar,
  generatePlannerTimeline,
} from "@/actions/planner";
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
import { TEXTAREA_CLASS } from "@/lib/form/datetime";
import { cn } from "@/lib/utils";

type PlannerGenerationMode = "timeline" | "content-calendar";

type PlannerGenerationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openAiConfigured: boolean;
  initialMode?: PlannerGenerationMode;
  onSuccess: () => void;
};

export function PlannerGenerationDialog({
  open,
  onOpenChange,
  openAiConfigured,
  initialMode = "content-calendar",
  onSuccess,
}: PlannerGenerationDialogProps) {
  const [mode, setMode] = useState<PlannerGenerationMode>(initialMode);
  const [districtSegments, setDistrictSegments] = useState("");
  const [issues, setIssues] = useState("");
  const [period, setPeriod] = useState("");
  const [channelsAndCadence, setChannelsAndCadence] = useState("");
  const [resultSummary, setResultSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetForm(nextMode: PlannerGenerationMode) {
    setMode(nextMode);
    setError(null);
    setResultSummary(null);
  }

  function handleSubmit() {
    setError(null);
    setResultSummary(null);

    startTransition(async () => {
      if (mode === "timeline") {
        const result = await generatePlannerTimeline({
          districtSegments,
          issues,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setResultSummary(
          [
            result.summary,
            "",
            `Created ${result.eventCount ?? 0} planner event${result.eventCount === 1 ? "" : "s"} and ${result.taskCount ?? 0} task${result.taskCount === 1 ? "" : "s"}.`,
          ]
            .filter(Boolean)
            .join("\n"),
        );
        onSuccess();
        return;
      }

      const result = await generatePlannerContentCalendar({
        period,
        channelsAndCadence,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setResultSummary(
        [
          result.summary,
          "",
          `Created ${result.eventCount ?? 0} content beat${result.eventCount === 1 ? "" : "s"} in Planner and linked them in the brain graph.`,
        ]
          .filter(Boolean)
          .join("\n"),
      );
      onSuccess();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setError(null);
          setResultSummary(null);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Generate plan
          </DialogTitle>
          <DialogDescription>
            Uses your Campaign Brain context to create planner events and graph
            nodes through the same workflow path as chat.
          </DialogDescription>
        </DialogHeader>

        <div className="inline-flex rounded-lg border border-border bg-card/60 p-0.5">
          {(
            [
              ["content-calendar", "Content calendar", CalendarDays],
              ["timeline", "Campaign timeline", Timeline],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => resetForm(value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                mode === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        {!openAiConfigured ? (
          <p className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
            OpenAI is not configured. Add OPENAI_API_KEY to generate calendars
            and timelines.
          </p>
        ) : null}

        {resultSummary ? (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
            {resultSummary}
          </div>
        ) : mode === "timeline" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="planner-district-segments">
                District & voter segments
              </Label>
              <textarea
                id="planner-district-segments"
                className={TEXTAREA_CLASS}
                value={districtSegments}
                onChange={(event) => setDistrictSegments(event.target.value)}
                placeholder="WA-03 suburban homeowners, young renters in Vancouver, rural Clark County"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planner-issues">Key issues & date range</Label>
              <textarea
                id="planner-issues"
                className={TEXTAREA_CLASS}
                value={issues}
                onChange={(event) => setIssues(event.target.value)}
                placeholder="Housing affordability, public safety — plan through November 2026 general election"
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="planner-period">Calendar period</Label>
              <Input
                id="planner-period"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                placeholder="October 2026 launch month"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planner-channels">Channels & cadence</Label>
              <textarea
                id="planner-channels"
                className={TEXTAREA_CLASS}
                value={channelsAndCadence}
                onChange={(event) => setChannelsAndCadence(event.target.value)}
                placeholder="Instagram 3x/week, X daily, Facebook 2x/week — focus on housing and endorsements"
                rows={3}
              />
            </div>
          </div>
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
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {resultSummary ? "Close" : "Cancel"}
          </Button>
          {!resultSummary ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                isPending ||
                !openAiConfigured ||
                (mode === "timeline"
                  ? !districtSegments.trim() || !issues.trim()
                  : !period.trim() || !channelsAndCadence.trim())
              }
            >
              {isPending ? (
                <>
                  <Loader2
                    data-icon="inline-start"
                    className="size-4 animate-spin"
                  />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles data-icon="inline-start" className="size-3.5" />
                  Generate
                </>
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
