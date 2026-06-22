import type { User } from "@clerk/nextjs/server";
import {
  getCampaignByOrganizationId,
  getCampaignProfile,
} from "@/lib/db/campaigns";
import { getOrganizationByClerkOrgId } from "@/lib/db/organizations";
import { isSupabaseConfigured } from "@/lib/db/client";

export const ONBOARDING_COMPLETE_METADATA_KEY = "onboardingComplete";

export function isOnboardingCompleteInMetadata(user: User): boolean {
  return user.publicMetadata?.[ONBOARDING_COMPLETE_METADATA_KEY] === true;
}

export async function hasCampaignOnboardingInDatabase(
  clerkOrgId: string,
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const organization = await getOrganizationByClerkOrgId(clerkOrgId);
  if (!organization) {
    return false;
  }

  const campaign = await getCampaignByOrganizationId(organization.id, {
    status: "active",
  });

  if (!campaign) {
    return false;
  }

  const profile = await getCampaignProfile(campaign.id);
  if (!profile) {
    return false;
  }

  const hasBasics =
    Boolean(campaign.candidate_name?.trim()) &&
    Boolean(campaign.office_sought?.trim()) &&
    Boolean(campaign.election_date);

  const hasProfileData =
    (profile.top_issues?.length ?? 0) > 0 &&
    (profile.voter_segments?.length ?? 0) > 0 &&
    Boolean(profile.tone_preferences) &&
    Object.keys(profile.tone_preferences ?? {}).length > 0;

  return Boolean(hasBasics && hasProfileData);
}

export async function isOnboardingComplete(
  user: User,
  clerkOrgId?: string | null,
): Promise<boolean> {
  const metadataComplete = isOnboardingCompleteInMetadata(user);

  if (!clerkOrgId) {
    return metadataComplete;
  }

  const databaseComplete = await hasCampaignOnboardingInDatabase(clerkOrgId);

  return metadataComplete && databaseComplete;
}

/** @deprecated Use isOnboardingComplete instead */
export function isOnboardingCompleteSync(user: User): boolean {
  return isOnboardingCompleteInMetadata(user);
}
