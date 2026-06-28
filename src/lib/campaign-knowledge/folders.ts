import type { CampaignFolder, CampaignFolderId } from "@/lib/campaign-knowledge/types";

/**
 * Standard campaign knowledge folders — one tree per organization campaign.
 * Names align with CampaignOS DB entities and neutral campaign terminology.
 */
export const CAMPAIGN_FOLDERS: readonly CampaignFolder[] = [
  {
    id: "campaign",
    slug: "campaign",
    label: "Campaign",
    description:
      "Core campaign identity — candidate, office, jurisdiction, election date, and profile summary.",
    graphNodeTypes: ["candidate", "strategic_priority"],
    sourceObjectTypes: ["campaign", "campaign_profile"],
    isCluster: true,
  },
  {
    id: "skills",
    slug: "skills",
    label: "Skills",
    description:
      "Reusable agent skills and playbooks (Cursor-style) for drafting, research, and compliance checks.",
    graphNodeTypes: ["task"],
    sourceObjectTypes: ["workflow_schedule"],
    isCluster: true,
  },
  {
    id: "assets",
    slug: "assets",
    label: "Assets",
    description:
      "Creative assets, ad copy, mail pieces, templates, and approved exports.",
    graphNodeTypes: ["asset"],
    sourceObjectTypes: ["asset"],
    isCluster: true,
  },
  {
    id: "initiatives",
    slug: "initiatives",
    label: "Initiatives",
    description:
      "Programs and strategic workstreams — GOTV, persuasion, volunteer recruitment, and coalition building.",
    graphNodeTypes: ["strategic_priority", "task"],
    sourceObjectTypes: ["task"],
    isCluster: true,
  },
  {
    id: "events",
    slug: "events",
    label: "Events",
    description:
      "Rallies, town halls, house parties, filing deadlines, and calendar milestones.",
    graphNodeTypes: ["event"],
    sourceObjectTypes: ["calendar_event"],
    isCluster: true,
  },
  {
    id: "fundraising",
    slug: "fundraising",
    label: "Fundraising",
    description:
      "Fundraising plans, donor prospects, call-time scripts, and ask strategies.",
    graphNodeTypes: ["donor", "prospect"],
    sourceObjectTypes: ["fundraising_plan", "fundraising_prospect"],
    isCluster: true,
  },
  {
    id: "accounting",
    slug: "accounting",
    label: "Accounting",
    description:
      "Budgets, burn rate, expense tracking, and finance compliance notes.",
    graphNodeTypes: ["compliance"],
    sourceObjectTypes: [],
    isCluster: true,
  },
  {
    id: "social-media",
    slug: "social-media",
    label: "Social media",
    description:
      "Channel strategy, content calendars, post drafts, and platform-specific guidance.",
    graphNodeTypes: ["asset", "message_theme"],
    sourceObjectTypes: ["asset"],
    isCluster: true,
  },
  {
    id: "people",
    slug: "people",
    label: "People",
    description:
      "Voters, endorsers, stakeholders, and community leaders relevant to the race.",
    graphNodeTypes: ["donor", "prospect", "organization", "voter_segment"],
    sourceObjectTypes: ["fundraising_prospect"],
    isCluster: true,
  },
  {
    id: "team",
    slug: "team",
    label: "Team",
    description:
      "Staff, consultants, volunteers, roles, and org chart for the campaign.",
    graphNodeTypes: ["organization", "task"],
    sourceObjectTypes: ["organization_member"],
    isCluster: true,
  },
  {
    id: "research",
    slug: "research",
    label: "Research",
    description:
      "Opposition research, district intel, issue briefs, and message-testing notes.",
    graphNodeTypes: ["research", "opponent", "issue"],
    sourceObjectTypes: ["research_brief"],
    isCluster: true,
  },
  {
    id: "compliance",
    slug: "compliance",
    label: "Compliance",
    description:
      "PDC/FEC disclosure notes, content review records, and compliance flags.",
    graphNodeTypes: ["compliance"],
    sourceObjectTypes: ["compliance_record"],
    isCluster: true,
  },
  {
    id: "messaging",
    slug: "messaging",
    label: "Messaging",
    description:
      "Message framework, talking points, issue map, tone guidance, and taglines.",
    graphNodeTypes: ["message_theme", "issue"],
    sourceObjectTypes: ["campaign_profile"],
    isCluster: true,
  },
  {
    id: "field",
    slug: "field",
    label: "Field",
    description:
      "Canvass plans, turf maps, voter contact goals, and door-knock scripts.",
    graphNodeTypes: ["voter_segment", "task", "strategic_priority"],
    sourceObjectTypes: ["task"],
    isCluster: true,
  },
  {
    id: "communications",
    slug: "communications",
    label: "Communications",
    description:
      "Press strategy, talking points for earned media, and rapid-response playbooks.",
    graphNodeTypes: ["message_theme", "asset"],
    sourceObjectTypes: ["asset"],
    isCluster: true,
  },
  {
    id: "vendors",
    slug: "vendors",
    label: "Vendors",
    description:
      "Consultants, printers, pollsters, and vendor contracts with spend tracking.",
    graphNodeTypes: ["organization", "compliance"],
    sourceObjectTypes: ["compliance_record"],
    isCluster: true,
  },
  {
    id: "media",
    slug: "media",
    label: "Media",
    description:
      "Paid media plans, ad buys, creative rotations, and placement notes.",
    graphNodeTypes: ["asset", "strategic_priority"],
    sourceObjectTypes: ["asset"],
    isCluster: true,
  },
  {
    id: "polling",
    slug: "polling",
    label: "Polling",
    description:
      "Internal polls, crosstabs, toplines, and viability benchmarks.",
    graphNodeTypes: ["research", "voter_segment"],
    sourceObjectTypes: ["research_brief"],
    isCluster: true,
  },
  {
    id: "endorsements",
    slug: "endorsements",
    label: "Endorsements",
    description:
      "Endorsement targets, secured endorsements, and coalition letters.",
    graphNodeTypes: ["organization", "prospect"],
    sourceObjectTypes: [],
    isCluster: true,
  },
  {
    id: "ballot-access",
    slug: "ballot-access",
    label: "Ballot access",
    description:
      "Filing deadlines, signature requirements, PDC registrations, and ballot titles.",
    graphNodeTypes: ["compliance", "event"],
    sourceObjectTypes: ["calendar_event"],
    isCluster: true,
  },
] as const;

export const CAMPAIGN_FOLDER_IDS = CAMPAIGN_FOLDERS.map(
  (folder) => folder.id,
) as CampaignFolderId[];

const folderById = new Map(
  CAMPAIGN_FOLDERS.map((folder) => [folder.id, folder]),
);

const folderBySlug = new Map(
  CAMPAIGN_FOLDERS.map((folder) => [folder.slug, folder]),
);

export function getCampaignFolder(id: CampaignFolderId): CampaignFolder {
  const folder = folderById.get(id);
  if (!folder) {
    throw new Error(`Unknown campaign folder: ${id}`);
  }
  return folder;
}

export function getCampaignFolderBySlug(slug: string): CampaignFolder | null {
  return folderBySlug.get(slug) ?? null;
}
