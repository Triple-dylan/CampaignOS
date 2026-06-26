import { z } from "zod";

export const WA_STATE_CODE = "WA";

export const onboardingBasicsSchema = z.object({
  candidateName: z.string().min(1, "Candidate name is required"),
  officeSought: z.string().min(1, "Office sought is required"),
  jurisdiction: z.string().min(1, "Jurisdiction is required"),
  state: z.string().length(2, "Use a 2-letter state code").default(WA_STATE_CODE),
  district: z.string().optional(),
  party: z.string().optional(),
  electionDate: z.string().date("Enter a valid election date"),
});

export const voterSegmentSchema = z.object({
  name: z.string().min(1, "Segment name is required"),
  description: z.string().optional(),
});

export const tonePreferencesSchema = z.object({
  selectedTones: z
    .array(z.string().min(1))
    .min(1, "Select at least one brand tone"),
  notes: z.string().optional(),
});

export const onboardingIssuesSchema = z.object({
  topIssues: z
    .array(z.string().min(1))
    .min(1, "Select at least one top issue")
    .max(12),
});

export const onboardingVotersSchema = z.object({
  voterSegments: z
    .array(voterSegmentSchema)
    .min(1, "Add at least one target voter segment"),
});

export const onboardingBrandSchema = z.object({
  tonePreferences: tonePreferencesSchema,
  fundraisingGoal: z
    .union([z.number().nonnegative("Fundraising goal must be zero or greater"), z.null()])
    .optional(),
});

export const onboardingFundraisingSchema = onboardingBrandSchema.pick({
  fundraisingGoal: true,
});

export const onboardingFormSchema = onboardingBasicsSchema
  .merge(onboardingIssuesSchema)
  .merge(onboardingVotersSchema)
  .merge(onboardingBrandSchema)
  .merge(onboardingFundraisingSchema);

export type OnboardingBasicsInput = z.infer<typeof onboardingBasicsSchema>;
export type OnboardingIssuesInput = z.infer<typeof onboardingIssuesSchema>;
export type OnboardingVotersInput = z.infer<typeof onboardingVotersSchema>;
export type OnboardingBrandInput = z.infer<typeof onboardingBrandSchema>;
export type OnboardingFundraisingInput = z.infer<
  typeof onboardingFundraisingSchema
>;
export type OnboardingFormInput = z.infer<typeof onboardingFormSchema>;
export type VoterSegmentInput = z.infer<typeof voterSegmentSchema>;
export type TonePreferencesInput = z.infer<typeof tonePreferencesSchema>;

