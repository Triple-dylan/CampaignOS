/**
 * Per-campaign graph customization preferences — Obsidian gear-panel parity.
 *
 * @see docs/design/graph-customization.md
 */

import type { CenterDisplayMode } from "@/lib/graph/center-display";
import type { GraphViewMode } from "@/lib/graph/to-react-flow";
import { DEFAULT_GRAPH_FORCE_SLIDERS } from "@/lib/graph/graph-physics-config";
import { folderAccentColor } from "@/lib/graph/folder-clusters";
import { FOLDER_CLUSTER_ORDER } from "@/lib/graph/folder-clusters";
import type { CampaignFolderId } from "@/lib/campaign-knowledge/types";

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

  /** Pinned campaign centre display mode + optional custom copy. */
  center: {
    displayMode: CenterDisplayMode;
    customLabel: string;
    customSubtitle: string;
  };

  /** 2D React Flow (default) or experimental 3D force-graph view. */
  view: {
    renderer: "2d" | "3d";
  };

  /** Saved node positions — applied when pinLayout is enabled. */
  positions: {
    pinLayout: boolean;
    pinned: Record<string, { x: number; y: number }>;
  };
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
  colorGroups: buildDefaultFolderColorGroups(),
  center: {
    displayMode: "election_dates",
    customLabel: "",
    customSubtitle: "",
  },
  view: {
    renderer: "2d",
  },
  positions: {
    pinLayout: false,
    pinned: {},
  },
};

/** Preset color groups by campaign-knowledge folder. */
export function buildDefaultFolderColorGroups(): CampaignGraphPreferences["colorGroups"] {
  return FOLDER_CLUSTER_ORDER.map((folder) => ({
    id: `folder-${folder}`,
    query: `folder:${folder}`,
    color: folderAccentColor(folder as CampaignFolderId),
  }));
}

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
    colorGroups:
      stored.colorGroups && stored.colorGroups.length > 0
        ? stored.colorGroups
        : DEFAULT_CAMPAIGN_GRAPH_PREFERENCES.colorGroups,
    center: {
      ...DEFAULT_CAMPAIGN_GRAPH_PREFERENCES.center,
      ...stored.center,
    },
    view: {
      ...DEFAULT_CAMPAIGN_GRAPH_PREFERENCES.view,
      ...stored.view,
    },
    positions: {
      ...DEFAULT_CAMPAIGN_GRAPH_PREFERENCES.positions,
      ...stored.positions,
      pinned: {
        ...DEFAULT_CAMPAIGN_GRAPH_PREFERENCES.positions.pinned,
        ...stored.positions?.pinned,
      },
    },
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
