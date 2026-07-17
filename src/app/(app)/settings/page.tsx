import { Suspense } from "react";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getIntegrationSummaries } from "@/actions/integrations";
import { listTeamMembers } from "@/actions/team";
import { SettingsPageClient } from "@/components/settings/settings-page-client";
import {
  getCampaignByOrganizationId,
  getCampaignProfile,
} from "@/lib/db/campaigns";
import { getOrganizationByClerkOrgId } from "@/lib/db/organizations";
import { modulePages } from "@/lib/navigation";
import { knowledgeStorageBackend } from "@/lib/campaign-knowledge/storage";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ integration?: string; result?: string }>;
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

  const teamData = await listTeamMembers();

  const flashMessage = (() => {
    const provider = params.integration;
    const result = params.result;
    if (!provider || provider === "org_error") {
      return result === "error" ? "Could not connect integration." : null;
    }
    if (result === "success") {
      return `${provider.replace("_", " ")} connected.`;
    }
    if (result === "error") {
      return `Could not connect ${provider.replace("_", " ")}.`;
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
        pageTitle={page.title}
        pageDescription={page.description}
        knowledgeStorageLabel={
          knowledgeStorageBackend() === "supabase"
            ? "cloud storage (Supabase)"
            : "local files on this server"
        }
        teamMembers={teamData.members}
        canManageTeam={teamData.canManage}
      />
    </Suspense>
  );
}
