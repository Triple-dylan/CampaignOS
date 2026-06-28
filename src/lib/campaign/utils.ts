import { campaignDisplayName } from "@/lib/db/schema";
import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";

export function daysUntilElection(electionDate: string | null): number | null {
  if (!electionDate?.trim()) {
    return null;
  }

  // Compute everything in UTC so the server and client always agree (avoids
  // React hydration mismatches from timezone differences).
  const election = Date.parse(`${electionDate}T00:00:00Z`);
  if (Number.isNaN(election)) {
    return null;
  }

  const now = new Date();
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  return Math.ceil((election - todayUtc) / (1000 * 60 * 60 * 24));
}

export function formatElectionCountdown(days: number | null): string {
  if (days === null) {
    return "Election date not set";
  }

  if (days === 0) {
    return "Election day is today";
  }

  if (days < 0) {
    const elapsed = Math.abs(days);
    return elapsed === 1 ? "Election was yesterday" : `Election was ${elapsed} days ago`;
  }

  return days === 1 ? "1 day until election" : `${days} days until election`;
}

export function formatElectionDate(electionDate: string | null): string {
  if (!electionDate?.trim()) {
    return "—";
  }

  const date = new Date(`${electionDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return electionDate;
  }

  // Use a fixed locale + timezone so server and client render identically
  // (avoids React hydration mismatches from locale/timezone differences).
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatFundraisingGoal(goal: number | null | undefined): string {
  if (goal == null) {
    return "Not set";
  }

  return `$${Number(goal).toLocaleString("en-US")}`;
}

export function getToneSummary(
  tonePreferences: DbCampaignProfile["tone_preferences"],
): string {
  const prefs = tonePreferences as
    | { selectedTones?: string[]; notes?: string }
    | null
    | undefined;

  const tones = prefs?.selectedTones?.filter(Boolean) ?? [];
  if (tones.length > 0) {
    return tones.join(", ");
  }

  if (prefs?.notes?.trim()) {
    return prefs.notes.trim();
  }

  return "—";
}

export function getCampaignSubtitle(campaign: DbCampaign | null): string {
  if (!campaign) {
    return "Campaign workspace";
  }

  const candidate = campaignDisplayName(campaign);
  const office = campaign.office_sought?.trim();

  if (office) {
    return `${candidate} · ${office}`;
  }

  return candidate;
}
