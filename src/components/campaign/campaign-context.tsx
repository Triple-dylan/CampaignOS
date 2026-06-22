"use client";

import { createContext, useContext } from "react";
import type { CampaignContextValue } from "@/lib/campaign/get-campaign-context";

const CampaignContext = createContext<CampaignContextValue | null>(null);

export function CampaignProvider({
  value,
  children,
}: {
  value: CampaignContextValue;
  children: React.ReactNode;
}) {
  return (
    <CampaignContext.Provider value={value}>{children}</CampaignContext.Provider>
  );
}

export function useCampaign(): CampaignContextValue {
  const context = useContext(CampaignContext);

  if (!context) {
    throw new Error("useCampaign must be used within CampaignProvider");
  }

  return context;
}
