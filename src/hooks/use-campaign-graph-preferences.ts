"use client";

import * as React from "react";
import {
  saveCampaignGraphPreferences,
  loadCampaignGraphPreferences,
} from "@/actions/graph-preferences";
import {
  DEFAULT_CAMPAIGN_GRAPH_PREFERENCES,
  graphPreferencesStorageKey,
  mergeCampaignGraphPreferences,
  type CampaignGraphPreferences,
} from "@/lib/graph/graph-preferences";

const SAVE_DEBOUNCE_MS = 400;

function readLocalPreferences(
  campaignId: string,
): CampaignGraphPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(
      graphPreferencesStorageKey(campaignId),
    );
    if (!raw) return null;
    return mergeCampaignGraphPreferences(
      JSON.parse(raw) as Partial<CampaignGraphPreferences>,
    );
  } catch {
    return null;
  }
}

function writeLocalPreferences(
  campaignId: string,
  preferences: CampaignGraphPreferences,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      graphPreferencesStorageKey(campaignId),
      JSON.stringify(preferences),
    );
  } catch {
    // Quota or private browsing — ignore.
  }
}

export type UseCampaignGraphPreferencesResult = {
  preferences: CampaignGraphPreferences;
  updatePreferences: (
    patch:
      | Partial<CampaignGraphPreferences>
      | ((prev: CampaignGraphPreferences) => CampaignGraphPreferences),
  ) => void;
  resetPreferences: () => void;
  isHydrated: boolean;
};

/**
 * Per-campaign graph preferences with dual persistence:
 * - **localStorage** (immediate, works in preview/demo without Supabase)
 * - **Supabase** `campaigns.graph_preferences` (debounced server save when auth)
 *
 * On load: localStorage first for instant hydration, then server merge if newer.
 */
export function useCampaignGraphPreferences(
  campaignId: string | null | undefined,
  serverSeed?: Partial<CampaignGraphPreferences> | null,
): UseCampaignGraphPreferencesResult {
  const id = campaignId ?? "anonymous";

  const [preferences, setPreferences] = React.useState<CampaignGraphPreferences>(
    () =>
      mergeCampaignGraphPreferences(
        readLocalPreferences(id) ?? serverSeed ?? null,
      ),
  );
  const [isHydrated] = React.useState(true);
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from server on mount (real campaigns) — localStorage seeds initial state.
  React.useEffect(() => {
    if (!campaignId || campaignId === "anonymous") return;
    let cancelled = false;

    void loadCampaignGraphPreferences(campaignId).then((result) => {
      if (cancelled || !result.ok) return;
      setPreferences(result.preferences);
      writeLocalPreferences(campaignId, result.preferences);
    });

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const scheduleSave = React.useCallback(
    (next: CampaignGraphPreferences) => {
      if (!campaignId || campaignId === "anonymous") return;
      writeLocalPreferences(campaignId, next);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void saveCampaignGraphPreferences(campaignId, next);
      }, SAVE_DEBOUNCE_MS);
    },
    [campaignId],
  );

  React.useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const updatePreferences = React.useCallback(
    (
      patch:
        | Partial<CampaignGraphPreferences>
        | ((prev: CampaignGraphPreferences) => CampaignGraphPreferences),
    ) => {
      setPreferences((prev) => {
        const next =
          typeof patch === "function"
            ? patch(prev)
            : mergeCampaignGraphPreferences({ ...prev, ...patch });
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const resetPreferences = React.useCallback(() => {
    const next = { ...DEFAULT_CAMPAIGN_GRAPH_PREFERENCES };
    setPreferences(next);
    scheduleSave(next);
  }, [scheduleSave]);

  return { preferences, updatePreferences, resetPreferences, isHydrated };
}
