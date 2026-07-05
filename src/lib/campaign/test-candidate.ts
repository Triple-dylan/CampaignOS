import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";
import type { OnboardingFormInput } from "@/lib/validators/onboarding";

/**
 * Default test candidate for development, onboarding prefills, and the
 * /preview/workspace demo. Trinh Ha is running for U.S. House in WA-08 (2026).
 *
 * Sources: FEC (H6WA08159), WA Secretary of State candidate list, Ballotpedia,
 * trinhhaforcongress.com.
 */
export const TEST_CANDIDATE_NAME = "Trinh Ha";

export const TEST_CANDIDATE_ORG_NAME = "Trinh Ha for Congress";

export const TEST_CANDIDATE_ONBOARDING_DEFAULTS: OnboardingFormInput = {
  candidateName: TEST_CANDIDATE_NAME,
  officeSought: "U.S. Representative",
  jurisdiction: "United States House of Representatives",
  state: "WA",
  district: "8",
  party: "Republican",
  electionDate: "2026-11-03",
  topIssues: [
    "Public safety",
    "Education funding",
    "Small business & economy",
    "Healthcare access",
    "Taxes & fiscal policy",
  ],
  voterSegments: [
    {
      name: "Suburban moderates",
      description:
        "Persuasion voters across eastside suburbs and exurban Pierce County.",
    },
    {
      name: "Young families",
      description:
        "Working families in Issaquah, Sammamish, and surrounding communities.",
    },
    {
      name: "Senior voters",
      description:
        "High-turnout voters focused on public safety and veterans issues.",
    },
  ],
  tonePreferences: {
    selectedTones: [
      "Authentic & grassroots",
      "Bold & aspirational",
      "Pragmatic & results-driven",
    ],
    notes:
      "Personal story of fleeing communist Vietnam; freedom, family, and service-focused voice.",
  },
  fundraisingGoal: 500_000,
};

export const TEST_CANDIDATE_BIO =
  "Vietnamese-American scholar and former U.S. Department of Veterans Affairs consultant (2019–2025). Her family fled communist violence in Vietnam; she earned a Ph.D. from UC Berkeley and is running to defend freedom and represent working families in Washington's 8th Congressional District.";

export const TEST_CANDIDATE_SUMMARY =
  "Defend freedom, empower families, and renew America — a voice for immigrants, working families, and everyday Americans in WA-08.";

export const TEST_CANDIDATE_THEMES = [
  "Defend freedom",
  "Empower families",
  "People-first economy",
] as const;

export const TEST_CANDIDATE_OPPONENT = "Kim Schrier";

const DEMO_NOW = "2026-01-01T00:00:00.000Z";

/** Campaign row fields for preview/demo fixtures. */
export function buildTestCandidateCampaign(
  overrides?: Partial<DbCampaign>,
): DbCampaign {
  return {
    id: "demo-campaign",
    organization_id: "demo-org",
    candidate_name: TEST_CANDIDATE_NAME,
    office_sought: "U.S. Representative",
    jurisdiction: "United States House of Representatives",
    state: "WA",
    district: "8",
    party: "Republican",
    election_date: "2026-11-03",
    campaign_website: "https://trinhhaforcongress.com",
    campaign_status: "active",
    graph_preferences: null,
    created_at: DEMO_NOW,
    updated_at: DEMO_NOW,
    ...overrides,
  };
}

/** Profile row fields for preview/demo fixtures. */
export function buildTestCandidateProfile(
  campaignId: string,
  overrides?: Partial<DbCampaignProfile>,
): DbCampaignProfile {
  return {
    id: "demo-profile",
    campaign_id: campaignId,
    candidate_bio: TEST_CANDIDATE_BIO,
    campaign_themes: [...TEST_CANDIDATE_THEMES],
    top_issues: TEST_CANDIDATE_ONBOARDING_DEFAULTS.topIssues,
    voter_segments: TEST_CANDIDATE_ONBOARDING_DEFAULTS.voterSegments,
    tone_preferences: TEST_CANDIDATE_ONBOARDING_DEFAULTS.tonePreferences,
    opponent_names: [TEST_CANDIDATE_OPPONENT],
    fundraising_goal: TEST_CANDIDATE_ONBOARDING_DEFAULTS.fundraisingGoal ?? null,
    summary: TEST_CANDIDATE_SUMMARY,
    message_framework: {
      valueProposition: "Defend freedom. Empower families. Renew America.",
      keyMessages: [
        "Strong schools and safe streets for every neighborhood",
        "Smart immigration and a people-first economy",
        "Stand up for veterans who stood up for us",
      ],
      toneGuidance:
        "Authentic, aspirational, and grounded in service — lead with Trinh's American story.",
      taglines: ["Trinh Ha for Congress", "Defend Freedom. Empower Families."],
    },
    issue_map: null,
    brain_generated_at: DEMO_NOW,
    created_at: DEMO_NOW,
    updated_at: DEMO_NOW,
    ...overrides,
  };
}

/** Use test-candidate defaults when no saved candidate name exists yet. */
export function resolveOnboardingFormDefaults(
  mapped: Partial<OnboardingFormInput>,
  campaign: { candidate_name?: string | null } | null,
): Partial<OnboardingFormInput> {
  if (campaign?.candidate_name?.trim()) {
    return mapped;
  }

  return {
    ...TEST_CANDIDATE_ONBOARDING_DEFAULTS,
    ...mapped,
    candidateName: mapped.candidateName?.trim()
      ? mapped.candidateName
      : TEST_CANDIDATE_ONBOARDING_DEFAULTS.candidateName,
    officeSought: mapped.officeSought?.trim()
      ? mapped.officeSought
      : TEST_CANDIDATE_ONBOARDING_DEFAULTS.officeSought,
    jurisdiction: mapped.jurisdiction?.trim()
      ? mapped.jurisdiction
      : TEST_CANDIDATE_ONBOARDING_DEFAULTS.jurisdiction,
    state: mapped.state?.trim() ? mapped.state : TEST_CANDIDATE_ONBOARDING_DEFAULTS.state,
    district: mapped.district?.trim()
      ? mapped.district
      : TEST_CANDIDATE_ONBOARDING_DEFAULTS.district,
    party: mapped.party?.trim() ? mapped.party : TEST_CANDIDATE_ONBOARDING_DEFAULTS.party,
    electionDate: mapped.electionDate?.trim()
      ? mapped.electionDate
      : TEST_CANDIDATE_ONBOARDING_DEFAULTS.electionDate,
    topIssues: mapped.topIssues?.length
      ? mapped.topIssues
      : TEST_CANDIDATE_ONBOARDING_DEFAULTS.topIssues,
    voterSegments: mapped.voterSegments?.length
      ? mapped.voterSegments
      : TEST_CANDIDATE_ONBOARDING_DEFAULTS.voterSegments,
    tonePreferences: mapped.tonePreferences?.selectedTones?.length
      ? mapped.tonePreferences
      : TEST_CANDIDATE_ONBOARDING_DEFAULTS.tonePreferences,
    fundraisingGoal:
      mapped.fundraisingGoal != null
        ? mapped.fundraisingGoal
        : TEST_CANDIDATE_ONBOARDING_DEFAULTS.fundraisingGoal,
  };
}
