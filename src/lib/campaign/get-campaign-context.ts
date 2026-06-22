import { auth, clerkClient } from "@clerk/nextjs/server";
import { cache } from "react";
import { hasCampaignOnboardingInDatabase } from "@/lib/auth/onboarding";
import { getCampaignProfile } from "@/lib/db/campaigns";
import { getCampaignRecord } from "@/lib/db/queries";
import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";

export type CampaignContextValue = {
  orgId: string | null;
  orgName: string;
  campaign: DbCampaign | null;
  profile: DbCampaignProfile | null;
  isSetupComplete: boolean;
};

export const getCampaignContext = cache(async (): Promise<CampaignContextValue> => {
  const { orgId } = await auth();

  let orgName = "Campaign organization";

  if (orgId) {
    try {
      const client = await clerkClient();
      const org = await client.organizations.getOrganization({
        organizationId: orgId,
      });
      orgName = org.name;
    } catch {
      orgName = "Campaign organization";
    }
  }

  let campaign: DbCampaign | null = null;
  let profile: DbCampaignProfile | null = null;
  let isSetupComplete = false;

  if (orgId) {
    campaign = await getCampaignRecord(orgId);
    if (campaign) {
      profile = await getCampaignProfile(campaign.id);
    }
    isSetupComplete = await hasCampaignOnboardingInDatabase(orgId);
  }

  return {
    orgId: orgId ?? null,
    orgName,
    campaign,
    profile,
    isSetupComplete,
  };
});
