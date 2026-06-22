import type {
  CampaignStatus,
  GraphNodeType,
  GraphRelationshipType,
  OrganizationRole,
} from "@/lib/validators/enums";

export type DbUser = {
  id: string;
  clerk_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type DbOrganization = {
  id: string;
  clerk_org_id: string;
  name: string;
  slug: string | null;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DbOrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  clerk_membership_id: string | null;
  role: OrganizationRole;
  created_at: string;
  updated_at: string;
};

export type DbCampaign = {
  id: string;
  organization_id: string;
  candidate_name: string | null;
  office_sought: string | null;
  jurisdiction: string | null;
  state: string | null;
  district: string | null;
  party: string | null;
  election_date: string | null;
  campaign_website: string | null;
  campaign_status: CampaignStatus;
  created_at: string;
  updated_at: string;
};

export type MessageFrameworkJson = {
  valueProposition?: string;
  keyMessages?: string[];
  toneGuidance?: string;
  taglines?: string[];
};

export type IssueMapEntryJson = {
  issue?: string;
  strategicNotes?: string;
  talkingPoints?: string[];
  priorityMessages?: string[];
};

export type DbCampaignProfile = {
  id: string;
  campaign_id: string;
  candidate_bio: string | null;
  campaign_themes: string[] | null;
  top_issues: string[] | null;
  voter_segments: Record<string, unknown>[] | null;
  tone_preferences: Record<string, unknown> | null;
  opponent_names: string[] | null;
  fundraising_goal: number | null;
  summary: string | null;
  message_framework: MessageFrameworkJson | null;
  issue_map: IssueMapEntryJson[] | null;
  brain_generated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbGraphNode = {
  id: string;
  campaign_id: string;
  node_type: GraphNodeType;
  title: string;
  summary: string | null;
  source_object_type: string | null;
  source_object_id: string | null;
  metadata_json: Record<string, unknown> | null;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
};

export type DbGraphEdge = {
  id: string;
  campaign_id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: GraphRelationshipType;
  confidence: number | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
};

export type DbAsset = {
  id: string;
  campaign_id: string;
  asset_type: string;
  title: string;
  description: string | null;
  file_url: string | null;
  content_text: string | null;
  status: string;
  channel: string | null;
  theme: string | null;
  issue: string | null;
  ai_generated: boolean;
  prompt_used: string | null;
  model_used: string | null;
  template_used: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  compliance_status: string;
  created_at: string;
  updated_at: string;
};

export type DbCalendarEvent = {
  id: string;
  campaign_id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  related_asset_id: string | null;
  related_task_id: string | null;
  is_milestone: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ResearchSourceJson = {
  url: string;
  title: string;
  snippet?: string;
};

export type DbResearchBrief = {
  id: string;
  campaign_id: string;
  research_type: string;
  title: string;
  topic: string | null;
  summary: string | null;
  body: string | null;
  key_findings_json: string[] | null;
  sources_json: ResearchSourceJson[] | null;
  status: string;
  confidence_level: number | null;
  created_by: string | null;
  ai_generated: boolean;
  prompt_used: string | null;
  model_used: string | null;
  created_at: string;
  updated_at: string;
};

export type DbTask = {
  id: string;
  campaign_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  owner_user_id: string | null;
  due_date: string | null;
  related_asset_id: string | null;
  related_event_id: string | null;
  related_research_id: string | null;
  related_prospect_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FundraisingTimelineMilestoneJson = {
  title?: string;
  targetDate?: string;
  targetAmount?: number;
  notes?: string;
};

export type OutreachHistoryEntryJson = {
  date?: string;
  channel?: string;
  summary?: string;
  outcome?: string;
};

export type DbFundraisingPlan = {
  id: string;
  campaign_id: string;
  title: string;
  goal_amount: number | null;
  raised_amount: number | null;
  plan_body: string | null;
  timeline_json: FundraisingTimelineMilestoneJson[] | null;
  outreach_strategy: string | null;
  event_strategy: string | null;
  created_by: string | null;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
};

export type DbFundraisingProspect = {
  id: string;
  campaign_id: string;
  name: string;
  prospect_type: string;
  organization_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  location: string | null;
  alignment_reason: string | null;
  related_issue: string | null;
  estimated_capacity: number | null;
  status: string;
  notes: string | null;
  outreach_history_json: OutreachHistoryEntryJson[] | null;
  created_at: string;
  updated_at: string;
};

export type ComplianceFlagJson = {
  type: "auto" | "attention" | "manual";
  severity?: "info" | "warning" | "error";
  message: string;
  flagged_at?: string;
};

export type ComplianceAutoCheckJson = {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
};

export type DbComplianceRecord = {
  id: string;
  campaign_id: string;
  related_asset_id: string | null;
  content_type: string | null;
  ai_generated: boolean;
  synthetic_media: boolean;
  sponsor_name: string | null;
  sponsor_address: string | null;
  vendor_name: string | null;
  amount_paid: number | null;
  distribution_channel: string | null;
  intended_audience: string | null;
  required_disclosure: boolean;
  disclosure_text: string | null;
  review_status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  flags_json: ComplianceFlagJson[] | null;
  auto_checks_json: ComplianceAutoCheckJson[] | null;
  archive_until: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
};

export type DbComplianceRecordAssetSummary = {
  id: string;
  title: string;
  asset_type: string;
  content_text: string | null;
  status: string;
  compliance_status: string;
};

export type DbComplianceRecordWithAsset = DbComplianceRecord & {
  asset: DbComplianceRecordAssetSummary | null;
};

/** App-level campaign summary (camelCase). */
export type Campaign = {
  id: string;
  name: string;
  orgId: string;
};

export function campaignDisplayName(campaign: DbCampaign): string {
  return campaign.candidate_name?.trim() || "Untitled campaign";
}

export function toCampaignSummary(campaign: DbCampaign): Campaign {
  return {
    id: campaign.id,
    name: campaignDisplayName(campaign),
    orgId: campaign.organization_id,
  };
}
