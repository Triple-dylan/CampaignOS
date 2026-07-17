"use client";

import { useCampaignRealtime } from "@/hooks/use-campaign-realtime";

/** Mount once in the app shell to keep shared modules fresh for teammates. */
export function CampaignRealtimeBridge() {
  useCampaignRealtime(true);
  return null;
}
