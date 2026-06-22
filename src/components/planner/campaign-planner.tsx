"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import {
  Calendar,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { deletePlannerEvent } from "@/actions/planner";
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

const EVENT_TYPES = calendarEventTypeSchema.options;

type ViewMode = "upcoming" | "all" | "milestones";

type CampaignPlannerProps = {
  events: DbCalendarEvent[];
  approvedAssets: DbAsset[];
};

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
  const [createOpen, setCreateOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<DbCalendarEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DbCalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("upcoming");
  const [eventTypeFilter, setEventTypeFilter] = useState<CalendarEventType | "all">(
    "all",
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const assetTitleById = useMemo(() => {
    return new Map(approvedAssets.map((asset) => [asset.id, asset.title]));
  }, [approvedAssets]);

  const filteredEvents = useMemo(() => {
    const now = new Date();

    return events.filter((event) => {
      if (eventTypeFilter !== "all" && event.event_type !== eventTypeFilter) {
        return false;
      }
      if (viewMode === "milestones" && !event.is_milestone) {
        return false;
      }
      if (viewMode === "upcoming") {
        const start = new Date(event.start_time);
        return !Number.isNaN(start.getTime()) && start >= now;
      }
      return true;
    });
  }, [events, eventTypeFilter, viewMode]);

  const groupedEvents = useMemo(
    () => groupEventsByMonth(filteredEvents),
    [filteredEvents],
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

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={viewMode === "upcoming" ? "default" : "outline"}
            onClick={() => setViewMode("upcoming")}
          >
            Upcoming
          </Button>
          <Button
            size="sm"
            variant={viewMode === "all" ? "default" : "outline"}
            onClick={() => setViewMode("all")}
          >
            All events
          </Button>
          <Button
            size="sm"
            variant={viewMode === "milestones" ? "default" : "outline"}
            onClick={() => setViewMode("milestones")}
          >
            Milestones
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled
            title="Coming soon"
          >
            <Sparkles data-icon="inline-start" className="size-3.5" />
            Generate weekly plan
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" className="size-3.5" />
            New event
          </Button>
        </div>
      </div>

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
      </div>

      {filteredEvents.length === 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <CardTitle>No events yet</CardTitle>
            </div>
            <CardDescription>
              Add field events, fundraisers, compliance deadlines, and campaign
              milestones to your planner.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus data-icon="inline-start" className="size-3.5" />
              Create your first event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {groupedEvents.map(([month, monthEvents]) => (
            <section key={month}>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                {month}
              </h3>
              <div className="grid gap-3">
                {monthEvents.map((event) => (
                  <Card key={event.id}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <CardTitle className="text-base">{event.title}</CardTitle>
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
