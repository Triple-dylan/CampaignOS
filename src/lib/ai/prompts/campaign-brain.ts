import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";

function formatTonePreferences(
  tonePreferences: DbCampaignProfile["tone_preferences"],
): string {
  const prefs = tonePreferences as
    | { selectedTones?: string[]; notes?: string }
    | null
    | undefined;

  const tones = prefs?.selectedTones?.filter(Boolean) ?? [];
  const notes = prefs?.notes?.trim();

  if (tones.length === 0 && !notes) {
    return "Not specified";
  }

  const parts = [];
  if (tones.length > 0) {
    parts.push(`Selected tones: ${tones.join(", ")}`);
  }
  if (notes) {
    parts.push(`Notes: ${notes}`);
  }

  return parts.join(". ");
}

function formatVoterSegments(
  voterSegments: DbCampaignProfile["voter_segments"],
): string {
  const segments = (voterSegments ?? []) as Array<{
    name?: string;
    description?: string;
  }>;

  if (segments.length === 0) {
    return "Not specified";
  }

  return segments
    .map((segment) => {
      const name = segment.name?.trim() || "Unnamed segment";
      const description = segment.description?.trim();
      return description ? `- ${name}: ${description}` : `- ${name}`;
    })
    .join("\n");
}

export const CAMPAIGN_BRAIN_SYSTEM_PROMPT = `You are a senior political campaign strategist specializing in Washington State races.

Generate a structured Campaign Brain for the candidate based on onboarding data. Focus on:
- Washington State political context (local jurisdictions, voter priorities, regional dynamics)
- Clear, persuasive messaging that respects campaign compliance norms
- Actionable strategic notes tied to each priority issue
- Authentic tone aligned with the campaign's brand preferences

Respond with valid JSON only — no markdown fences or commentary.`;

export function buildCampaignBrainUserPrompt(input: {
  campaign: DbCampaign;
  profile: DbCampaignProfile | null;
}): string {
  const { campaign, profile } = input;
  const candidateName =
    campaign.candidate_name?.trim() || "The candidate";
  const office = campaign.office_sought?.trim() || "unspecified office";
  const jurisdiction = campaign.jurisdiction?.trim() || "unspecified jurisdiction";
  const state = campaign.state?.trim() || "WA";
  const district = campaign.district?.trim();
  const party = campaign.party?.trim();
  const electionDate = campaign.election_date?.trim();
  const topIssues = profile?.top_issues?.filter(Boolean) ?? [];
  const opponents = profile?.opponent_names?.filter(Boolean) ?? [];
  const fundraisingGoal = profile?.fundraising_goal;

  return `Create a Campaign Brain for this Washington State campaign.

## Campaign basics
- Candidate: ${candidateName}
- Office sought: ${office}
- Jurisdiction: ${jurisdiction}
- State: ${state}${district ? `\n- District: ${district}` : ""}${party ? `\n- Party: ${party}` : ""}${electionDate ? `\n- Election date: ${electionDate}` : ""}
${profile?.candidate_bio?.trim() ? `- Bio: ${profile.candidate_bio.trim()}` : ""}
${profile?.campaign_themes?.length ? `- Themes: ${profile.campaign_themes.join(", ")}` : ""}
${opponents.length ? `- Known opponents: ${opponents.join(", ")}` : ""}
${fundraisingGoal != null ? `- Fundraising goal: $${Number(fundraisingGoal).toLocaleString()}` : ""}

## Priority issues
${topIssues.length > 0 ? topIssues.map((issue) => `- ${issue}`).join("\n") : "- Not specified — infer sensible WA-focused priorities for this race"}

## Target voter segments
${formatVoterSegments(profile?.voter_segments ?? null)}

## Brand tone preferences
${formatTonePreferences(profile?.tone_preferences ?? null)}

Return JSON matching this shape:
{
  "summary": "2-4 paragraph campaign narrative summary",
  "messageFramework": {
    "valueProposition": "single sentence core value proposition",
    "keyMessages": ["3-5 pillar messages"],
    "toneGuidance": "how messaging should sound across channels",
    "taglines": ["optional short taglines"]
  },
  "issueMap": [
    {
      "issue": "issue name matching or extending onboarding priorities",
      "strategicNotes": "why this issue matters in this race and jurisdiction",
      "talkingPoints": ["2-4 voter-facing talking points"],
      "priorityMessages": ["1-2 concise message lines for this issue"]
    }
  ],
  "strategicPriorities": [
    {
      "title": "short priority name",
      "description": "what to do and why in the next phase of the campaign"
    }
  ]
}`;
}
