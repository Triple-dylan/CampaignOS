"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarRange, ChevronLeft, Loader2, Sparkles } from "lucide-react";
import {
  previewCampaignTimeline,
  saveCampaignTimelineSelection,
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
import {
  fromDateInputValue,
  fromDatetimeLocalValue,
  SELECT_CLASS,
  TEXTAREA_CLASS,
  toDateInputValue,
  toDatetimeLocalValue,
} from "@/lib/form/datetime";
import {
  CALENDAR_EVENT_TYPE_LABELS,
  calendarEventTypeSchema,
  type CalendarEventType,
} from "@/lib/validators/calendar-events";
import {
  TASK_PRIORITY_LABELS,
  taskPrioritySchema,
  type TaskPriority,
} from "@/lib/validators/tasks";
import { cn } from "@/lib/utils";

const EVENT_TYPES = calendarEventTypeSchema.options;
const TASK_PRIORITIES = taskPrioritySchema.options;

type PlannerTimelineDefaults = {
  districtSegments: string;
  issues: string;
  electionDate: string | null;
};

type PreviewEventRow = {
  key: string;
  selected: boolean;
  title: string;
  description: string;
  eventType: CalendarEventType;
  startTimeLocal: string;
  isMilestone: boolean;
};

type PreviewTaskRow = {
  key: string;
  selected: boolean;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
};

type GuidedTimelineDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openAiConfigured: boolean;
  defaults?: PlannerTimelineDefaults;
  onSuccess?: () => void;
};

function defaultPlanningEnd(electionDate: string | null | undefined): string {
  if (electionDate) {
    return toDateInputValue(electionDate);
  }
  const end = new Date();
  end.setDate(end.getDate() + 90);
  return toDateInputValue(end.toISOString());
}

function defaultPlanningStart(): string {
  return toDateInputValue(new Date().toISOString());
}

function createPreviewRows(timeline: {
  events: Array<{
    title: string;
    description?: string;
    event_type: CalendarEventType;
    start_time: string;
    is_milestone?: boolean;
  }>;
  tasks: Array<{
    title: string;
    description?: string;
    priority?: TaskPriority;
    due_date?: string;
  }>;
}): { events: PreviewEventRow[]; tasks: PreviewTaskRow[] } {
  return {
    events: timeline.events.map((event, index) => ({
      key: `event-${index}`,
      selected: true,
      title: event.title,
      description: event.description ?? "",
      eventType: event.event_type,
      startTimeLocal: toDatetimeLocalValue(event.start_time),
      isMilestone: event.is_milestone ?? false,
    })),
    tasks: timeline.tasks.map((task, index) => ({
      key: `task-${index}`,
      selected: true,
      title: task.title,
      description: task.description ?? "",
      priority: task.priority ?? "medium",
      dueDate: toDateInputValue(task.due_date),
    })),
  };
}

