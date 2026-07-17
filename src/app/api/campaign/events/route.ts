import { NextResponse } from "next/server";
import { requireCampaignContext } from "@/lib/auth/require-campaign-context";
import { listActivityEvents } from "@/lib/db/activity";
import { listActivePresence } from "@/lib/db/presence";

/**
 * Soft multiplayer poll endpoint.
 * Clients compare `latestActivityId` / `latestActivityAt` and refresh when peers mutate.
 * Presence is included so room awareness can update without a second round-trip.
 */
export async function GET() {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return NextResponse.json(
      { ok: false, error: context.error, code: context.code },
      { status: context.code === "unauthorized" ? 401 : 400 },
    );
  }

  try {
    const [events, presence] = await Promise.all([
      listActivityEvents(context.campaign.id, { limit: 1 }),
      listActivePresence(context.campaign.id),
    ]);

    const latest = events[0] ?? null;

    return NextResponse.json({
      ok: true,
      campaignId: context.campaign.id,
      latestActivityId: latest?.id ?? null,
      latestActivityAt: latest?.created_at ?? null,
      latestSummary: latest?.summary ?? null,
      presenceCount: presence.length,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[campaign/events]", error);
    return NextResponse.json(
      { ok: false, error: "Could not load campaign events." },
      { status: 500 },
    );
  }
}
