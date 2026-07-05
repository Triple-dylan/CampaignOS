/**
 * Per-campaign graph customization preferences — Obsidian gear-panel parity.
 *
 * @see docs/design/graph-customization.md
 */

import type { GraphViewMode } from "@/lib/graph/to-react-flow";
import { DEFAULT_GRAPH_FORCE_SLIDERS } from "@/lib/graph/graph-physics-config";

/** Default zoom threshold below which entity labels compact (CSS fade). */
export const BASE_COMPACT_LABEL_ZOOM = 0.62;

export type CampaignGraphPreferences = {
  version: 1;

  filters: {
    search: string;
    showOrphans: boolean;
    viewMode: GraphViewMode;
    /** 1–4 hops when a node is focused (P1 local graph). */
    localGraphDepth: number;
  };

  display: {
    showArrows: boolean;
    /** Obsidian −3…+3 — higher fades labels earlier when zoomed out. */
    textFadeMultiplier: number;
    /** 0.25–3× on dot diameter. */
    nodeSizeMultiplier: number;
    /** 0.25–3× on edge stroke width. */
    lineSizeMultiplier: number;
  };

  forces: {
    /** 0–2 — centripetal pull (campaign centre pin + weak center). */
    centerStrength: number;
    /** 0–20 — many-body charge scale. */
    repelStrength: number;
    /** 0–2 — link spring stiffness scale. */
    linkStrength: number;
    /** 20–300 — target edge length scale. */
    linkDistance: number;
  };

  colorGroups: Array<{
    id: string;
    query: string;
    color: string;
  }>;
};

export const DEFAULT_CAMPAIGN_GRAPH_PREFERENCES: CampaignGraphPreferences = {
  version: 1,
  filters: {
    search: "",
    showOrphans: true,
    viewMode: "all",
    localGraphDepth: 1,
  },
  display: {
    showArrows: false,
    textFadeMultiplier: 0,
    nodeSizeMultiplier: 1,
    lineSizeMultiplier: 1,
  },
  forces: { ...DEFAULT_GRAPH_FORCE_SLIDERS },
  colorGroups: [],
};

/** Deep-merge persisted partial preferences onto defaults. */
export function mergeCampaignGraphPreferences(
  stored: Partial<CampaignGraphPreferences> | null | undefined,
): CampaignGraphPreferences {
  if (!stored) return { ...DEFAULT_CAMPAIGN_GRAPH_PREFERENCES };

  return {
    version: 1,
    filters: {
      ...DEFAULT_CAMPAIGN_GRAPH_PREFERENCES.filters,
      ...stored.filters,
    },
    display: {
      ...DEFAULT_CAMPAIGN_GRAPH_PREFERENCES.display,
      ...stored.display,
    },
    forces: {
      ...DEFAULT_CAMPAIGN_GRAPH_PREFERENCES.forces,
      ...stored.forces,
    },
    colorGroups: stored.colorGroups ?? [],
  };
}

/** Map Obsidian text-fade slider to React Flow zoom threshold for label CSS. */
export function compactLabelZoomFromTextFade(
  textFadeMultiplier: number,
): number {
  // +3 → labels fade at higher zoom (earlier); −3 → stay visible when zoomed out.
  const factor = Math.pow(1.35, textFadeMultiplier);
  return Math.min(1.4, Math.max(0.25, BASE_COMPACT_LABEL_ZOOM * factor));
}

export const GRAPH_PREFERENCES_STORAGE_KEY = "campaignos:graph-preferences";

export function graphPreferencesStorageKey(campaignId: string): string {
  return `${GRAPH_PREFERENCES_STORAGE_KEY}:${campaignId}`;
}
