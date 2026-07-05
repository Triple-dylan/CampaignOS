import {
  daysUntilElection,
  formatElectionCountdown,
  formatElectionDate,
} from "@/lib/campaign/utils";
import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";
import type { WorkspaceDigest } from "@/lib/workspace/digest";

/** What the pinned campaign centre node tracks on the graph. */
export type CenterDisplayMode =
  | "fundraising"
  | "election_dates"
  | "next_event"
  | "custom"
  | "office";

export const CENTER_DISPLAY_MODES: Array<{
  id: CenterDisplayMode;
  label: string;
  description: string;
}> = [
  {
    id: "fundraising",
    label: "Fundraising goal",
    description: "$ raised vs target and progress %",
  },
  {
    id: "election_dates",
    label: "Key dates",
    description: "Election day and countdown",
  },
  {
    id: "next_event",
    label: "Next event",
    description: "Upcoming calendar item from digest",
  },
  {
    id: "custom",
    label: "Custom label",
    description: "Your own title and subtitle",
  },
  {
    id: "office",
    label: "Office + jurisdiction",
    description: "Race and geography at a glance",
  },
];

export type CenterDisplayContent = {
  title: string;
  summary: string | null;
  electionCountdown: string | null;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatShortEventDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Upcoming";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Builds live centre-node copy from campaign facts, profile, digest, and the
 * user's chosen display mode (stored in graph preferences).
 */
export function buildCenterDisplayContent(input: {
  mode: CenterDisplayMode;
  customLabel?: string;
  customSubtitle?: string;
  campaign: Pick<
    DbCampaign,
    | "candidate_name"
    | "election_date"
    | "office_sought"
    | "jurisdiction"
    | "state"
    | "district"
  > | null;
  profile?: DbCampaignProfile | null;
  digest?: WorkspaceDigest | null;
}): CenterDisplayContent {
  const { mode, campaign, profile, digest } = input;
  const candidateName =
    campaign?.candidate_name?.trim() || "Campaign goal";
  const days = daysUntilElection(campaign?.election_date ?? null);
  const countdown = formatElectionCountdown(days);
  const dateLabel = formatElectionDate(campaign?.election_date ?? null);

  switch (mode) {
    case "fundraising": {
      const { fundraising } = digest ?? {
        fundraising: {
          raisedAmount: 0,
          effectiveGoal: profile?.fundraising_goal ?? null,
          progressPercent: null,
        },
      };
      const goal =
        fundraising.effectiveGoal ?? profile?.fundraising_goal ?? null;
      const raised = currencyFormatter.format(fundraising.raisedAmount);
      const title =
        goal != null
          ? `${fundraising.progressPercent ?? 0}% of goal`
          : "Fundraising";
      const summary =
        goal != null
          ? `${raised} of ${currencyFormatter.format(goal)}`
          : `${raised} raised`;
      return { title, summary, electionCountdown: null };
    }
    case "next_event": {
      const next = digest?.upcomingEvents[0];
      if (next) {
        return {
          title: next.title,
          summary: `${formatShortEventDate(next.startTime)}${
            next.location ? ` · ${next.location}` : ""
          }`,
          electionCountdown: null,
        };
      }
      return {
        title: "No upcoming events",
        summary: "Add events in Planner",
        electionCountdown: null,
      };
    }
    case "custom": {
      const label = input.customLabel?.trim() || candidateName;
      const subtitle = input.customSubtitle?.trim() || null;
      return {
        title: label,
        summary: subtitle,
        electionCountdown: null,
      };
    }
    case "office": {
      const office = campaign?.office_sought?.trim() || "Office";
      const jurisdiction =
        campaign?.jurisdiction?.trim() ||
        [campaign?.state, campaign?.district ? `District ${campaign.district}` : null]
          .filter(Boolean)
          .join(", ") ||
        null;
      return {
        title: office,
        summary: jurisdiction,
        electionCountdown: null,
      };
    }
    case "election_dates":
    default:
      return {
        title: dateLabel !== "—" ? dateLabel : candidateName,
        summary: `${countdown} · ${candidateName}`,
        electionCountdown: countdown,
      };
  }
}
