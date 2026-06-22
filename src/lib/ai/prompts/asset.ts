import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";
import type { M7AssetType } from "@/lib/validators/assets";
import { ASSET_TYPE_LABELS } from "@/lib/validators/assets";

export const ASSET_GENERATION_SYSTEM_PROMPT = `You are a senior campaign communications strategist for Washington state political campaigns.
Generate on-brand campaign content that is accurate, persuasive, and ready for team review.
Follow Washington PDC disclosure norms in tone (do not invent legal disclaimers unless asked).
Return JSON only with keys: title, content, theme (optional), issue (optional), channel (optional).`;

export function buildAssetGenerationUserPrompt(input: {
  campaign: DbCampaign;
  profile: DbCampaignProfile | null;
  assetType: M7AssetType;
  theme?: string;
  issue?: string;
  channel?: string;
}): string {
  const messageFramework = input.profile?.message_framework;
  const issueMap = input.profile?.issue_map ?? [];
  const typeLabel = ASSET_TYPE_LABELS[input.assetType];

  const lines = [
    `Create a ${typeLabel} for this campaign.`,
    "",
    "## Campaign",
    `- Candidate: ${input.campaign.candidate_name ?? "Unknown"}`,
    `- Office: ${input.campaign.office_sought ?? "Unknown"}`,
    `- Jurisdiction: ${input.campaign.jurisdiction ?? "Unknown"}, ${input.campaign.state ?? "WA"}`,
  ];

  if (input.profile?.summary) {
    lines.push("", "## Strategy summary", input.profile.summary);
  }

  if (messageFramework) {
    lines.push("", "## Message framework");
    if (messageFramework.valueProposition) {
      lines.push(`Value proposition: ${messageFramework.valueProposition}`);
    }
    if (messageFramework.keyMessages?.length) {
      lines.push(`Key messages: ${messageFramework.keyMessages.join("; ")}`);
    }
    if (messageFramework.toneGuidance) {
      lines.push(`Tone: ${messageFramework.toneGuidance}`);
    }
    if (messageFramework.taglines?.length) {
      lines.push(`Taglines: ${messageFramework.taglines.join("; ")}`);
    }
  }

  if (issueMap.length > 0) {
    lines.push("", "## Issue map");
    for (const entry of issueMap.slice(0, 5)) {
      lines.push(`- ${entry.issue ?? "Issue"}: ${entry.strategicNotes ?? ""}`);
      if (entry.talkingPoints?.length) {
        lines.push(`  Talking points: ${entry.talkingPoints.join("; ")}`);
      }
    }
  }

  if (input.profile?.top_issues?.length) {
    lines.push("", `Top issues: ${input.profile.top_issues.join(", ")}`);
  }

  lines.push("", "## Request");
  lines.push(`Asset type: ${typeLabel}`);
  if (input.theme?.trim()) lines.push(`Preferred theme: ${input.theme.trim()}`);
  if (input.issue?.trim()) lines.push(`Focus issue: ${input.issue.trim()}`);
  if (input.channel?.trim()) lines.push(`Channel: ${input.channel.trim()}`);

  lines.push(
    "",
    "Return JSON with title (short internal name) and content (full draft body).",
  );

  return lines.join("\n");
}
