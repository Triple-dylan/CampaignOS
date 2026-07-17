"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { ensureOrganizationSynced } from "@/actions/organizations";
import { requireCampaignContext } from "@/lib/auth/require-campaign-context";
import { listCalendarEvents } from "@/lib/db/calendar-events";
import {
  disconnectOrganizationIntegration,
  getOrganizationIntegration,
  listExternalMappings,
  listOrganizationIntegrations,
  upsertExternalMapping,
} from "@/lib/db/integrations";
import { getUserByClerkId } from "@/lib/db/users";
import {
  exportEventToGoogleCalendar,
  importEventsFromGoogleCalendar,
} from "@/lib/integrations/providers/google-calendar";
import type { IntegrationProvider } from "@/lib/integrations/types";
import {
  getFreshIntegrationAccessToken,
  isDemoIntegrationConnection,
} from "@/lib/integrations/refresh";
import { appBaseUrl, integrationOAuthConfigured } from "@/lib/integrations/oauth-config";
import { isIntegrationsDemoMode } from "@/lib/integrations/token-crypto";
import { persistPlannerEvent } from "@/lib/planner/persist-event";

export type IntegrationSummary = {
  provider: IntegrationProvider;
  status: string;
  configured: boolean;
  demoMode: boolean;
  demoConnection: boolean;
};

async function resolveOrganizationId(): Promise<
  | { ok: true; organizationId: string }
  | { ok: false; error: string }
> {
  const sync = await ensureOrganizationSynced();
  if (!sync.ok) {
    return {
      ok: false,
      error:
        sync.reason === "supabase_not_configured"
          ? "Supabase is not configured."
          : "Select or create a campaign organization to continue.",
    };
  }
  if (!sync.organizationId) {
    return {
      ok: false,
      error: "Select or create a campaign organization to continue.",
    };
  }
  return { ok: true, organizationId: sync.organizationId };
}

export async function getIntegrationSummaries(): Promise<{
  ok: boolean;
  integrations: IntegrationSummary[];
  demoMode: boolean;
  error?: string;
}> {
  const org = await resolveOrganizationId();
  if (!org.ok) {
    return {
      ok: false,
      integrations: [],
      demoMode: isIntegrationsDemoMode(),
      error: org.error,
    };
  }

  const rows = await listOrganizationIntegrations(org.organizationId);
  const byProvider = new Map(rows.map((row) => [row.provider, row]));
  const providers: IntegrationProvider[] = [
    "canva",
    "higgsfield",
    "google_calendar",
    "gmail",
  ];

  return {
    ok: true,
    demoMode: isIntegrationsDemoMode(),
    integrations: providers.map((provider) => {
      const row = byProvider.get(provider);
      const demoConnection = row
        ? isDemoIntegrationConnection(row)
        : false;
      return {
        provider,
        status: row?.status ?? "disconnected",
        configured: integrationOAuthConfigured(provider),
        demoMode: isIntegrationsDemoMode(),
        demoConnection,
      };
    }),
  };
}

export async function disconnectIntegration(provider: IntegrationProvider) {
  const org = await resolveOrganizationId();
  if (!org.ok) {
    return { ok: false as const, error: org.error };
  }

  await disconnectOrganizationIntegration({
    organizationId: org.organizationId,
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

  try {
    const events = await listCalendarEvents({
      campaignId: context.campaign.id,
    });

    const existingMappings = await listExternalMappings({
      organizationId: context.campaign.organization_id,
      provider: "google_calendar",
      localObjectType: "calendar_event",
    });
    const mappedLocalIds = new Set(
      existingMappings.map((mapping) => mapping.localObjectId),
    );

    const accessToken = await getFreshIntegrationAccessToken({
      organizationId: context.campaign.organization_id,
      provider: "google_calendar",
    });

    let exported = 0;
    let skipped = 0;
    for (const event of events) {
      if (mappedLocalIds.has(event.id)) {
        skipped += 1;
        continue;
      }

      const payload = await exportEventToGoogleCalendar({
        accessToken,
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
    return { ok: true as const, exported, skipped };
  } catch (error) {
    console.error("[exportPlannerEventsToGoogleCalendar]", error);
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Google Calendar export failed.",
    };
  }
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

  try {
    const accessToken = await getFreshIntegrationAccessToken({
      organizationId: context.campaign.organization_id,
      provider: "google_calendar",
    });

    const importedEvents = await importEventsFromGoogleCalendar({
      accessToken,
    });

    const existingMappings = await listExternalMappings({
      organizationId: context.campaign.organization_id,
      provider: "google_calendar",
      localObjectType: "calendar_event",
    });
    const mappedExternalIds = new Set(
      existingMappings.map((mapping) => mapping.externalId),
    );

    let imported = 0;
    let skipped = 0;
    for (const item of importedEvents) {
      if (mappedExternalIds.has(item.externalId)) {
        skipped += 1;
        continue;
      }

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
    revalidatePath("/settings");
    return { ok: true as const, imported, skipped };
  } catch (error) {
    console.error("[importGoogleCalendarEvents]", error);
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Google Calendar import failed.",
    };
  }
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
  const baseUrl = appBaseUrl();
  const path = `/api/integrations/${provider}/connect`;

  return {
    ok: true as const,
    url: `${baseUrl}${path}`,
    organizationId: sync.organizationId,
    userId: dbUser?.id ?? null,
  };
}
