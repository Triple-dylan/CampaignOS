import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";
import { campaignDisplayName } from "@/lib/db/schema";

export const CAMPAIGN_TIMELINE_SYSTEM_PROMPT = `You are a campaign strategist helping plan a political campaign timeline.
Return ONLY valid JSON matching this shape:
{
  "summary": "2-3 sentence overview of the plan",
  "events": [
    {
      "title": "string",
      "description": "optional string",
      "event_type": "content|fundraiser|speech|debate|volunteer|canvassing|compliance|internal|public_event",
      "start_time": "ISO 8601 datetime",
      "is_milestone": boolean optional
    }
  ],
  "tasks": [
    {
      "title": "string",
      "description": "optional string",
      "priority": "low|medium|high|urgent optional",
      "due_date": "ISO 8601 date optional"
    }
  ]
}
Spread events across the planning horizon. Include field, content, and compliance beats.`;

export function buildCampaignTimelineUserPrompt(input: {
  campaign: DbCampaign;
  profile: DbCampaignProfile | null;
  districtSegments: string;
  issues: string;
}): string {
  const lines = [
    "Plan a campaign timeline with calendar events and follow-up tasks.",
    "",
    `Campaign: ${campaignDisplayName(input.campaign)}`,
  ];
  if (input.campaign.office_sought) {
    lines.push(`Office: ${input.campaign.office_sought}`);
  }
  if (input.campaign.jurisdiction) {
    lines.push(`Jurisdiction: ${input.campaign.jurisdiction}`);
  }
  if (input.profile?.top_issues?.length) {
    lines.push(`Existing top issues: ${input.profile.top_issues.join(", ")}`);
  }
  lines.push(
    "",
    `District & segments: ${input.districtSegments}`,
    `Key issues & dates: ${input.issues}`,
    "",
    "Return 4-8 milestone events and 5-10 actionable tasks as JSON.",
  );
  return lines.join("\n");
}
