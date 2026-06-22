import { campaignDisplayName } from "@/lib/db/schema";
import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";

export function daysUntilElection(electionDate: string | null): number | null {
  if (!electionDate?.trim()) {
    return null;
  }

  const election = new Date(`${electionDate}T00:00:00`);
  if (Number.isNaN(election.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = election.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
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

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatFundraisingGoal(goal: number | null | undefined): string {
  if (goal == null) {
    return "Not set";
  }

  return `$${Number(goal).toLocaleString()}`;
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
