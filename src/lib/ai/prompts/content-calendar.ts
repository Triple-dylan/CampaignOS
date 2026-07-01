import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";
import { campaignDisplayName } from "@/lib/db/schema";

export const CONTENT_CALENDAR_SYSTEM_PROMPT = `You are a campaign content strategist building a social/content calendar.
Return ONLY valid JSON matching this shape:
{
  "summary": "2-3 sentence overview of the calendar plan",
  "calendar_title": "Short title for the calendar period",
  "slots": [
    {
      "title": "string — post or content beat title",
      "description": "optional string — hook, CTA, or creative direction",
      "channel": "instagram|facebook|x|tiktok|email|print",
      "start_time": "ISO 8601 datetime",
      "theme": "optional message theme",
      "issue": "optional issue focus"
    }
  ]
}
Align slots with the campaign message framework and issues. Space posts realistically across the period.`;

export function buildContentCalendarUserPrompt(input: {
  campaign: DbCampaign;
  profile: DbCampaignProfile | null;
  period: string;
  channelsAndCadence: string;
}): string {
  const lines = [
    "Build a content calendar with scheduled content beats.",
    "",
    `Campaign: ${campaignDisplayName(input.campaign)}`,
  ];

  if (input.profile?.message_framework) {
    const mf = input.profile.message_framework;
    if (mf.valueProposition) {
      lines.push(`Value proposition: ${mf.valueProposition}`);
    }
    if (mf.keyMessages?.length) {
      lines.push(`Key messages: ${mf.keyMessages.join("; ")}`);
    }
    if (mf.toneGuidance) {
      lines.push(`Tone: ${mf.toneGuidance}`);
    }
  }

  if (input.profile?.top_issues?.length) {
    lines.push(`Top issues: ${input.profile.top_issues.join(", ")}`);
  }

  lines.push(
    "",
    `Period: ${input.period}`,
    `Channels & cadence: ${input.channelsAndCadence}`,
    "",
    "Return 5-12 content slots as JSON. Use event_type content beats only — no field or fundraiser events.",
  );

  return lines.join("\n");
}
