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
};

type IntegrationsPanelProps = {
  integrations: IntegrationSummary[];
  demoMode: boolean;
  flashMessage?: string | null;
};

export function IntegrationsPanel({
  integrations,
  demoMode,
  flashMessage = null,
}: IntegrationsPanelProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(flashMessage);

  const assetProviders = integrations.filter(
    (row) => row.provider === "canva" || row.provider === "higgsfield",
  );
  const calendar = integrations.find((row) => row.provider === "google_calendar");

  const handleDisconnect = async (provider: IntegrationSummary["provider"]) => {
    setPending(provider);
    setMessage(null);
    const result = await disconnectIntegration(provider);
    setPending(null);
    if (result.ok) {
      setMessage(`${PROVIDER_LABELS[provider]} disconnected.`);
      router.refresh();
    } else {
      setMessage(result.error ?? "Disconnect failed.");
    }
  };

  const handleCalendarExport = async () => {
    setPending("gcal-export");
    setMessage(null);
    const result = await exportPlannerEventsToGoogleCalendar();
    setPending(null);
    if (result.ok) {
      setMessage(`Exported ${result.exported} planner events to Google Calendar.`);
      router.refresh();
    } else {
      setMessage(result.error);
    }
  };

  const handleCalendarImport = async () => {
    setPending("gcal-import");
    setMessage(null);
    const result = await importGoogleCalendarEvents();
    setPending(null);
    if (result.ok) {
      setMessage(`Imported ${result.imported} events from Google Calendar.`);
      router.refresh();
    } else {
      setMessage(result.error);
    }
  };

  return (
    <div className="space-y-6">
      {demoMode ? (
        <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Demo mode is on (<code>INTEGRATIONS_DEMO_MODE=true</code>). Connect
          buttons simulate OAuth and return placeholder exports.
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
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {calendar.status === "connected" ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending !== null}
                    onClick={handleCalendarExport}
                  >
                    Export planner
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending !== null}
                    onClick={handleCalendarImport}
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
              ) : (
                <a
                  href={`/api/integrations/${calendar.provider}/connect`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Connect Google Calendar
                </a>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IntegrationCard({
  title,
  description,
  connected,
  configured,
  pending,
  connectHref,
  onDisconnect,
}: {
  title: string;
  description: string;
  connected: boolean;
  configured: boolean;
  pending: boolean;
  connectHref: string;
  onDisconnect: () => void;
}) {
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
