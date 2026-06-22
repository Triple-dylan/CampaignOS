import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";
import type { ResearchType } from "@/lib/validators/research-briefs";
import { RESEARCH_TYPE_LABELS } from "@/lib/validators/research-briefs";

export const RESEARCH_GENERATION_SYSTEM_PROMPT = `You are a senior political research analyst for Washington state local and legislative campaigns.
Produce factual, structured research briefs grounded in publicly knowable context about Washington politics, local government, and campaign strategy.
Do not invent specific statistics, vote counts, or quotes unless they are widely established general knowledge.
For sources: suggest plausible reference types (official sites, news outlets, public records) with realistic titles and URLs when possible, but these are AI-suggested references that MUST be verified independently before use in paid media or public statements.
Return JSON only with keys: title, summary, key_findings (array of strings), sources (array of {url, title, snippet}), related_issues (optional array of issue names from the campaign context).`;

export function buildResearchGenerationUserPrompt(input: {
  campaign: DbCampaign;
  profile: DbCampaignProfile | null;
  researchType: ResearchType;
  topic: string;
  relatedIssues?: string[];
}): string {
  const messageFramework = input.profile?.message_framework;
  const issueMap = input.profile?.issue_map ?? [];
  const typeLabel = RESEARCH_TYPE_LABELS[input.researchType];

  const lines = [
    `Create a ${typeLabel.toLowerCase()} research brief on the following topic.`,
    "",
    "## Research topic",
    input.topic.trim(),
    "",
    "## Campaign context",
    `- Candidate: ${input.campaign.candidate_name ?? "Unknown"}`,
    `- Office: ${input.campaign.office_sought ?? "Unknown"}`,
    `- Jurisdiction: ${input.campaign.jurisdiction ?? "Unknown"}, ${input.campaign.state ?? "WA"}`,
    `- District: ${input.campaign.district ?? "N/A"}`,
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
  }

  if (issueMap.length > 0) {
    lines.push("", "## Issue map");
    for (const entry of issueMap.slice(0, 8)) {
      lines.push(`- ${entry.issue ?? "Issue"}: ${entry.strategicNotes ?? ""}`);
    }
  }

  if (input.profile?.top_issues?.length) {
    lines.push("", `Top issues: ${input.profile.top_issues.join(", ")}`);
  }

  if (input.profile?.opponent_names?.length) {
    lines.push("", `Known opponents: ${input.profile.opponent_names.join(", ")}`);
  }

  if (input.relatedIssues?.length) {
    lines.push("", `Focus issues: ${input.relatedIssues.join(", ")}`);
  }

  lines.push(
    "",
    "## Output requirements",
    "- title: concise internal brief title",
    "- summary: 2-4 sentence executive summary",
    "- key_findings: 4-8 bullet points with actionable campaign intel",
    "- sources: 2-5 suggested references (url, title, snippet) — label mentally as unverified AI suggestions",
    "- related_issues: issue names from campaign context that this brief supports",
    "",
    "Emphasize Washington state and local political context where relevant.",
  );

  return lines.join("\n");
}
