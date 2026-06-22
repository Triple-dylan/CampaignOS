"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { ensureOrganizationSynced } from "@/actions/organizations";
import { isOpenAiConfigured } from "@/lib/ai/config";
import { generateCampaignBrainOutput } from "@/lib/ai/generate-campaign-brain";
import {
  enrichCampaignBrainGraph,
} from "@/lib/db/graph";
import {
  getCampaignByOrganizationId,
  getCampaignProfile,
  listGraphEdges,
  listGraphNodes,
  upsertCampaignProfile,
} from "@/lib/db/campaigns";
import { getUserByClerkId } from "@/lib/db/users";
import { campaignDisplayName } from "@/lib/db/schema";

export type GenerateCampaignBrainResult =
  | { ok: true; generatedAt: string }
  | {
      ok: false;
      error: string;
      code?:
        | "missing_org"
        | "missing_campaign"
        | "missing_openai"
        | "unauthorized"
        | "generation_failed";
    };

async function requireBrainGenerationContext() {
  const { userId, orgId } = await auth();

  if (!userId) {
    return {
      ok: false as const,
      error: "Sign in required",
      code: "unauthorized" as const,
    };
  }

  if (!orgId) {
    return {
      ok: false as const,
      error: "Select or create a campaign organization to continue.",
      code: "missing_org" as const,
    };
  }

  if (!isOpenAiConfigured()) {
    return {
      ok: false as const,
      error:
        "OpenAI is not configured. Add OPENAI_API_KEY to your environment to generate a Campaign Brain.",
      code: "missing_openai" as const,
    };
  }

  const sync = await ensureOrganizationSynced();
  if (!sync.ok || !sync.organizationId) {
    return {
      ok: false as const,
      error: "Could not sync your organization. Try again in a moment.",
      code: "missing_org" as const,
    };
  }

  const campaign = await getCampaignByOrganizationId(sync.organizationId);
  if (!campaign) {
    return {
      ok: false as const,
      error: "Complete onboarding before generating a Campaign Brain.",
      code: "missing_campaign" as const,
    };
  }

  const profile = await getCampaignProfile(campaign.id);
  const dbUser = await getUserByClerkId(userId);

  return {
    ok: true as const,
    campaign,
    profile,
    userId: dbUser?.id ?? null,
  };
}

export async function generateCampaignBrain(): Promise<GenerateCampaignBrainResult> {
  const context = await requireBrainGenerationContext();
  if (!context.ok) {
    return {
      ok: false,
      error: context.error,
      code: context.code,
    };
  }

  try {
    const brain = await generateCampaignBrainOutput({
      campaign: context.campaign,
      profile: context.profile,
      campaignId: context.campaign.id,
      userId: context.userId,
    });

    const generatedAt = new Date().toISOString();

    await upsertCampaignProfile({
      campaignId: context.campaign.id,
      summary: brain.summary,
      messageFramework: brain.messageFramework,
      issueMap: brain.issueMap,
      brainGeneratedAt: generatedAt,
    });

    const [existingNodes, existingEdges] = await Promise.all([
      listGraphNodes(context.campaign.id),
      listGraphEdges(context.campaign.id),
    ]);

    await enrichCampaignBrainGraph({
      campaignId: context.campaign.id,
      candidateName: campaignDisplayName(context.campaign),
      brain,
      existingNodes,
      existingEdges,
    });

    revalidatePath("/dashboard");
    revalidatePath("/brain");

    return { ok: true, generatedAt };
  } catch (error) {
    console.error("[generateCampaignBrain]", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Campaign Brain generation failed. Please try again.",
      code: "generation_failed",
    };
  }
}

export async function getCampaignBrainAvailability() {
  const { orgId } = await auth();
  const openAiConfigured = isOpenAiConfigured();

  if (!orgId) {
    return {
      openAiConfigured,
      hasCampaign: false,
      hasBrain: false,
    };
  }

  const sync = await ensureOrganizationSynced();
  if (!sync.ok || !sync.organizationId) {
    return {
      openAiConfigured,
      hasCampaign: false,
      hasBrain: false,
    };
  }

  const campaign = await getCampaignByOrganizationId(sync.organizationId);
  if (!campaign) {
    return {
      openAiConfigured,
      hasCampaign: false,
      hasBrain: false,
    };
  }

  const profile = await getCampaignProfile(campaign.id);

  return {
    openAiConfigured,
    hasCampaign: true,
    hasBrain: Boolean(profile?.brain_generated_at && profile.summary),
  };
}
