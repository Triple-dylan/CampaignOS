import {
  getActiveCampaignForClerkOrg,
  getCampaignByOrganizationId,
} from "@/lib/db/campaigns";
import { getOrganizationByClerkOrgId } from "@/lib/db/organizations";
import { isSupabaseConfigured } from "@/lib/db/client";
import type { Campaign, DbCampaign } from "@/lib/db/schema";
import { toCampaignSummary } from "@/lib/db/schema";

export async function getCampaign(clerkOrgId: string): Promise<Campaign | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const active = await getActiveCampaignForClerkOrg(clerkOrgId);
  if (active) {
    return active;
  }

  const organization = await getOrganizationByClerkOrgId(clerkOrgId);
  if (!organization) {
    return null;
  }

  const campaign = await getCampaignByOrganizationId(organization.id);
  return campaign ? toCampaignSummary(campaign) : null;
}

export async function getCampaignRecord(
  clerkOrgId: string,
): Promise<DbCampaign | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const organization = await getOrganizationByClerkOrgId(clerkOrgId);
  if (!organization) {
    return null;
  }

  return getCampaignByOrganizationId(organization.id, { status: "active" });
}
