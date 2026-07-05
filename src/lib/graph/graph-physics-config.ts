/**
 * CampaignOS graph physics defaults — extracted from the tuned d3-force
 * constants in `use-force-simulation.ts`. User-facing sliders in the gear panel
 * scale these values; see `scalePhysicsForUserForces`.
 *
 * @see docs/design/graph-customization.md
 */

/** Member → folder-hub distance (before node radii are added). */
export const STRUCTURAL_MEMBER_DISTANCE = 96;
/** Folder-hub → campaign-centre orbit — the cluster ring. */
export const STRUCTURAL_HUB_DISTANCE = 420;
/** Min / max hub orbit radii for varied constellation spacing. */
export const HUB_ORBIT_MIN = 340;
export const HUB_ORBIT_MAX = 520;
/** Cross-folder relationship links stay long and springy. */
export const RELATIONSHIP_DISTANCE = 230;
/** Structural links are stiff (clusters form); relationships are loose. */
export const STRUCTURAL_STRENGTH = 0.5;
export const RELATIONSHIP_STRENGTH = 0.06;
/** Hubs repel hard so clusters stay airy; entities scale with connectivity. */
export const HUB_CHARGE = -1500;
export const CANDIDATE_CHARGE = -1000;
export const ENTITY_CHARGE_BASE = -160;
export const ENTITY_CHARGE_PER_DEGREE = -18;
export const CHARGE_MAX_DISTANCE = 1200;
/** Label clearance added to each dot's radius for collision. */
export const COLLIDE_PADDING_HUB = 30;
export const COLLIDE_PADDING_ENTITY = 16;
/** Weak pull toward the canvas origin so the graph never drifts away. */
export const CENTER_PULL = 0.04;
export const CANDIDATE_CENTER_PULL = 0.14;
/** Gentle radial force keeping folder hubs on their orbit ring. */
export const HUB_RADIAL_STRENGTH = 0.09;
/** Campaign centre is pinned — strongest centripetal hold. */
export const CENTER_PIN_STRENGTH = 0.55;
/** Settle pacing: ~1.5–2s of visible organic motion, then sleep. */
export const ALPHA_DECAY = 0.045;
export const ALPHA_MIN = 0.005;
export const VELOCITY_DECAY = 0.32;
/** Gentle re-heat when the visible node set changes (view mode, growth). */
export const DATA_CHANGE_ALPHA = 0.35;
/** Drag keeps the local neighbourhood simmering until release. */
export const DRAG_ALPHA_TARGET = 0.3;
/** Hard cap for the synchronous (reduced-motion) settle. */
export const MAX_SYNC_TICKS = 320;
/** React Flow store sync cadence during simulation ticks. */
export const STORE_SYNC_INTERVAL = 10;
/** Debounce before re-heating when force sliders change. */
export const FORCE_REHEAT_DEBOUNCE_MS = 150;
/** Alpha target when user adjusts force sliders. */
export const FORCE_CHANGE_ALPHA = 0.4;

/**
 * Obsidian-equivalent reference defaults (for tooltips / docs). CampaignOS
 * numeric defaults differ because of orbit physics and hub clustering.
 */
export const OBSIDIAN_FORCE_DEFAULTS = {
  centerStrength: 0.5,
  repelStrength: 10,
  linkStrength: 1,
  linkDistance: 250,
} as const;

/** User-facing force slider defaults — calibrated to current tuned layout. */
export const DEFAULT_GRAPH_FORCE_SLIDERS = {
  centerStrength: CENTER_PIN_STRENGTH,
  repelStrength: OBSIDIAN_FORCE_DEFAULTS.repelStrength,
  linkStrength: OBSIDIAN_FORCE_DEFAULTS.linkStrength,
  linkDistance: OBSIDIAN_FORCE_DEFAULTS.linkDistance,
} as const;

export type GraphForceSliders = {
  centerStrength: number;
  repelStrength: number;
  linkStrength: number;
  linkDistance: number;
};

export type ScaledGraphPhysics = {
  structuralMemberDistance: number;
  structuralHubDistance: number;
  relationshipDistance: number;
  structuralStrength: number;
  relationshipStrength: number;
  hubCharge: number;
  candidateCharge: number;
  entityChargeBase: number;
  entityChargePerDegree: number;
  centerPull: number;
  candidateCenterPull: number;
  hubRadialStrength: number;
  centerPinStrength: number;
};

/**
 * Maps Obsidian-style force sliders onto CampaignOS physics constants. Each
 * slider value is relative to {@link DEFAULT_GRAPH_FORCE_SLIDERS} / Obsidian
 * defaults so "Restore defaults" reproduces the current production layout.
 */
export function scalePhysicsForUserForces(
  forces: GraphForceSliders,
): ScaledGraphPhysics {
  const centerScale =
    forces.centerStrength / DEFAULT_GRAPH_FORCE_SLIDERS.centerStrength;
  const repelScale =
    forces.repelStrength / DEFAULT_GRAPH_FORCE_SLIDERS.repelStrength;
  const linkScale =
    forces.linkStrength / DEFAULT_GRAPH_FORCE_SLIDERS.linkStrength;
  const distanceScale =
    forces.linkDistance / DEFAULT_GRAPH_FORCE_SLIDERS.linkDistance;

  return {
    structuralMemberDistance: STRUCTURAL_MEMBER_DISTANCE * distanceScale,
    structuralHubDistance: STRUCTURAL_HUB_DISTANCE * distanceScale,
    relationshipDistance: RELATIONSHIP_DISTANCE * distanceScale,
    structuralStrength: STRUCTURAL_STRENGTH * linkScale,
    relationshipStrength: RELATIONSHIP_STRENGTH * linkScale,
    hubCharge: HUB_CHARGE * repelScale,
    candidateCharge: CANDIDATE_CHARGE * repelScale,
    entityChargeBase: ENTITY_CHARGE_BASE * repelScale,
    entityChargePerDegree: ENTITY_CHARGE_PER_DEGREE * repelScale,
    centerPull: CENTER_PULL * centerScale,
    candidateCenterPull: CANDIDATE_CENTER_PULL * centerScale,
    hubRadialStrength: HUB_RADIAL_STRENGTH * centerScale,
    centerPinStrength: CENTER_PIN_STRENGTH * centerScale,
  };
}

export const DEFAULT_GRAPH_PHYSICS = scalePhysicsForUserForces(
  DEFAULT_GRAPH_FORCE_SLIDERS,
);
