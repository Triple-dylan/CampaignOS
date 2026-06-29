import {
  CheckCircle2,
  Clock3,
  Image as ImageIcon,
  LayoutGrid,
  Mail,
  Printer,
  type LucideIcon,
} from "lucide-react";
import type { DbAsset } from "@/lib/db/schema";
import {
  ASSET_TYPE_LABELS,
  M7_ASSET_TYPES,
  type M7AssetType,
} from "@/lib/validators/assets";

/**
 * Notion-style collections for the Asset Studio. These are purely derived
 * views over the existing `assets` columns (type / channel / status), so they
 * require no schema migration. Labels mirror the campaign-knowledge asset
 * folder concept without importing or mutating those files.
 */
export type CollectionId =
  | "all"
  | "social"
  | "print"
  | "email"
  | "approved"
  | "needs_review";

export type AssetCollection = {
  id: CollectionId;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Predicate over existing asset fields — no new columns. */
  matches: (asset: DbAsset) => boolean;
};

const SOCIAL_CHANNELS = new Set([
  "social",
  "instagram",
  "facebook",
  "x",
  "twitter",
  "tiktok",
  "linkedin",
  "threads",
  "youtube",
]);

const PRINT_CHANNELS = new Set(["print", "flyer", "mail", "door"]);

function isSocial(asset: DbAsset): boolean {
  return (
    asset.asset_type === "social_post" ||
    asset.asset_type === "event_graphic" ||
    SOCIAL_CHANNELS.has((asset.channel ?? "").toLowerCase())
  );
}

function isPrint(asset: DbAsset): boolean {
  return (
    asset.asset_type === "flyer" ||
    PRINT_CHANNELS.has((asset.channel ?? "").toLowerCase())
  );
}

function isEmail(asset: DbAsset): boolean {
  return (
    asset.asset_type === "email" ||
    asset.asset_type === "fundraising_email" ||
    (asset.channel ?? "").toLowerCase() === "email"
  );
}

export const ASSET_COLLECTIONS: AssetCollection[] = [
  {
    id: "all",
    label: "All assets",
    description: "Everything in this campaign",
    icon: LayoutGrid,
    matches: () => true,
  },
  {
    id: "social",
    label: "Social",
    description: "Posts, stories & graphics",
    icon: ImageIcon,
    matches: isSocial,
  },
  {
    id: "print",
    label: "Print",
    description: "Flyers & mail pieces",
    icon: Printer,
    matches: isPrint,
  },
  {
    id: "email",
    label: "Email",
    description: "Email & fundraising copy",
    icon: Mail,
    matches: isEmail,
  },
  {
    id: "approved",
    label: "Approved",
    description: "Cleared for distribution",
    icon: CheckCircle2,
    matches: (asset) => asset.status === "approved",
  },
  {
    id: "needs_review",
    label: "Needs review",
    description: "Pending compliance / approval",
    icon: Clock3,
    matches: (asset) =>
      asset.status === "needs_review" ||
      asset.compliance_status === "pending" ||
      asset.compliance_status === "required",
  },
];

export function getCollection(id: CollectionId): AssetCollection {
  return ASSET_COLLECTIONS.find((c) => c.id === id) ?? ASSET_COLLECTIONS[0];
}

export function countForCollection(
  collection: AssetCollection,
  assets: DbAsset[],
): number {
  return assets.reduce((total, asset) => total + (collection.matches(asset) ? 1 : 0), 0);
}

function isM7AssetType(value: string): value is M7AssetType {
  return M7_ASSET_TYPES.includes(value as M7AssetType);
}

export function formatAssetType(value: string): string {
  if (isM7AssetType(value)) {
    return ASSET_TYPE_LABELS[value];
  }
  return value.replace(/_/g, " ");
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Maps a collection to a generation target using only existing fields. */
export function generationTargetForCollection(id: CollectionId): {
  assetType: M7AssetType;
  channel: string;
} | null {
  switch (id) {
    case "social":
      return { assetType: "social_post", channel: "social" };
    case "print":
      return { assetType: "flyer", channel: "print" };
    case "email":
      return { assetType: "email", channel: "email" };
    default:
      return null;
  }
}
