import type { M7AssetType } from "@/lib/validators/assets";

export type SocialAssetTemplateProvider = "canva" | "higgsfield";

export type SocialAssetTemplate = {
  id: string;
  label: string;
  description: string;
  assetType: M7AssetType;
  channel: string;
  platform: string;
  dimensions: string;
  provider: SocialAssetTemplateProvider;
};

export const SOCIAL_ASSET_TEMPLATES = [
  {
    id: "instagram-square-post",
    label: "Instagram square post",
    description: "1080 x 1080 candidate message or issue explainer.",
    assetType: "social_post",
    channel: "instagram",
    platform: "Instagram",
    dimensions: "1080 x 1080",
    provider: "canva",
  },
  {
    id: "instagram-story",
    label: "Instagram story",
    description: "1080 x 1920 vertical story for quick calls to action.",
    assetType: "social_post",
    channel: "instagram",
    platform: "Instagram",
    dimensions: "1080 x 1920",
    provider: "higgsfield",
  },
  {
    id: "facebook-cover",
    label: "Facebook cover",
    description: "820 x 312 campaign page banner with candidate branding.",
    assetType: "social_post",
    channel: "facebook",
    platform: "Facebook",
    dimensions: "820 x 312",
    provider: "canva",
  },
  {
    id: "x-post-card",
    label: "X post card",
    description: "1600 x 900 quote, endorsement, or issue graphic.",
    assetType: "social_post",
    channel: "x",
    platform: "X",
    dimensions: "1600 x 900",
    provider: "canva",
  },
  {
    id: "event-flyer",
    label: "Event flyer",
    description: "Print-friendly event invite that can be exported as PDF.",
    assetType: "flyer",
    channel: "print",
    platform: "Print",
    dimensions: "8.5 x 11 in",
    provider: "canva",
  },
] as const satisfies readonly SocialAssetTemplate[];

export type SocialAssetTemplateId =
  (typeof SOCIAL_ASSET_TEMPLATES)[number]["id"];

export function getSocialAssetTemplate(templateId: string) {
  return SOCIAL_ASSET_TEMPLATES.find((template) => template.id === templateId);
}
