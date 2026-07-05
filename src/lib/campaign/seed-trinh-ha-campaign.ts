import {
  TEST_CANDIDATE_ONBOARDING_DEFAULTS,
  TEST_CANDIDATE_ORG_NAME,
  TEST_CANDIDATE_RESEARCH_BRIEFS,
  buildTestCandidateProfile,
} from "@/lib/campaign/test-candidate";
import { ensureCampaignKnowledgeBootstrapped } from "@/lib/campaign-knowledge/ensure";
import {
  createCampaign,
  getCampaignByOrganizationId,
  updateCampaign,
  upsertCampaignProfile,
} from "@/lib/db/campaigns";
import { seedCampaignGraphNodes } from "@/lib/db/graph";
import {
  createResearchBrief,
  listResearchBriefs,
} from "@/lib/db/research-briefs";
import type { DbCampaign } from "@/lib/db/schema";
import type { OnboardingFormInput } from "@/lib/validators/onboarding";

async function upsertTrinhHaCampaign(
  organizationId: string,
): Promise<DbCampaign> {
  const data: OnboardingFormInput = TEST_CANDIDATE_ONBOARDING_DEFAULTS;
  const existing = await getCampaignByOrganizationId(organizationId);

  const campaignFields = {
    candidateName: data.candidateName,
    officeSought: data.officeSought,
    jurisdiction: data.jurisdiction,
    state: data.state ?? "WA",
    district: data.district,
    party: data.party,
    electionDate: data.electionDate,
    campaignWebsite: "https://trinhhaforcongress.com",
    campaignStatus: "active" as const,
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

  const profileSeed = buildTestCandidateProfile(campaign.id);
  await upsertCampaignProfile({
    campaignId: campaign.id,
    candidateBio: profileSeed.candidate_bio ?? undefined,
    campaignThemes: profileSeed.campaign_themes ?? [],
    topIssues: profileSeed.top_issues ?? data.topIssues,
    voterSegments: profileSeed.voter_segments ?? data.voterSegments,
    tonePreferences: profileSeed.tone_preferences ?? data.tonePreferences,
    opponentNames: profileSeed.opponent_names ?? [],
    fundraisingGoal: profileSeed.fundraising_goal ?? undefined,
    summary: profileSeed.summary ?? undefined,
    messageFramework: profileSeed.message_framework ?? undefined,
  });

  return campaign;
}

export async function seedTrinhHaResearchBriefs(campaignId: string) {
  const existing = await listResearchBriefs({ campaignId });
  const existingTitles = new Set(
    existing.map((brief) => brief.title.trim().toLowerCase()),
  );

  for (const brief of TEST_CANDIDATE_RESEARCH_BRIEFS) {
    if (existingTitles.has(brief.title.trim().toLowerCase())) {
      continue;
    }
    await createResearchBrief({
      campaignId,
      ...brief,
    });
  }
}

export async function seedTrinhHaCampaignForOrganization(organizationId: string) {
  const campaign = await upsertTrinhHaCampaign(organizationId);

  await seedCampaignGraphNodes({
    campaignId: campaign.id,
    candidateName: TEST_CANDIDATE_ONBOARDING_DEFAULTS.candidateName,
    topIssues: TEST_CANDIDATE_ONBOARDING_DEFAULTS.topIssues,
    voterSegments: TEST_CANDIDATE_ONBOARDING_DEFAULTS.voterSegments,
  });

  await ensureCampaignKnowledgeBootstrapped({
    organizationId: campaign.organization_id,
    campaignId: campaign.id,
    campaign,
    topIssues: TEST_CANDIDATE_ONBOARDING_DEFAULTS.topIssues,
    voterSegments: TEST_CANDIDATE_ONBOARDING_DEFAULTS.voterSegments,
  });

  await seedTrinhHaResearchBriefs(campaign.id);

  return {
    campaignId: campaign.id,
    orgName: TEST_CANDIDATE_ORG_NAME,
  };
}
