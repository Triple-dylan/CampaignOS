"use client";

import * as React from "react";
import {
  heartbeatPresence,
  leavePresence,
  type PresencePeer,
} from "@/actions/presence";
import { useOptionalCampaignFocus } from "@/components/focus/focus-provider";
import type { PresenceAction } from "@/lib/db/schema";

type PresenceContextValue = {
  peers: PresencePeer[];
  objectPeers: PresencePeer[];
  setAction: (action: PresenceAction) => void;
  refresh: () => Promise<void>;
};

const PresenceContext = React.createContext<PresenceContextValue | null>(null);

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const focusApi = useOptionalCampaignFocus();
  const focus = focusApi?.focus;
  const [peers, setPeers] = React.useState<PresencePeer[]>([]);
  const [action, setAction] = React.useState<PresenceAction>("viewing");
  const focusKey = `${focus?.campaignId ?? ""}:${focus?.module ?? ""}:${focus?.objectType ?? ""}:${focus?.objectId ?? ""}:${action}`;

  const refresh = React.useCallback(async () => {
    if (!focus?.campaignId) {
      setPeers([]);
      return;
    }
    const result = await heartbeatPresence({
      module: focus.module,
      objectType: focus.objectType,
      objectId: focus.objectId,
      action,
    });
    if (result.ok) {
      setPeers(result.peers);
    }
  }, [action, focus]);

  React.useEffect(() => {
    let cancelled = false;
    const tick = () => {
      void refresh().then(() => {
        if (cancelled) return;
      });
    };
    // Defer initial heartbeat out of the sync mount path.
    const start = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 20_000);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
      window.clearInterval(interval);
      void leavePresence();
    };
  }, [focusKey, refresh]);

  const objectPeers = !focus?.objectId
    ? peers.filter((peer) => !peer.isSelf)
    : peers.filter(
        (peer) =>
          !peer.isSelf &&
          peer.objectType === focus.objectType &&
          peer.objectId === focus.objectId,
      );

  const value: PresenceContextValue = {
    peers,
    objectPeers,
    setAction,
    refresh,
  };

  return (
    <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
  );
}

export function usePresence(): PresenceContextValue {
  const ctx = React.useContext(PresenceContext);
  if (!ctx) {
    throw new Error("usePresence must be used within PresenceProvider");
  }
  return ctx;
}

export function useOptionalPresence(): PresenceContextValue | null {
  return React.useContext(PresenceContext);
}
