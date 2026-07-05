"use server";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { ensureOrganizationSynced } from "@/actions/organizations";
import {
  ONBOARDING_COMPLETE_METADATA_KEY,
  isOnboardingCompleteInMetadata,
} from "@/lib/auth/onboarding";
import { seedTrinhHaCampaignForOrganization } from "@/lib/campaign/seed-trinh-ha-campaign";

export type LoadTrinhHaResult =
  | { ok: true; campaignId: string; message: string }
  | { ok: false; error: string };

export async function loadTrinhHaTestCampaign(): Promise<LoadTrinhHaResult> {
  const { userId, orgId } = await auth();

  if (!userId) {
    return { ok: false, error: "Sign in required." };
  }

  if (!orgId) {
    return {
      ok: false,
      error: "Select or create a campaign organization first.",
    };
  }

  const sync = await ensureOrganizationSynced();
  if (!sync.ok || !sync.organizationId) {
    return {
      ok: false,
      error: "Could not sync your organization. Try again in a moment.",
    };
  }

  try {
    const { campaignId } = await seedTrinhHaCampaignForOrganization(
      sync.organizationId,
    );

    const user = await currentUser();
    if (user && !isOnboardingCompleteInMetadata(user)) {
      const client = await clerkClient();
      await client.users.updateUser(user.id, {
        publicMetadata: {
          ...user.publicMetadata,
          [ONBOARDING_COMPLETE_METADATA_KEY]: true,
        },
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/settings");
    revalidatePath("/research");
    revalidatePath("/brain");

    return {
      ok: true,
      campaignId,
      message:
        "Loaded Trinh Ha (WA-08) test campaign with research briefs and knowledge base.",
    };
  } catch (error) {
    console.error("[loadTrinhHaTestCampaign]", error);
    return {
      ok: false,
      error: "Failed to load the Trinh Ha test campaign. Check Supabase config.",
    };
  }
}