export const ONBOARDING_STEPS = [
  "basics",
  "issues",
  "voters",
  "brand",
  "review",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const onboardingStepSchemas: Record<
  Exclude<OnboardingStep, "review">,
  z.ZodTypeAny
> = {
  basics: onboardingBasicsSchema,
  issues: onboardingIssuesSchema,
  voters: onboardingVotersSchema,
  brand: onboardingBrandSchema,
};

export const TOP_ISSUE_PRESETS = [
  "Housing affordability",
  "Public safety",
  "Climate & environment",
  "Education funding",
  "Healthcare access",
  "Transportation & infrastructure",
  "Small business & economy",
  "Homelessness",
  "Taxes & fiscal policy",
  "Labor & workers' rights",
] as const;

export const BRAND_TONE_OPTIONS = [
  "Authentic & grassroots",
  "Bold & aspirational",
  "Policy-focused & substantive",
  "Community-centered",
  "Pragmatic & results-driven",
  "Populist & energetic",
] as const;

export const VOTER_SEGMENT_SUGGESTIONS = [
  "Suburban moderates",
  "Young renters",
  "Small business owners",
  "Union households",
  "Senior voters",
  "Latino community",
  "Rural voters",
  "College-educated professionals",
] as const;

export const US_STATES = [
  { code: "WA", name: "Washington" },
  { code: "OR", name: "Oregon" },
  { code: "CA", name: "California" },
  { code: "ID", name: "Idaho" },
  { code: "MT", name: "Montana" },
  { code: "AK", name: "Alaska" },
] as const;

export const OFFICE_SOUGHT_OPTIONS = [
  "City Council",
  "Mayor",
  "School Board",
  "County Commissioner",
  "County Executive",
  "Port Commissioner",
  "State Representative",
  "State Senator",
  "Governor",
  "Lieutenant Governor",
  "Attorney General",
  "Secretary of State",
  "State Treasurer",
  "Auditor",
  "Commissioner of Public Lands",
  "Insurance Commissioner",
  "Superintendent of Public Instruction",
  "U.S. Representative",
  "U.S. Senator",
] as const;

export const PARTY_OPTIONS = [
  "Democratic",
  "Republican",
  "Independent",
  "Nonpartisan",
  "Green",
  "Libertarian",
] as const;

export const FUNDRAISING_GOAL_PRESETS = [
  { label: "$25k", value: 25_000 },
  { label: "$50k", value: 50_000 },
  { label: "$100k", value: 100_000 },
  { label: "$250k", value: 250_000 },
] as const;

export const OFFICE_JURISDICTION_DEFAULTS: Record<string, string> = {
  "State Senator": "Washington State Senate",
  "State Representative": "Washington House of Representatives",
  Governor: "State of Washington",
  "Lieutenant Governor": "State of Washington",
  "Attorney General": "State of Washington",
  "Secretary of State": "State of Washington",
  "State Treasurer": "State of Washington",
  Auditor: "State of Washington",
  "Commissioner of Public Lands": "State of Washington",
  "Insurance Commissioner": "State of Washington",
  "Superintendent of Public Instruction": "State of Washington",
  "U.S. Representative": "United States House of Representatives",
  "U.S. Senator": "United States Senate",
};

export const OFFICE_DISTRICT_PLACEHOLDERS: Record<string, string> = {
  "State Senator": "e.g. LD 34",
  "State Representative": "e.g. LD 34, Position 1",
  "U.S. Representative": "e.g. WA-07",
  "City Council": "e.g. Seattle City Council, District 3",
  Mayor: "e.g. City of Tacoma",
  "School Board": "e.g. Seattle School Board, District 5",
  "County Commissioner": "e.g. King County, District 2",
  "Port Commissioner": "e.g. Port of Seattle, Position 3",
};

/** First Tuesday after the first Monday in November (US general election). */
export function getGeneralElectionDate(year: number): Date {
  const novemberFirst = new Date(year, 10, 1);
  const weekday = novemberFirst.getDay();
  const firstMonday =
    weekday === 1 ? 1 : weekday === 0 ? 2 : 1 + (8 - weekday);
  return new Date(year, 10, firstMonday + 1);
}

export function getDefaultElectionDate(from = new Date()): string {
  const startYear = from.getFullYear();
  for (let year = startYear; year <= startYear + 3; year += 1) {
    if (year % 2 !== 0) continue;
    const election = getGeneralElectionDate(year);
    if (election >= from) {
      const pad = (value: number) => String(value).padStart(2, "0");
      return `${election.getFullYear()}-${pad(election.getMonth() + 1)}-${pad(election.getDate())}`;
    }
  }
  const fallback = getGeneralElectionDate(startYear + 2);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${fallback.getFullYear()}-${pad(fallback.getMonth() + 1)}-${pad(fallback.getDate())}`;
}

export function suggestJurisdictionForOffice(
  office: string,
  stateCode = WA_STATE_CODE,
): string | undefined {
  const preset = OFFICE_JURISDICTION_DEFAULTS[office];
  if (preset) return preset;
  if (stateCode === WA_STATE_CODE) {
    return "Washington";
  }
  const state = US_STATES.find((entry) => entry.code === stateCode);
  return state?.name;
}
