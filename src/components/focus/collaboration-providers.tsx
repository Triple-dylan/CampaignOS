"use client";

import * as React from "react";
import { FocusProvider } from "@/components/focus/focus-provider";
import { useCampaign } from "@/components/campaign/campaign-context";
import { PresenceProvider } from "@/components/presence/presence-provider";

/** Bridges campaign id into Focus + Presence providers inside the app shell. */
export function CollaborationProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const { campaign } = useCampaign();
  return (
    <FocusProvider key={campaign?.id ?? "no-campaign"} campaignId={campaign?.id ?? null}>
      <PresenceProvider>{children}</PresenceProvider>
    </FocusProvider>
  );
}
