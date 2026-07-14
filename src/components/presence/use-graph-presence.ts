"use client";

import { useOptionalPresence } from "@/components/presence/presence-provider";

/**
 * Returns peer counts keyed by object id for graph node adornments.
 * Used by Brain / work desk to show who is attending shared objects.
 */
export function useGraphPresenceByObject(): Map<string, number> {
  const presence = useOptionalPresence();
  const map = new Map<string, number>();
  if (!presence) return map;

  for (const peer of presence.peers) {
    if (peer.isSelf || !peer.objectId) continue;
    map.set(peer.objectId, (map.get(peer.objectId) ?? 0) + 1);
  }
  return map;
}
