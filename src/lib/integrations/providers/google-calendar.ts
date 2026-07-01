import type { DbCalendarEvent } from "@/lib/db/schema";
import { isIntegrationsDemoMode } from "@/lib/integrations/token-crypto";

export type GoogleCalendarEventPayload = {
  externalId: string;
  externalUrl: string;
  title: string;
  startTime: string;
  endTime: string | null;
};

function demoGoogleEventUrl(eventId: string): string {
  return `https://calendar.google.com/calendar/event?eid=${encodeURIComponent(eventId)}`;
}

export async function exportEventToGoogleCalendar(input: {
  accessToken?: string;
  event: DbCalendarEvent;
}): Promise<GoogleCalendarEventPayload> {
  if (isIntegrationsDemoMode() || !input.accessToken) {
    const externalId = `demo-gcal-${input.event.id}`;
    return {
      externalId,
      externalUrl: demoGoogleEventUrl(externalId),
      title: input.event.title,
      startTime: input.event.start_time,
      endTime: input.event.end_time,
    };
  }

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: input.event.title,
        description: input.event.description ?? undefined,
        location: input.event.location ?? undefined,
        start: { dateTime: input.event.start_time },
        end: {
          dateTime:
            input.event.end_time ??
            new Date(
              new Date(input.event.start_time).getTime() + 60 * 60 * 1000,
            ).toISOString(),
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Calendar export failed: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as { id: string; htmlLink?: string };
  return {
    externalId: data.id,
    externalUrl: data.htmlLink ?? demoGoogleEventUrl(data.id),
    title: input.event.title,
    startTime: input.event.start_time,
    endTime: input.event.end_time,
  };
}

export type ImportedGoogleEvent = {
  externalId: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  location: string | null;
};

export async function importEventsFromGoogleCalendar(input: {
  accessToken?: string;
  timeMin?: string;
  timeMax?: string;
}): Promise<ImportedGoogleEvent[]> {
  if (isIntegrationsDemoMode() || !input.accessToken) {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() + 7);
    return [
      {
        externalId: "demo-gcal-import-1",
        title: "Imported town hall (demo)",
        description: "Sample event from Google Calendar demo import.",
        startTime: start.toISOString(),
        endTime: new Date(start.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        location: "Community center",
      },
    ];
  }

  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  });
  if (input.timeMin) params.set("timeMin", input.timeMin);
  if (input.timeMax) params.set("timeMax", input.timeMax);

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Calendar import failed: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    items?: Array<{
      id: string;
      summary?: string;
      description?: string;
      location?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }>;
  };

  return (data.items ?? []).map((item) => ({
    externalId: item.id,
    title: item.summary ?? "Untitled event",
    description: item.description ?? null,
    location: item.location ?? null,
    startTime:
      item.start?.dateTime ??
      (item.start?.date ? `${item.start.date}T09:00:00.000Z` : new Date().toISOString()),
    endTime:
      item.end?.dateTime ??
      (item.end?.date ? `${item.end.date}T10:00:00.000Z` : null),
  }));
}
