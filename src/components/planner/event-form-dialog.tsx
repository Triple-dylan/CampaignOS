"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  createPlannerEvent,
  updatePlannerEvent,
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
import { MOBILE_DIALOG_CONTENT_CLASS } from "@/lib/mobile-dialog";
import {
  fromDatetimeLocalValue,
  SELECT_CLASS,
  TEXTAREA_CLASS,
  toDatetimeLocalValue,
} from "@/lib/form/datetime";
import { cn } from "@/lib/utils";
import type { DbAsset, DbCalendarEvent } from "@/lib/db/schema";
import {
  CALENDAR_EVENT_TYPE_LABELS,
  calendarEventTypeSchema,
  type CalendarEventType,
} from "@/lib/validators/calendar-events";

const EVENT_TYPES = calendarEventTypeSchema.options;

type EventFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approvedAssets: DbAsset[];
  event?: DbCalendarEvent | null;
  onSuccess?: () => void;
};

type EventFormContentProps = {
  approvedAssets: DbAsset[];
  event?: DbCalendarEvent | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

function EventFormContent({
  approvedAssets,
  event,
  onOpenChange,
  onSuccess,
}: EventFormContentProps) {
  const isEdit = Boolean(event);
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [eventType, setEventType] = useState<CalendarEventType>(
    (event?.event_type as CalendarEventType) ?? "public_event",
  );
  const [startTime, setStartTime] = useState(
    toDatetimeLocalValue(event?.start_time),
  );
  const [endTime, setEndTime] = useState(toDatetimeLocalValue(event?.end_time));
  const [location, setLocation] = useState(event?.location ?? "");
  const [relatedAssetId, setRelatedAssetId] = useState(
    event?.related_asset_id ?? "",
  );
  const [isMilestone, setIsMilestone] = useState(event?.is_milestone ?? false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);

    const startIso = fromDatetimeLocalValue(startTime);
    const endIso = endTime ? fromDatetimeLocalValue(endTime) : undefined;

    startTransition(async () => {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        eventType,
        startTime: startIso,
        endTime: endIso,
        location: location.trim() || undefined,
        relatedAssetId: relatedAssetId || null,
        isMilestone,
      };

      const result = isEdit && event
        ? await updatePlannerEvent({
            eventId: event.id,
            ...payload,
            description: description.trim() || null,
            endTime: endIso ?? null,
            location: location.trim() || null,
          })
        : await createPlannerEvent(payload);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      onSuccess?.();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit event" : "Create event"}</DialogTitle>
        <DialogDescription>
          Schedule campaign events, deadlines, and field activities. Link
          approved assets when relevant.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="event-title">Title</Label>
          <Input
            id="event-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Town hall — housing forum"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="event-type">Event type</Label>
            <select
              id="event-type"
              className={SELECT_CLASS}
              value={eventType}
              onChange={(e) =>
                setEventType(e.target.value as CalendarEventType)
              }
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CALENDAR_EVENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2 pb-1">
            <input
              id="event-milestone"
              type="checkbox"
              className="size-4 rounded border-input"
              checked={isMilestone}
              onChange={(e) => setIsMilestone(e.target.checked)}
            />
            <Label htmlFor="event-milestone" className="cursor-pointer">
              Mark as milestone
            </Label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="event-start">Start</Label>
            <Input
              id="event-start"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-end">End (optional)</Label>
            <Input
              id="event-end"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="event-location">Location (optional)</Label>
          <Input
            id="event-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Community center, 123 Main St"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="event-description">Description (optional)</Label>
          <textarea
            id="event-description"
            className={TEXTAREA_CLASS}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Agenda, staffing notes, or prep checklist…"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="event-asset">Related asset (optional)</Label>
          <select
            id="event-asset"
            className={SELECT_CLASS}
            value={relatedAssetId}
            onChange={(e) => setRelatedAssetId(e.target.value)}
          >
            <option value="">None</option>
            {approvedAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.title}
              </option>
            ))}
          </select>
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
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !title.trim() || !startTime}>
            {isPending ? (
              <>
                <Loader2
                  data-icon="inline-start"
                  className="size-4 animate-spin"
                />
                Saving…
              </>
            ) : isEdit ? (
              "Save changes"
            ) : (
              "Create event"
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function EventFormDialog({
  open,
  onOpenChange,
  approvedAssets,
  event,
  onSuccess,
}: EventFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-lg", MOBILE_DIALOG_CONTENT_CLASS)}>
        {open ? (
          <EventFormContent
            key={event?.id ?? "create"}
            approvedAssets={approvedAssets}
            event={event}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
