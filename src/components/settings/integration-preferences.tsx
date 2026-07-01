"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export type IntegrationKey = "google_calendar" | "gmail" | "canva" | "higgsfield";

const STORAGE_KEY = "campaignos.integration-preferences";

type IntegrationPreferences = Partial<Record<IntegrationKey, boolean>>;

const INTEGRATIONS: Array<{
  key: IntegrationKey;
  title: string;
  description: string;
  workflowUse: string;
}> = [
  {
    key: "google_calendar",
    title: "Google Calendar",
    description:
      "Import event dates and locations for event research and export timeline milestones.",
    workflowUse: "Event research · Campaign structure",
  },
  {
    key: "gmail",
    title: "Gmail",
    description:
      "Pull invitation context and staff notes into research workflows with explicit permission.",
    workflowUse: "Event research · Incumbent research",
  },
  {
    key: "canva",
    title: "Canva Connect",
    description: "Export approved copy into brand templates and save design URLs on assets.",
    workflowUse: "Content creation",
  },
  {
    key: "higgsfield",
    title: "Higgsfield",
    description: "Generate image or short-video variations from approved creative prompts.",
    workflowUse: "Content creation",
  },
];

function readPreferences(): IntegrationPreferences {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as IntegrationPreferences) : {};
  } catch {
    return {};
  }
}

function writePreferences(prefs: IntegrationPreferences) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function useIntegrationPreferences() {
  const [prefs, setPrefs] = React.useState<IntegrationPreferences>(() =>
    typeof window === "undefined" ? {} : readPreferences(),
  );

  const setEnabled = React.useCallback((key: IntegrationKey, enabled: boolean) => {
    setPrefs((current) => {
      const next = { ...current, [key]: enabled };
      writePreferences(next);
      return next;
    });
  }, []);

  return { prefs, setEnabled };
}

export function IntegrationPreferencesPanel() {
  const { prefs, setEnabled } = useIntegrationPreferences();

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {INTEGRATIONS.map((integration) => {
        const enabled = prefs[integration.key] ?? false;
        return (
          <div
            key={integration.key}
            className="rounded-lg border bg-muted/20 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{integration.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {integration.description}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Workflows: {integration.workflowUse}
                </p>
              </div>
              <span
                className={
                  enabled
                    ? "shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400"
                    : "shrink-0 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground"
                }
              >
                {enabled ? "Opted in" : "Off"}
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant={enabled ? "outline" : "default"}
              className="mt-4"
              onClick={() => setEnabled(integration.key, !enabled)}
            >
              {enabled ? "Disable" : "Enable when connected"}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              OAuth connection ships in a later milestone. Workflows degrade to
              model-only generation while integrations are off.
            </p>
          </div>
        );
      })}
    </div>
  );
}
