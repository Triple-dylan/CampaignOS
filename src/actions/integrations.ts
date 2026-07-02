"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { ensureOrganizationSynced } from "@/actions/organizations";
import { requireCampaignContext } from "@/lib/auth/require-campaign-context";
import { listCalendarEvents } from "@/lib/db/calendar-events";
import {
  disconnectOrganizationIntegration,
  getOrganizationIntegration,
  listOrganizationIntegrations,
  upsertExternalMapping,
} from "@/lib/db/integrations";
import { getUserByClerkId } from "@/lib/db/users";
import {
  exportEventToGoogleCalendar,
  importEventsFromGoogleCalendar,
} from "@/lib/integrations/providers/google-calendar";
import type { IntegrationProvider } from "@/lib/integrations/types";
import { integrationOAuthConfigured } from "@/lib/integrations/oauth-config";
import { isIntegrationsDemoMode } from "@/lib/integrations/token-crypto";
import { persistPlannerEvent } from "@/lib/planner/persist-event";

export type IntegrationSummary = {
  provider: IntegrationProvider;
  status: string;
  configured: boolean;
  demoMode: boolean;
};

export async function getIntegrationSummaries(): Promise<{
  ok: boolean;
  integrations: IntegrationSummary[];
  demoMode: boolean;
}> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, integrations: [], demoMode: isIntegrationsDemoMode() };
  }

  const rows = await listOrganizationIntegrations(context.campaign.organization_id);
  const byProvider = new Map(rows.map((row) => [row.provider, row]));
  const providers: IntegrationProvider[] = [
    "canva",
    "higgsfield",
    "google_calendar",
  ];

  return {
    ok: true,
    demoMode: isIntegrationsDemoMode(),
    integrations: providers.map((provider) => ({
      provider,
      status: byProvider.get(provider)?.status ?? "disconnected",
      configured: integrationOAuthConfigured(provider),
      demoMode: isIntegrationsDemoMode(),
    })),
  };
}

export async function disconnectIntegration(provider: IntegrationProvider) {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false as const, error: context.error };
  }

  await disconnectOrganizationIntegration({
    organizationId: context.campaign.organization_id,
    provider,
  });

  revalidatePath("/settings");
  return { ok: true as const };
}

export async function exportPlannerEventsToGoogleCalendar() {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false as const, error: context.error };
  }

  const integration = await getOrganizationIntegration({
    organizationId: context.campaign.organization_id,
    provider: "google_calendar",
  });

  if (
    !integration ||
    (integration.status !== "connected" && !isIntegrationsDemoMode())
  ) {
    return {
      ok: false as const,
      error: "Connect Google Calendar in Settings first.",
      code: "integration_not_connected" as const,
    };
  }

  const events = await listCalendarEvents({
    campaignId: context.campaign.id,
  });

  let exported = 0;
  for (const event of events) {
    const payload = await exportEventToGoogleCalendar({
      accessToken: integration.accessToken,
      event,
    });
    await upsertExternalMapping({
      organizationId: context.campaign.organization_id,
      provider: "google_calendar",
      localObjectType: "calendar_event",
      localObjectId: event.id,
      externalId: payload.externalId,
      externalUrl: payload.externalUrl,
    });
    exported += 1;
  }

  revalidatePath("/planner");
  revalidatePath("/settings");
  return { ok: true as const, exported };
}

export async function importGoogleCalendarEvents() {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false as const, error: context.error };
  }

  const integration = await getOrganizationIntegration({
    organizationId: context.campaign.organization_id,
    provider: "google_calendar",
  });

  if (
    !integration ||
    (integration.status !== "connected" && !isIntegrationsDemoMode())
  ) {
    return {
      ok: false as const,
      error: "Connect Google Calendar in Settings first.",
      code: "integration_not_connected" as const,
    };
  }

  const importedEvents = await importEventsFromGoogleCalendar({
    accessToken: integration.accessToken,
  });

  let imported = 0;
  for (const item of importedEvents) {
    const result = await persistPlannerEvent({
      campaign: context.campaign,
      createdBy: context.dbUserId,
      title: item.title,
      description: item.description ?? undefined,
      eventType: "internal",
      startTime: item.startTime,
      endTime: item.endTime ?? undefined,
      location: item.location ?? undefined,
    });

    if (result.ok) {
      imported += 1;
      await upsertExternalMapping({
        organizationId: context.campaign.organization_id,
        provider: "google_calendar",
        localObjectType: "calendar_event",
        localObjectId: result.eventId,
        externalId: item.externalId,
      });
    }
  }

  revalidatePath("/planner");
  return { ok: true as const, imported };
}

export async function getIntegrationConnectUrl(provider: IntegrationProvider) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { ok: false as const, error: "Sign in required." };
  }

  const sync = await ensureOrganizationSynced();
  if (!sync.ok || !sync.organizationId) {
    return { ok: false as const, error: "Organization not synced." };
  }

  const dbUser = await getUserByClerkId(userId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const path = `/api/integrations/${provider}/connect`;

  return {
    ok: true as const,
    url: `${baseUrl}${path}`,
    organizationId: sync.organizationId,
    userId: dbUser?.id ?? null,
  };
}
