"use server";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureOrganizationSynced } from "@/actions/organizations";
import {
  ONBOARDING_COMPLETE_METADATA_KEY,
  isOnboardingCompleteInMetadata,
} from "@/lib/auth/onboarding";
import { seedCampaignGraphNodes } from "@/lib/db/graph";
import { ensureCampaignKnowledgeBootstrapped } from "@/lib/campaign-knowledge/ensure";
import {
  createCampaign,
  getCampaignByOrganizationId,
  getCampaignProfile,
  updateCampaign,
  upsertCampaignProfile,
} from "@/lib/db/campaigns";
import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";
import {
  onboardingFormSchema,
  onboardingStepSchemas,
  type OnboardingFormInput,
  type OnboardingStep,
} from "@/lib/validators/onboarding";

export type OnboardingData = {
  campaignId: string | null;
  campaign: DbCampaign | null;
  profile: DbCampaignProfile | null;
  formDefaults: Partial<OnboardingFormInput>;
};

export type CampaignActionResult =
  | { ok: true; campaignId: string }
  | {
      ok: false;
      error: string;
      code?: "missing_org" | "sync_failed" | "validation" | "unauthorized";
    };

function mapCampaignToFormDefaults(
  campaign: DbCampaign | null,
  profile: DbCampaignProfile | null,
): Partial<OnboardingFormInput> {
  const tonePrefs = profile?.tone_preferences as
    | { selectedTones?: string[]; notes?: string }
    | null
    | undefined;

  const voterSegments = (profile?.voter_segments ?? []) as Array<{
    name?: string;
    description?: string;
  }>;

  return {
    candidateName: campaign?.candidate_name ?? "",
    officeSought: campaign?.office_sought ?? "",
    jurisdiction: campaign?.jurisdiction ?? "",
    state: campaign?.state ?? "WA",
    district: campaign?.district ?? "",
    party: campaign?.party ?? "",
    electionDate: campaign?.election_date ?? "",
    topIssues: profile?.top_issues ?? [],
    voterSegments: voterSegments
      .filter((segment) => segment.name?.trim())
      .map((segment) => ({
        name: segment.name ?? "",
        description: segment.description,
      })),
    tonePreferences: {
      selectedTones: tonePrefs?.selectedTones ?? [],
      notes: tonePrefs?.notes ?? "",
    },
    fundraisingGoal: profile?.fundraising_goal ?? null,
  };
}

async function requireOrgContext() {
  const { userId, orgId } = await auth();

  if (!userId) {
    return { ok: false as const, error: "Sign in required", code: "unauthorized" as const };
  }

  if (!orgId) {
    return {
      ok: false as const,
      error: "Select or create a campaign organization to continue.",
      code: "missing_org" as const,
    };
  }

  const sync = await ensureOrganizationSynced();
  if (!sync.ok || !sync.organizationId) {
    return {
      ok: false as const,
      error: "Could not sync your organization. Try again in a moment.",
      code: "sync_failed" as const,
    };
  }

  return {
    ok: true as const,
    userId,
    orgId,
    organizationId: sync.organizationId,
  };
}

async function upsertDraftCampaign(
  organizationId: string,
  data: Partial<OnboardingFormInput>,
  options?: { activate?: boolean },
) {
  const existing = await getCampaignByOrganizationId(organizationId);

  const campaignFields = {
    candidateName: data.candidateName,
    officeSought: data.officeSought,
    jurisdiction: data.jurisdiction,
    state: data.state ?? "WA",
    district: data.district,
    party: data.party,
    electionDate: data.electionDate,
    campaignStatus: options?.activate ? ("active" as const) : ("draft" as const),
  };

  let campaign: DbCampaign | null = null;

  if (existing) {
    const result = await updateCampaign({
      id: existing.id,
      ...campaignFields,
    });
    campaign = result.campaign;
  } else {
    const result = await createCampaign({
      organizationId,
      ...campaignFields,
    });
    campaign = result.campaign;
  }

  if (!campaign) {
    throw new Error("Campaign could not be saved");
  }

  if (
    data.topIssues !== undefined ||
    data.voterSegments !== undefined ||
    data.tonePreferences !== undefined ||
    data.fundraisingGoal !== undefined
  ) {
    await upsertCampaignProfile({
      campaignId: campaign.id,
      topIssues: data.topIssues,
      voterSegments: data.voterSegments,
      tonePreferences: data.tonePreferences,
      fundraisingGoal: data.fundraisingGoal,
      summary: data.candidateName
        ? `${data.candidateName} for ${data.officeSought ?? "office"}`
        : undefined,
    });
  }

  return campaign;
}

export async function getOnboardingData(): Promise<
  OnboardingData | { error: string }
> {
  const context = await requireOrgContext();
  if (!context.ok) {
    return { error: context.error };
  }

  const campaign = await getCampaignByOrganizationId(context.organizationId);
  const profile = campaign ? await getCampaignProfile(campaign.id) : null;

  return {
    campaignId: campaign?.id ?? null,
    campaign,
    profile,
    formDefaults: mapCampaignToFormDefaults(campaign, profile),
  };
}

export async function saveOnboardingStep(
  step: Exclude<OnboardingStep, "review">,
  data: Record<string, unknown>,
): Promise<CampaignActionResult> {
  const context = await requireOrgContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const parsed = onboardingStepSchemas[step].safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid step data",
      code: "validation",
    };
  }

  try {
    const campaign = await upsertDraftCampaign(
      context.organizationId,
      parsed.data as Partial<OnboardingFormInput>,
    );

    revalidatePath("/onboarding");
    revalidatePath("/settings");

    return { ok: true, campaignId: campaign.id };
  } catch (error) {
    console.error("[saveOnboardingStep]", error);
    return { ok: false, error: "Failed to save progress. Please try again." };
  }
}

export async function completeOnboarding(
  data: OnboardingFormInput,
): Promise<CampaignActionResult> {
  const context = await requireOrgContext();
  if (!context.ok) {
    return { ok: false, error: context.error, code: context.code };
  }

  const parsed = onboardingFormSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid onboarding data",
      code: "validation",
    };
  }

  try {
    const campaign = await upsertDraftCampaign(
      context.organizationId,
      parsed.data,
      { activate: true },
    );

    await seedCampaignGraphNodes({
      campaignId: campaign.id,
      candidateName: parsed.data.candidateName,
      topIssues: parsed.data.topIssues,
      voterSegments: parsed.data.voterSegments,
    });

    await ensureCampaignKnowledgeBootstrapped({
      organizationId: campaign.organization_id,
      campaignId: campaign.id,
      campaign,
      topIssues: parsed.data.topIssues,
      voterSegments: parsed.data.voterSegments,
    });

    revalidatePath("/brain");

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

    revalidatePath("/onboarding");
    revalidatePath("/dashboard");
    revalidatePath("/settings");

    redirect("/dashboard");
  } catch (error) {
    if (
      error instanceof Error &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("[completeOnboarding]", error);
    return {
      ok: false,
      error: "Failed to complete onboarding. Please try again.",
    };
  }
}

export async function markOnboardingCompleteMetadata(): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    return;
  }

  const user = await currentUser();
  if (!user || isOnboardingCompleteInMetadata(user)) {
    return;
  }

  const client = await clerkClient();
  await client.users.updateUser(userId, {
    publicMetadata: {
      ...user.publicMetadata,
      [ONBOARDING_COMPLETE_METADATA_KEY]: true,
    },
  });
}
