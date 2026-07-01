import type { DbCampaign, DbCampaignProfile, DbWorkflowSchedule } from "@/lib/db/schema";
import {
  WORKFLOW_COLLECT_STEPS,
  type WorkflowFields,
} from "@/lib/workflows/chat-fields";
import { detectWorkflowFromMessage } from "@/lib/workflows/detect";
import type { CampaignWorkflowId } from "@/lib/workflows/registry";
import { campaignWorkflows } from "@/lib/workflows/registry";
import type { CreateWorkflowScheduleInput } from "@/lib/validators/workflows";

const CAMPAIGN_WORKFLOW_IDS = new Set<CampaignWorkflowId>(
  campaignWorkflows.map((workflow) => workflow.id),
);

const AGENT_WORKFLOW_DEFAULTS: Partial<
  Record<CreateWorkflowScheduleInput["agentMode"], CampaignWorkflowId>
> = {
  "campaign-manager": "campaign-structure",
  "content-strategist": "content-creation",
  researcher: "event-research",
};

function isCampaignWorkflowId(value: unknown): value is CampaignWorkflowId {
  return typeof value === "string" && CAMPAIGN_WORKFLOW_IDS.has(value as CampaignWorkflowId);
}

export function readStoredFieldsFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): WorkflowFields | undefined {
  const raw = metadata?.fields;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }

  const fields: WorkflowFields = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" && value.trim()) {
      fields[key as keyof WorkflowFields] = value.trim();
    }
  }

  return Object.keys(fields).length > 0 ? fields : undefined;
}

export function fieldsCompleteForWorkflow(
  workflowId: CampaignWorkflowId,
  fields: WorkflowFields,
): boolean {
  return WORKFLOW_COLLECT_STEPS[workflowId].every((step) =>
    step.isComplete(fields),
  );
}

export function resolveWorkflowIdFromSchedule(
  schedule: Pick<DbWorkflowSchedule, "prompt" | "agent_mode" | "metadata_json">,
): CampaignWorkflowId | null {
  const metadataWorkflowId = schedule.metadata_json?.workflowId;
  if (isCampaignWorkflowId(metadataWorkflowId)) {
    return metadataWorkflowId;
  }

  const detected = detectWorkflowFromMessage(schedule.prompt);
  if (detected) {
    return detected;
  }

  const agentMode =
    schedule.agent_mode as CreateWorkflowScheduleInput["agentMode"];
  return AGENT_WORKFLOW_DEFAULTS[agentMode] ?? null;
}

function formatVoterSegments(
  segments: DbCampaignProfile["voter_segments"],
): string {
  if (!segments?.length) return "";

  return segments
    .map((segment) => {
      if (typeof segment === "string") return segment;
      if (segment && typeof segment === "object" && "name" in segment) {
        return String(segment.name);
      }
      return "";
    })
    .filter(Boolean)
    .join(", ");
}

function buildProfileContext(input: {
  campaign: DbCampaign;
  profile: DbCampaignProfile | null;
}): string {
  const parts = [
    input.campaign.candidate_name
      ? `Candidate: ${input.campaign.candidate_name}`
      : null,
    input.campaign.office_sought
      ? `Office: ${input.campaign.office_sought}`
      : null,
    input.campaign.jurisdiction || input.campaign.district
      ? `District: ${[input.campaign.jurisdiction, input.campaign.district]
          .filter(Boolean)
          .join(" ")}`
      : null,
    input.profile?.campaign_themes?.length
      ? `Themes: ${input.profile.campaign_themes.join(", ")}`
      : null,
    input.profile?.top_issues?.length
      ? `Top issues: ${input.profile.top_issues.join(", ")}`
      : null,
  ].filter(Boolean);

  return parts.join(". ");
}

export function buildWorkflowFieldsForSchedule(input: {
  workflowId: CampaignWorkflowId;
  schedule: Pick<DbWorkflowSchedule, "prompt">;
  campaign: DbCampaign;
  profile: DbCampaignProfile | null;
  storedFields?: WorkflowFields;
  promptSnapshot?: string | null;
}): WorkflowFields {
  const stored = input.storedFields ?? {};
  const prompt = (input.promptSnapshot ?? input.schedule.prompt).trim();
  const profileContext = buildProfileContext({
    campaign: input.campaign,
    profile: input.profile,
  });

  if (fieldsCompleteForWorkflow(input.workflowId, stored)) {
    return stored;
  }

  switch (input.workflowId) {
    case "event-research":
      return {
        intent: stored.intent || prompt.slice(0, 240) || "Campaign event preparation",
        details:
          stored.details ||
          [
            prompt,
            profileContext,
            input.campaign.election_date
              ? `Election date: ${input.campaign.election_date}`
              : null,
          ]
            .filter(Boolean)
            .join(". ")
            .slice(0, 500),
      };
    case "content-creation":
      return {
        intent: stored.intent || prompt.slice(0, 240) || "Scheduled content draft",
        theme:
          stored.theme ||
          [
            input.profile?.campaign_themes?.slice(0, 2).join(", "),
            input.profile?.top_issues?.slice(0, 3).join(", "),
            prompt,
          ]
            .filter(Boolean)
            .join(". ")
            .slice(0, 240),
      };
    case "campaign-structure": {
      const districtParts = [
        input.campaign.jurisdiction,
        input.campaign.district,
        input.campaign.state,
      ]
        .filter(Boolean)
        .join(" ");
      const segments = formatVoterSegments(input.profile?.voter_segments ?? null);

      return {
        districtSegments:
          stored.districtSegments ||
          [districtParts, segments ? `Segments: ${segments}` : null, prompt]
            .filter(Boolean)
            .join(". ")
            .slice(0, 500),
        issues:
          stored.issues ||
          [
            input.profile?.top_issues?.join(", "),
            prompt !== districtParts ? prompt : null,
          ]
            .filter(Boolean)
            .join(". ")
            .slice(0, 500),
      };
    }
    case "incumbent-research":
      return {
        intent:
          stored.intent ||
          prompt.slice(0, 240) ||
          "Incumbent and opponent comparison",
        targets:
          stored.targets ||
          [
            input.profile?.opponent_names?.length
              ? `Targets: ${input.profile.opponent_names.join(", ")}`
              : null,
            profileContext,
            prompt,
          ]
            .filter(Boolean)
            .join(". ")
            .slice(0, 500),
      };
    default:
      return stored;
  }
}

export function buildScheduleMetadata(input: {
  prompt: string;
  agentMode: CreateWorkflowScheduleInput["agentMode"];
  source?: string;
}): Record<string, unknown> {
  const workflowId = resolveWorkflowIdFromSchedule({
    prompt: input.prompt,
    agent_mode: input.agentMode,
    metadata_json: null,
  });

  const metadata: Record<string, unknown> = {
    source: input.source ?? "ui_scaffold",
  };

  if (workflowId) {
    metadata.workflowId = workflowId;
  }

  return metadata;
}
