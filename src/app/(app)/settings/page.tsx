import { Suspense } from "react";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getIntegrationSummaries } from "@/actions/integrations";
import { SettingsPageClient } from "@/components/settings/settings-page-client";
import {
  getCampaignByOrganizationId,
  getCampaignProfile,
} from "@/lib/db/campaigns";
import { getOrganizationByClerkOrgId } from "@/lib/db/organizations";
import { modulePages } from "@/lib/navigation";
import { knowledgeStorageBackend } from "@/lib/campaign-knowledge/storage";

const SETTINGS_TABS = [
  "campaign",
  "integrations",
  "knowledge",
  "testing",
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number];

function parseTab(value: string | undefined): SettingsTab {
  if (value && (SETTINGS_TABS as readonly string[]).includes(value)) {
    return value as SettingsTab;
  }
  return "campaign";
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    integration?: string;
    result?: string;
    tab?: string;
    reason?: string;
  }>;
}) {
  const page = modulePages.settings;
  const params = await searchParams;
  const { orgId } = await auth();

  let orgName = "—";
  let campaign = null;
  let profile = null;

  if (orgId) {
    try {
      const client = await clerkClient();
      const org = await client.organizations.getOrganization({
        organizationId: orgId,
      });
      orgName = org.name;
    } catch {
      orgName = "—";
    }

    const organization = await getOrganizationByClerkOrgId(orgId);
    if (organization) {
      campaign = await getCampaignByOrganizationId(organization.id);
      if (campaign) {
        profile = await getCampaignProfile(campaign.id);
      }
    }
  }

  const integrationData = orgId
    ? await getIntegrationSummaries()
    : { ok: false, integrations: [], demoMode: false };

  const initialTab =
    params.integration || params.result
      ? "integrations"
      : parseTab(params.tab);

  const flashMessage = (() => {
    const provider = params.integration;
    const result = params.result;
    if (!provider || provider === "org_error") {
      return result === "error"
        ? "Could not connect integration. Sync your organization and try again."
        : null;
    }
    if (result === "success") {
      return `${provider.replaceAll("_", " ")} connected.`;
    }
    if (result === "error") {
      if (params.reason === "not_configured") {
        return `${provider.replaceAll("_", " ")} OAuth credentials are not configured for this deployment.`;
      }
      return `Could not connect ${provider.replaceAll("_", " ")}.`;
    }
    return null;
  })();

  return (
    <Suspense fallback={null}>
      <SettingsPageClient
        orgName={orgName}
        campaign={campaign}
        profile={profile}
        integrations={integrationData.integrations}
        demoMode={integrationData.demoMode}
        flashMessage={flashMessage}
        initialTab={initialTab}
        pageTitle={page.title}
        pageDescription={page.description}
        knowledgeStorageLabel={
          knowledgeStorageBackend() === "supabase"
            ? "cloud storage (Supabase)"
            : "local files on this server"
        }
      />
    </Suspense>
  );
}
