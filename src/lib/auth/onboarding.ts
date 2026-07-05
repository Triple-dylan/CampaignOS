import { clerkClient, type User } from "@clerk/nextjs/server";
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

async function syncOnboardingMetadataIfDatabaseComplete(
  user: User,
  clerkOrgId: string,
): Promise<boolean> {
  const databaseComplete = await hasCampaignOnboardingInDatabase(clerkOrgId);
  if (!databaseComplete) {
    return false;
  }

  if (isOnboardingCompleteInMetadata(user)) {
    return true;
  }

  try {
    const client = await clerkClient();
    await client.users.updateUser(user.id, {
      publicMetadata: {
        ...user.publicMetadata,
        [ONBOARDING_COMPLETE_METADATA_KEY]: true,
      },
    });
  } catch (error) {
    // DB completeness is the source of truth; metadata is a Clerk cache flag.
    console.error("[onboarding] Failed to sync Clerk metadata", error);
  }

  return true;
}

export async function isOnboardingComplete(
  user: User,
  clerkOrgId?: string | null,
): Promise<boolean> {
  if (!clerkOrgId) {
    return isOnboardingCompleteInMetadata(user);
  }

  return syncOnboardingMetadataIfDatabaseComplete(user, clerkOrgId);
}

/** @deprecated Use isOnboardingComplete instead */
export function isOnboardingCompleteSync(user: User): boolean {
  return isOnboardingCompleteInMetadata(user);
}
