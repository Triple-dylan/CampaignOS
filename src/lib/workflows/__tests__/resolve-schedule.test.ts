import { describe, expect, it } from "vitest";
import {
  buildWorkflowFieldsForSchedule,
  fieldsCompleteForWorkflow,
  resolveWorkflowIdFromSchedule,
} from "@/lib/workflows/resolve-schedule";
import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";

const campaign: DbCampaign = {
  id: "00000000-0000-4000-8000-000000000001",
  organization_id: "org",
  candidate_name: "Alex Chen",
  office_sought: "State House",
  jurisdiction: "LD 36",
  district: "36",
  state: "WA",
  party: "Democratic",
  election_date: "2026-11-03",
  campaign_website: null,
  campaign_status: "active",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const profile: DbCampaignProfile = {
  id: "profile-1",
  campaign_id: campaign.id,
  candidate_bio: null,
  top_issues: ["Housing", "Climate"],
  voter_segments: [{ name: "Renters" }],
  tone_preferences: null,
  campaign_themes: ["Community first"],
  opponent_names: ["Jane Doe"],
  fundraising_goal: null,
  summary: null,
  message_framework: null,
  issue_map: null,
  brain_generated_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("resolveWorkflowIdFromSchedule", () => {
  it("reads workflow id from metadata", () => {
    expect(
      resolveWorkflowIdFromSchedule({
        prompt: "anything",
        agent_mode: "campaign-manager",
        metadata_json: { workflowId: "content-creation" },
      }),
    ).toBe("content-creation");
  });

  it("detects workflow from prompt keywords", () => {
    expect(
      resolveWorkflowIdFromSchedule({
        prompt: "Weekly event research brief for upcoming forums",
        agent_mode: "researcher",
        metadata_json: null,
      }),
    ).toBe("event-research");
  });

  it("falls back to agent mode defaults", () => {
    expect(
      resolveWorkflowIdFromSchedule({
        prompt: "Run the weekly automation",
        agent_mode: "content-strategist",
        metadata_json: null,
      }),
    ).toBe("content-creation");
  });
});

describe("buildWorkflowFieldsForSchedule", () => {
  it("builds complete campaign structure fields from profile", () => {
    const fields = buildWorkflowFieldsForSchedule({
      workflowId: "campaign-structure",
      schedule: { prompt: "Refresh the district plan" },
      campaign,
      profile,
    });

    expect(fields.districtSegments).toContain("LD 36");
    expect(fields.issues).toContain("Housing");
    expect(fieldsCompleteForWorkflow("campaign-structure", fields)).toBe(true);
  });
});
