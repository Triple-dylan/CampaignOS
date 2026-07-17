"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  disconnectIntegration,
  exportPlannerEventsToGoogleCalendar,
  importGoogleCalendarEvents,
  type IntegrationSummary,
} from "@/actions/integrations";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PROVIDER_LABELS: Record<string, string> = {
  canva: "Canva Connect",
  higgsfield: "Higgsfield MCP",
  google_calendar: "Google Calendar",
  gmail: "Gmail",
};

type IntegrationsPanelProps = {
  integrations: IntegrationSummary[];
  demoMode: boolean;
  calendarActionsEnabled?: boolean;
};

export function IntegrationsPanel({
  integrations,
  demoMode,
  calendarActionsEnabled = true,
}: IntegrationsPanelProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const assetProviders = integrations.filter(
    (row) => row.provider === "canva" || row.provider === "higgsfield",
  );
  const calendar = integrations.find((row) => row.provider === "google_calendar");
  const gmail = integrations.find((row) => row.provider === "gmail");

  const handleDisconnect = async (provider: IntegrationSummary["provider"]) => {
    setPending(provider);
    setMessage(null);
    try {
      const result = await disconnectIntegration(provider);
      if (result.ok) {
        setMessage(`${PROVIDER_LABELS[provider]} disconnected.`);
        router.refresh();
      } else {
        setMessage(result.error ?? "Disconnect failed.");
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Disconnect failed.",
      );
    } finally {
      setPending(null);
    }
  };

  const handleCalendarExport = async () => {
    setPending("gcal-export");
    setMessage(null);
    try {
      const result = await exportPlannerEventsToGoogleCalendar();
      if (result.ok) {
        const skipped =
          result.skipped > 0 ? ` (${result.skipped} already synced)` : "";
        setMessage(
          `Exported ${result.exported} planner events to Google Calendar.${skipped}`,
        );
        router.refresh();
      } else {
        setMessage(result.error);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Google Calendar export failed.",
      );
    } finally {
      setPending(null);
    }
  };

  const handleCalendarImport = async () => {
    setPending("gcal-import");
    setMessage(null);
    try {
      const result = await importGoogleCalendarEvents();
      if (result.ok) {
        const skipped =
          result.skipped > 0 ? ` (${result.skipped} already imported)` : "";
        setMessage(
          `Imported ${result.imported} events from Google Calendar.${skipped}`,
        );
        router.refresh();
      } else {
        setMessage(result.error);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Google Calendar import failed.",
      );
    } finally {
      setPending(null);
    }
  };

  if (integrations.length === 0) {
    return (
      <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Integrations will appear once your organization is synced. Refresh or
        reopen Settings if this stays empty.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {demoMode ? (
        <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Demo mode is on — connect buttons simulate OAuth and return
          placeholder exports when real provider credentials are not configured.
        </p>
      ) : null}

      {message ? (
        <p className="rounded-md border bg-muted/20 px-3 py-2 text-sm">{message}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {assetProviders.map((row) => (
          <IntegrationCard
            key={row.provider}
            title={PROVIDER_LABELS[row.provider] ?? row.provider}
            description={
              row.provider === "canva"
                ? "Brand templates, autofill, and exportable social graphics."
                : "AI image and short-video variations via MCP generation."
            }
            connected={row.status === "connected"}
            configured={row.configured}
            demoConnection={row.demoConnection}
            pending={pending === row.provider}
            connectHref={`/api/integrations/${row.provider}/connect`}
            onDisconnect={() => handleDisconnect(row.provider)}
          />
        ))}
      </div>

      {calendar ? (
        <div className="rounded-lg border bg-muted/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{PROVIDER_LABELS.google_calendar}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sync planner events with your campaign Google Calendar.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Status:{" "}
                <span className="font-medium capitalize">{calendar.status}</span>
                {calendar.demoConnection ? " · demo connection" : null}
                {!calendar.configured && calendar.status !== "connected"
                  ? " · OAuth credentials not set"
                  : null}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {calendar.status === "connected" ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      pending !== null || !calendarActionsEnabled
                    }
                    onClick={handleCalendarExport}
                    title={
                      calendarActionsEnabled
                        ? undefined
                        : "Load a campaign before syncing the planner"
                    }
                  >
                    Export planner
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      pending !== null || !calendarActionsEnabled
                    }
                    onClick={handleCalendarImport}
                    title={
                      calendarActionsEnabled
                        ? undefined
                        : "Load a campaign before syncing the planner"
                    }
                  >
                    Import events
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending === calendar.provider}
                    onClick={() => handleDisconnect(calendar.provider)}
                  >
                    Disconnect
                  </Button>
                </>
              ) : calendar.configured || demoMode ? (
                <a
                  href={`/api/integrations/${calendar.provider}/connect`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Connect Google Calendar
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Set Google Calendar OAuth credentials to connect.
                </span>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {gmail ? (
        <IntegrationCard
          title={PROVIDER_LABELS.gmail}
          description="Send approved outreach drafts from your campaign mailbox — used by fundraising and outreach workflows."
          connected={gmail.status === "connected"}
          configured={gmail.configured}
          demoConnection={gmail.demoConnection}
          pending={pending === gmail.provider}
          connectHref={`/api/integrations/${gmail.provider}/connect`}
          onDisconnect={() => handleDisconnect(gmail.provider)}
          connectDisabled={!gmail.configured && !demoMode}
        />
      ) : null}
    </div>
  );
}

function IntegrationCard({
  title,
  description,
  connected,
  configured,
  demoConnection,
  pending,
  connectHref,
  onDisconnect,
  connectDisabled = false,
}: {
  title: string;
  description: string;
  connected: boolean;
  configured: boolean;
  demoConnection: boolean;
  pending: boolean;
  connectHref: string;
  onDisconnect: () => void;
  connectDisabled?: boolean;
}) {
  const disabledConnect = connectDisabled || (!configured && !connected);

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Status:{" "}
            <span className="font-medium capitalize">
              {connected ? "connected" : "disconnected"}
            </span>
            {demoConnection ? " · demo connection" : null}
            {!configured && !connected ? " · OAuth credentials not set" : null}
          </p>
        </div>
        {connected ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={onDisconnect}
          >
            Disconnect
          </Button>
        ) : disabledConnect ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            Credentials required
          </span>
        ) : (
          <a
            href={connectHref}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Connect
          </a>
        )}
      </div>
    </div>
  );
}
