"use server";

import { auth } from "@clerk/nextjs/server";
import {
  getCampaignGraphPreferences,
  updateCampaignGraphPreferences as persistGraphPreferences,
} from "@/lib/db/campaigns";
import { getOrganizationByClerkOrgId } from "@/lib/db/organizations";
import { getCampaignByOrganizationId } from "@/lib/db/campaigns";
import {
  mergeCampaignGraphPreferences,
  type CampaignGraphPreferences,
} from "@/lib/graph/graph-preferences";

export type GraphPreferencesResult =
  | { ok: true; preferences: CampaignGraphPreferences }
  | { ok: false; error: string };

export async function loadCampaignGraphPreferences(
  campaignId: string,
): Promise<GraphPreferencesResult> {
  try {
    const stored = await getCampaignGraphPreferences(campaignId);
    return {
      ok: true,
      preferences: mergeCampaignGraphPreferences(stored),
    };
  } catch {
    return { ok: false, error: "Failed to load graph preferences." };
  }
}

export async function saveCampaignGraphPreferences(
  campaignId: string,
  preferences: CampaignGraphPreferences,
): Promise<{ ok: boolean; error?: string }> {
  const { orgId } = await auth();
  if (!orgId) {
    return { ok: false, error: "Unauthorized." };
  }

  const organization = await getOrganizationByClerkOrgId(orgId);
  if (!organization) {
    return { ok: false, error: "Organization not found." };
  }

  const campaign = await getCampaignByOrganizationId(organization.id);
  if (!campaign || campaign.id !== campaignId) {
    return { ok: false, error: "Campaign not found." };
  }

  try {
    await persistGraphPreferences(campaignId, preferences);
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to save graph preferences." };
  }
}
