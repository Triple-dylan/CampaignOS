import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";
import type { CalendarEventType } from "@/lib/validators/calendar-events";

const SOCIAL_CHANNELS = new Set([
  "social",
  "instagram",
  "facebook",
  "x",
  "twitter",
  "tiktok",
  "threads",
  "linkedin",
]);

/**
 * Maps an asset to its campaign-knowledge folder for graph metadata and brain clusters.
 */
export function resolveAssetKnowledgeFolder(input: {
  assetType: string;
  channel?: string | null;
}): CampaignFolderId {
  if (input.assetType === "social_post") {
    return "social-media";
  }

  const channel = input.channel?.trim().toLowerCase();
  if (channel && SOCIAL_CHANNELS.has(channel)) {
    return "social-media";
  }

  if (input.assetType === "press_release") {
    return "communications";
  }

  return "assets";
}

/**
 * Maps a calendar event to its primary knowledge folder.
 */
export function resolveEventKnowledgeFolder(
  eventType: CalendarEventType,
): CampaignFolderId {
  if (eventType === "content") {
    return "social-media";
  }

  if (eventType === "compliance") {
    return "compliance";
  }

  return "events";
}
