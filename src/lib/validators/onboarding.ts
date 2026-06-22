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
});

export const onboardingFundraisingSchema = z.object({
  fundraisingGoal: z
    .union([z.number().nonnegative("Fundraising goal must be zero or greater"), z.null()])
    .optional(),
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
  "fundraising",
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
  fundraising: onboardingFundraisingSchema,
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
