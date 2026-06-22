export const FUNDRAISING_OUTREACH_SYSTEM_PROMPT = `You are a political campaign fundraising strategist helping a Washington state campaign draft personalized donor outreach.

Respond with valid JSON only. No markdown fences.

Output shape:
{
  "subject": "email subject line (if email channel)",
  "opening": "personalized opening paragraph",
  "talking_points": ["3-5 bullet talking points"],
  "ask": "clear fundraising ask with suggested amount range if appropriate",
  "follow_up": "suggested next step or follow-up action",
  "script": "full outreach script or email body combining the above"
}

Guidelines:
- Match the campaign's tone and message framework
- Reference the prospect's alignment reason and related issue when provided
- Keep language compliant and professional — no promises of official action in exchange for donations
- Be concise and actionable for call time or email outreach`;

import type { DbCampaign, DbCampaignProfile, DbFundraisingProspect } from "@/lib/db/schema";

export function buildProspectOutreachUserPrompt(input: {
  campaign: DbCampaign;
  profile: DbCampaignProfile | null;
  prospect: DbFundraisingProspect;
  outreachGoal?: string;
  channel?: "email" | "phone" | "in_person";
}): string {
  const messageFramework = input.profile?.message_framework;
  const keyMessages = messageFramework?.keyMessages?.filter(Boolean) ?? [];
  const topIssues = input.profile?.top_issues?.filter(Boolean) ?? [];

  return [
    "Draft outreach for this fundraising prospect.",
    "",
    "Campaign:",
    `- Candidate: ${input.campaign.candidate_name ?? "Unknown"}`,
    `- Office: ${input.campaign.office_sought ?? "Not set"}`,
    `- Jurisdiction: ${input.campaign.jurisdiction ?? "Washington"}`,
    input.profile?.fundraising_goal != null
      ? `- Fundraising goal: $${Number(input.profile.fundraising_goal).toLocaleString()}`
      : null,
    "",
    "Message framework:",
    messageFramework?.valueProposition
      ? `- Value proposition: ${messageFramework.valueProposition}`
      : null,
    keyMessages.length ? `- Key messages: ${keyMessages.join("; ")}` : null,
    messageFramework?.toneGuidance
      ? `- Tone: ${messageFramework.toneGuidance}`
      : null,
    topIssues.length ? `- Top issues: ${topIssues.join(", ")}` : null,
    "",
    "Prospect:",
    `- Name: ${input.prospect.name}`,
    `- Type: ${input.prospect.prospect_type}`,
    input.prospect.organization_name
      ? `- Organization: ${input.prospect.organization_name}`
      : null,
    input.prospect.related_issue
      ? `- Related issue: ${input.prospect.related_issue}`
      : null,
    input.prospect.alignment_reason
      ? `- Alignment: ${input.prospect.alignment_reason}`
      : null,
    input.prospect.estimated_capacity != null
      ? `- Estimated capacity: $${Number(input.prospect.estimated_capacity).toLocaleString()}`
      : null,
    input.prospect.status ? `- Pipeline status: ${input.prospect.status}` : null,
    input.prospect.notes ? `- Notes: ${input.prospect.notes}` : null,
    "",
    input.channel ? `Preferred channel: ${input.channel}` : null,
    input.outreachGoal?.trim()
      ? `Outreach goal: ${input.outreachGoal.trim()}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}
