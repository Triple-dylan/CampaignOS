"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flag,
  Loader2,
  MapPin,
  MessageSquarePlus,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { deletePlannerEvent } from "@/actions/planner";
import { useChat } from "@/components/chat/chat-provider";
import { EventFormDialog } from "@/components/planner/event-form-dialog";
import {
  EventTypeBadge,
  MilestoneBadge,
} from "@/components/planner/event-badges";
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
import { SELECT_CLASS } from "@/lib/form/datetime";
import type { DbAsset, DbCalendarEvent } from "@/lib/db/schema";
import {
  CALENDAR_EVENT_TYPE_LABELS,
  calendarEventTypeSchema,
  type CalendarEventType,
} from "@/lib/validators/calendar-events";
import { cn } from "@/lib/utils";

const EVENT_TYPES = calendarEventTypeSchema.options;

type ViewMode = "upcoming" | "all" | "milestones";

type CampaignPlannerProps = {
  events: DbCalendarEvent[];
  approvedAssets: DbAsset[];
};

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatEventDateTime(start: string, end: string | null): string {
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return start;

  const datePart = startDate.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  if (!end) return datePart;

  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) return datePart;

  const endPart = endDate.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${datePart} – ${endPart}`;
}

function groupEventsByMonth(events: DbCalendarEvent[]) {
  const groups = new Map<string, DbCalendarEvent[]>();

  for (const event of events) {
    const date = new Date(event.start_time);
    const key = Number.isNaN(date.getTime())
      ? "Unknown"
      : date.toLocaleString(undefined, { month: "long", year: "numeric" });
    const list = groups.get(key) ?? [];
    list.push(event);
    groups.set(key, list);
  }

  return Array.from(groups.entries());
}

export function CampaignPlanner({
  events,
  approvedAssets,
}: CampaignPlannerProps) {
  const router = useRouter();
  const { setChatRailOpen, sendMessage } = useChat();
  const [createOpen, setCreateOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<DbCalendarEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DbCalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("upcoming");
  const [eventTypeFilter, setEventTypeFilter] = useState<CalendarEventType | "all">(
    "all",
  );
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const assetTitleById = useMemo(() => {
    return new Map(approvedAssets.map((asset) => [asset.id, asset.title]));
  }, [approvedAssets]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i)),
    [weekAnchor],
  );

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DbCalendarEvent[]>();
    for (const event of events) {
      const date = new Date(event.start_time);
      if (Number.isNaN(date.getTime())) continue;
      const key = date.toDateString();
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const filteredEvents = useMemo(() => {
    const now = new Date();

    return events.filter((event) => {
      if (eventTypeFilter !== "all" && event.event_type !== eventTypeFilter) {
        return false;
      }
      if (viewMode === "milestones" && !event.is_milestone) {
        return false;
      }
      if (selectedDay) {
        const start = new Date(event.start_time);
        if (!isSameDay(start, selectedDay)) return false;
      }
      if (viewMode === "upcoming") {
        const start = new Date(event.start_time);
        return !Number.isNaN(start.getTime()) && start >= now;
      }
      return true;
    });
  }, [events, eventTypeFilter, viewMode, selectedDay]);

  const groupedEvents = useMemo(
    () => groupEventsByMonth(filteredEvents),
    [filteredEvents],
  );

  const milestoneEvents = useMemo(
    () => events.filter((e) => e.is_milestone),
    [events],
  );

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  function confirmDelete() {
    if (!deleteTarget) return;
    setActionError(null);

    startTransition(async () => {
      const result = await deletePlannerEvent(deleteTarget.id);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setDeleteTarget(null);
      refresh();
    });
  }

  async function handleGenerateWeeklyPlan() {
    setChatRailOpen(true);
    await sendMessage(
      "Generate a weekly campaign plan for this week. Include field events, voter contact goals, content deadlines, and fundraising milestones based on what's already on the calendar.",
    );
  }

  const weekLabel = `${weekDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-3 md:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex rounded-lg border border-border bg-card/60 p-0.5">
          {(
            [
              ["upcoming", "Upcoming"],
              ["all", "All events"],
              ["milestones", "Milestones"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setViewMode(mode);
                setSelectedDay(null);
              }}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                viewMode === mode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleGenerateWeeklyPlan}>
            <Sparkles data-icon="inline-start" className="size-3.5" />
            Generate weekly plan
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" className="size-3.5" />
            New event
          </Button>
        </div>
      </div>

      <section className="glass-card rounded-xl border border-border p-3">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Week of {weekLabel}
          </p>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="size-7 p-0"
              onClick={() => setWeekAnchor((w) => addDays(w, -7))}
              aria-label="Previous week"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setWeekAnchor(startOfWeek(new Date()));
                setSelectedDay(null);
              }}
            >
              Today
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="size-7 p-0"
              onClick={() => setWeekAnchor((w) => addDays(w, 7))}
              aria-label="Next week"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
            const isToday = isSameDay(day, today);
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
            const hasMilestone = dayEvents.some((e) => e.is_milestone);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() =>
                  setSelectedDay((current) =>
                    current && isSameDay(current, day) ? null : day,
                  )
                }
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition-all",
                  isSelected
                    ? "border-primary/50 bg-primary/5 shadow-sm"
                    : "border-transparent hover:border-border hover:bg-card/60",
                  isToday && !isSelected && "ring-1 ring-primary/30",
                )}
              >
                <span className="text-[0.65rem] font-medium uppercase text-muted-foreground">
                  {day.toLocaleDateString(undefined, { weekday: "short" })}
                </span>
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                    isToday && "bg-primary text-primary-foreground",
                  )}
                >
                  {day.getDate()}
                </span>
                <div className="flex h-3 items-center justify-center gap-0.5">
                  {dayEvents.length > 0 ? (
                    <>
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          hasMilestone ? "bg-amber-500" : "bg-primary/70",
                        )}
                      />
                      {dayEvents.length > 1 ? (
                        <span className="text-[0.6rem] text-muted-foreground">
                          +{dayEvents.length - 1}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="size-1.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {milestoneEvents.length > 0 && viewMode !== "milestones" ? (
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Flag className="size-3.5" aria-hidden />
            Upcoming milestones
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {milestoneEvents.slice(0, 5).map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => setEditEvent(event)}
                className="glass-card shrink-0 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-left transition-all hover:-translate-y-px hover:shadow-md"
              >
                <p className="text-sm font-medium">{event.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatEventDateTime(event.start_time, event.end_time)}
                </p>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted-foreground" htmlFor="event-type-filter">
          Filter by type
        </label>
        <select
          id="event-type-filter"
          className={`${SELECT_CLASS} max-w-xs`}
          value={eventTypeFilter}
          onChange={(e) =>
            setEventTypeFilter(e.target.value as CalendarEventType | "all")
          }
        >
          <option value="all">All types</option>
          {EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {CALENDAR_EVENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        {selectedDay ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => setSelectedDay(null)}
          >
            Clear day filter
          </Button>
        ) : null}
      </div>

      {filteredEvents.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="glass-card w-full max-w-2xl rounded-2xl border border-border p-8 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-border bg-card/70">
              <Calendar className="size-6 text-muted-foreground" aria-hidden />
            </div>
            <h2 className="font-heading text-lg font-semibold">No events yet</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Add field events, fundraisers, compliance deadlines, and campaign
              milestones to your planner.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Button onClick={() => setCreateOpen(true)}>
                <Plus data-icon="inline-start" className="size-3.5" />
                Create your first event
              </Button>
              <Button variant="outline" size="sm" onClick={handleGenerateWeeklyPlan}>
                <MessageSquarePlus data-icon="inline-start" className="size-3.5" />
                Ask in chat
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedEvents.map(([month, monthEvents]) => (
            <section key={month}>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                {month}
              </h3>
              <div className="grid gap-3">
                {monthEvents.map((event) => (
                  <Card
                    key={event.id}
                    className={cn(
                      "transition-shadow hover:shadow-[var(--glass-shadow-pop)]",
                      event.is_milestone &&
                        "border-amber-500/25 bg-amber-500/[0.03]",
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <CardTitle className="flex items-center gap-2 text-base">
                            {event.is_milestone ? (
                              <Flag className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            ) : null}
                            {event.title}
                          </CardTitle>
                          <CardDescription>
                            {formatEventDateTime(event.start_time, event.end_time)}
                          </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <EventTypeBadge eventType={event.event_type} />
                          {event.is_milestone ? <MilestoneBadge /> : null}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {event.description ? (
                        <p className="text-sm text-muted-foreground">
                          {event.description}
                        </p>
                      ) : null}
                      {event.location ? (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="size-3.5 shrink-0" />
                          {event.location}
                        </p>
                      ) : null}
                      {event.related_asset_id ? (
                        <p className="text-xs text-muted-foreground">
                          Linked asset:{" "}
                          <span className="font-medium text-foreground">
                            {assetTitleById.get(event.related_asset_id) ??
                              "Approved asset"}
                          </span>
                        </p>
                      ) : null}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditEvent(event)}
                        >
                          <Pencil data-icon="inline-start" className="size-3.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteTarget(event)}
                        >
                          <Trash2 data-icon="inline-start" className="size-3.5" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <EventFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        approvedAssets={approvedAssets}
        onSuccess={refresh}
      />

      <EventFormDialog
        open={Boolean(editEvent)}
        onOpenChange={(open) => {
          if (!open) setEditEvent(null);
        }}
        approvedAssets={approvedAssets}
        event={editEvent}
        onSuccess={() => {
          setEditEvent(null);
          refresh();
        }}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setActionError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete event?</DialogTitle>
            <DialogDescription>
              This removes &ldquo;{deleteTarget?.title}&rdquo; from your campaign
              calendar. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {actionError ? (
            <p className="text-sm text-destructive" role="alert">
              {actionError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2
                    data-icon="inline-start"
                    className="size-4 animate-spin"
                  />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
