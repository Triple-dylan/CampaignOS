"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useOptionalCampaignFocus } from "@/components/focus/focus-provider";

type CampaignEventsPayload = {
  ok: boolean;
  latestActivityId?: string | null;
  latestActivityAt?: string | null;
  presenceCount?: number;
};

const POLL_MS = 12_000;

/**
 * Soft multiplayer fanout: poll campaign activity and refresh the RSC tree
 * when a peer (or agent) writes a new activity event.
 */
export function useCampaignRealtime(enabled = true) {
  const router = useRouter();
  const focus = useOptionalCampaignFocus()?.focus;
  const latestIdRef = React.useRef<string | null>(null);
  const [presenceCount, setPresenceCount] = React.useState(0);

  React.useEffect(() => {
    if (!enabled || !focus?.campaignId) return;

    let cancelled = false;

    const tick = async () => {
      try {
        const response = await fetch("/api/campaign/events", {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as CampaignEventsPayload;
        if (!payload.ok || cancelled) return;

        setPresenceCount(payload.presenceCount ?? 0);

        const nextId = payload.latestActivityId ?? null;
        if (latestIdRef.current === null) {
          latestIdRef.current = nextId;
          return;
        }
        if (nextId && nextId !== latestIdRef.current) {
          latestIdRef.current = nextId;
          router.refresh();
        }
      } catch {
        // Ignore transient network errors; next poll retries.
      }
    };

    const start = window.setTimeout(() => {
      void tick();
    }, 1500);
    const interval = window.setInterval(() => {
      void tick();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, [enabled, focus?.campaignId, router]);

  return { presenceCount };
}
