"use server";

import { requireCampaignContext } from "@/lib/auth/require-campaign-context";
import { listActivityEvents } from "@/lib/db/activity";
import type { DbActivityEvent } from "@/lib/db/schema";

export async function getCampaignActivity(options?: {
  limit?: number;
  objectType?: string;
  objectId?: string;
}): Promise<{
  ok: boolean;
  events: DbActivityEvent[];
  error?: string;
}> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, events: [], error: context.error };
  }

  try {
    const events = await listActivityEvents(context.campaign.id, options);
    return { ok: true, events };
  } catch (error) {
    console.error("[activity] list failed", error);
    return { ok: false, events: [], error: "Could not load activity." };
  }
}