export function GuidedTimelineDialog({
  open,
  onOpenChange,
  openAiConfigured,
  defaults,
  onSuccess,
}: GuidedTimelineDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg border border-border bg-card/70 text-muted-foreground">
              <CalendarRange className="size-4" aria-hidden />
            </span>
            Generate campaign timeline
          </DialogTitle>
          <DialogDescription>
            Define district, segments, and issues — then preview and save selected
            planner events and tasks to your calendar.
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <GuidedTimelineForm
            key={`${defaults?.districtSegments ?? ""}-${defaults?.issues ?? ""}-${defaults?.electionDate ?? ""}`}
            openAiConfigured={openAiConfigured}
            defaults={defaults}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function GuidedTimelineForm({
  openAiConfigured,
  defaults,
  onClose,
  onSuccess,
}: {
  openAiConfigured: boolean;
  defaults?: PlannerTimelineDefaults;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [step, setStep] = useState<"form" | "preview">("form");
  const [districtSegments, setDistrictSegments] = useState(
    defaults?.districtSegments ?? "",
  );
  const [issues, setIssues] = useState(defaults?.issues ?? "");
  const [dateRangeStart, setDateRangeStart] = useState(defaultPlanningStart);
  const [dateRangeEnd, setDateRangeEnd] = useState(() =>
    defaultPlanningEnd(defaults?.electionDate),
  );
  const [summary, setSummary] = useState("");
  const [previewEvents, setPreviewEvents] = useState<PreviewEventRow[]>([]);
  const [previewTasks, setPreviewTasks] = useState<PreviewTaskRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedCount = useMemo(() => {
    return (
      previewEvents.filter((row) => row.selected).length +
      previewTasks.filter((row) => row.selected).length
    );
  }, [previewEvents, previewTasks]);

  const canGenerate =
    districtSegments.trim().length >= 8 && issues.trim().length >= 5;

  function handleGeneratePreview() {
    setError(null);
    startTransition(async () => {
      const result = await previewCampaignTimeline({
        districtSegments: districtSegments.trim(),
        issues: issues.trim(),
        dateRangeStart: dateRangeStart || undefined,
        dateRangeEnd: dateRangeEnd || undefined,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const rows = createPreviewRows(result.timeline);
      setSummary(result.timeline.summary);
      setPreviewEvents(rows.events);
      setPreviewTasks(rows.tasks);
      setStep("preview");
    });
  }

  function handleSaveSelected() {
    setError(null);

    const events = previewEvents
      .filter((row) => row.selected)
      .map((row) => ({
        title: row.title.trim(),
        description: row.description.trim() || undefined,
        event_type: row.eventType,
        start_time: fromDatetimeLocalValue(row.startTimeLocal),
        is_milestone: row.isMilestone,
      }))
      .filter((row) => row.title && row.start_time);

    const tasks = previewTasks
      .filter((row) => row.selected)
      .map((row) => ({
        title: row.title.trim(),
        description: row.description.trim() || undefined,
        priority: row.priority,
        due_date: row.dueDate
          ? (fromDateInputValue(row.dueDate) ?? undefined)
          : undefined,
      }))
      .filter((row) => row.title);

    startTransition(async () => {
      const result = await saveCampaignTimelineSelection({ events, tasks });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      onClose();
      onSuccess?.();
    });
  }

  function toggleAllEvents(selected: boolean) {
    setPreviewEvents((rows) => rows.map((row) => ({ ...row, selected })));
  }

  function toggleAllTasks(selected: boolean) {
    setPreviewTasks((rows) => rows.map((row) => ({ ...row, selected })));
  }

  if (step === "form") {
    return (
      <div className="space-y-4">
        {!openAiConfigured ? (
          <p className="text-xs text-muted-foreground">
            OpenAI is not configured — timeline generation requires AI. Add
            OPENAI_API_KEY to preview a plan, or add events manually from the
            planner.
          </p>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="timeline-district">District &amp; voter segments</Label>
          <textarea
            id="timeline-district"
            className={`${TEXTAREA_CLASS} min-h-20`}
            value={districtSegments}
            onChange={(e) => setDistrictSegments(e.target.value)}
            placeholder="WA State House LD 36 — renters in Capitol Hill, small-business owners in Fremont…"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="timeline-issues">Key issues</Label>
          <textarea
            id="timeline-issues"
            className={`${TEXTAREA_CLASS} min-h-20`}
            value={issues}
            onChange={(e) => setIssues(e.target.value)}
            placeholder="Housing affordability, transit funding, public safety…"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="timeline-start">Planning start</Label>
            <Input
              id="timeline-start"
              type="date"
              value={dateRangeStart}
              onChange={(e) => setDateRangeStart(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeline-end">Planning end</Label>
            <Input
              id="timeline-end"
              type="date"
              value={dateRangeEnd}
              onChange={(e) => setDateRangeEnd(e.target.value)}
            />
          </div>
        </div>

        {defaults?.electionDate ? (
          <p className="text-xs text-muted-foreground">
            Election date from profile:{" "}
            {new Date(defaults.electionDate).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
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
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPending || !canGenerate || !openAiConfigured}
            onClick={handleGeneratePreview}
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
                Generate preview
              </>
            )}
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {summary ? (
        <p className="rounded-lg border border-border bg-card/50 px-3 py-2 text-sm text-muted-foreground">
          {summary}
        </p>
      ) : null}

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Events</h3>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => toggleAllEvents(true)}
            >
              Select all
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => toggleAllEvents(false)}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="max-h-56 overflow-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sticky top-0 bg-muted/80 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
              <tr>
                <th className="w-10 px-2 py-2" scope="col">
                  <span className="sr-only">Include</span>
                </th>
                <th className="px-2 py-2" scope="col">
                  Title
                </th>
                <th className="px-2 py-2" scope="col">
                  Type
                </th>
                <th className="px-2 py-2" scope="col">
                  Start
                </th>
                <th className="w-24 px-2 py-2" scope="col">
                  Milestone
                </th>
              </tr>
            </thead>
            <tbody>
              {previewEvents.map((row) => (
                <tr
                  key={row.key}
                  className={cn(
                    "border-t border-border/70",
                    !row.selected && "opacity-50",
                  )}
                >
                  <td className="px-2 py-2 align-top">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input"
                      checked={row.selected}
                      onChange={(e) =>
                        setPreviewEvents((rows) =>
                          rows.map((item) =>
                            item.key === row.key
                              ? { ...item, selected: e.target.checked }
                              : item,
                          ),
                        )
                      }
                      aria-label={`Include event ${row.title}`}
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <Input
                      value={row.title}
                      onChange={(e) =>
                        setPreviewEvents((rows) =>
                          rows.map((item) =>
                            item.key === row.key
                              ? { ...item, title: e.target.value }
                              : item,
                          ),
                        )
                      }
                      className="h-8"
                    />
                    <Input
                      value={row.description}
                      onChange={(e) =>
                        setPreviewEvents((rows) =>
                          rows.map((item) =>
                            item.key === row.key
                              ? { ...item, description: e.target.value }
                              : item,
                          ),
                        )
                      }
                      className="mt-1 h-8 text-xs"
                      placeholder="Description (optional)"
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <select
                      className={`${SELECT_CLASS} h-8 text-xs`}
                      value={row.eventType}
                      onChange={(e) =>
                        setPreviewEvents((rows) =>
                          rows.map((item) =>
                            item.key === row.key
                              ? {
                                  ...item,
                                  eventType: e.target.value as CalendarEventType,
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      {EVENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {CALENDAR_EVENT_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <Input
                      type="datetime-local"
                      value={row.startTimeLocal}
                      onChange={(e) =>
                        setPreviewEvents((rows) =>
                          rows.map((item) =>
                            item.key === row.key
                              ? { ...item, startTimeLocal: e.target.value }
                              : item,
                          ),
                        )
                      }
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input"
                      checked={row.isMilestone}
                      onChange={(e) =>
                        setPreviewEvents((rows) =>
                          rows.map((item) =>
                            item.key === row.key
                              ? { ...item, isMilestone: e.target.checked }
                              : item,
                          ),
                        )
                      }
                      aria-label={`Mark ${row.title} as milestone`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Tasks</h3>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => toggleAllTasks(true)}
            >
              Select all
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => toggleAllTasks(false)}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="max-h-56 overflow-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sticky top-0 bg-muted/80 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
              <tr>
                <th className="w-10 px-2 py-2" scope="col">
                  <span className="sr-only">Include</span>
                </th>
                <th className="px-2 py-2" scope="col">
                  Title
                </th>
                <th className="px-2 py-2" scope="col">
                  Priority
                </th>
                <th className="px-2 py-2" scope="col">
                  Due date
                </th>
              </tr>
            </thead>
            <tbody>
              {previewTasks.map((row) => (
                <tr
                  key={row.key}
                  className={cn(
                    "border-t border-border/70",
                    !row.selected && "opacity-50",
                  )}
                >
                  <td className="px-2 py-2 align-top">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input"
                      checked={row.selected}
                      onChange={(e) =>
                        setPreviewTasks((rows) =>
                          rows.map((item) =>
                            item.key === row.key
                              ? { ...item, selected: e.target.checked }
                              : item,
                          ),
                        )
                      }
                      aria-label={`Include task ${row.title}`}
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <Input
                      value={row.title}
                      onChange={(e) =>
                        setPreviewTasks((rows) =>
                          rows.map((item) =>
                            item.key === row.key
                              ? { ...item, title: e.target.value }
                              : item,
                          ),
                        )
                      }
                      className="h-8"
                    />
                    <Input
                      value={row.description}
                      onChange={(e) =>
                        setPreviewTasks((rows) =>
                          rows.map((item) =>
                            item.key === row.key
                              ? { ...item, description: e.target.value }
                              : item,
                          ),
                        )
                      }
                      className="mt-1 h-8 text-xs"
                      placeholder="Description (optional)"
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <select
                      className={`${SELECT_CLASS} h-8 text-xs`}
                      value={row.priority}
                      onChange={(e) =>
                        setPreviewTasks((rows) =>
                          rows.map((item) =>
                            item.key === row.key
                              ? {
                                  ...item,
                                  priority: e.target.value as TaskPriority,
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      {TASK_PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {TASK_PRIORITY_LABELS[priority]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <Input
                      type="date"
                      value={row.dueDate}
                      onChange={(e) =>
                        setPreviewTasks((rows) =>
                          rows.map((item) =>
                            item.key === row.key
                              ? { ...item, dueDate: e.target.value }
                              : item,
                          ),
                        )
                      }
                      className="h-8 text-xs"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setStep("form");
            setError(null);
          }}
          disabled={isPending}
        >
          <ChevronLeft data-icon="inline-start" className="size-3.5" />
          Back
        </Button>
        <Button
          type="button"
          disabled={isPending || selectedCount === 0}
          onClick={handleSaveSelected}
        >
          {isPending ? (
            <>
              <Loader2 data-icon="inline-start" className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            `Save selected (${selectedCount})`
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}
