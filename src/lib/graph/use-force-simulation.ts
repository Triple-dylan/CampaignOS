"use client";

import * as React from "react";
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceRadial,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
} from "d3-force";
import {
  getNodeDiameter,
  type CampaignFlowEdge,
  type CampaignFlowNode,
} from "@/lib/graph/to-react-flow";

/**
 * Live force-directed physics for the campaign knowledge graph — the Obsidian
 * graph-view feel. A d3-force simulation owns every node's position: on mount
 * the constellation visibly settles into place, dragging a node re-heats the
 * neighbourhood so it elastically follows and re-settles, and graph changes
 * (new knowledge, view-mode filters) glide instead of snapping.
 *
 * Positions land back in React Flow via a monotonically increasing
 * `positionsVersion` + `getPosition()` pair: one state bump per animation
 * frame (the simulation is ticked manually inside rAF, never on d3's own
 * timer), so React renders exactly once per frame while the graph is alive
 * and not at all once it sleeps.
 */

type SimNode = SimulationNodeDatum & {
  id: string;
  /** Half the rendered dot diameter — drives collision + link spacing. */
  radius: number;
  isHub: boolean;
  isCandidate: boolean;
  degree: number;
};

type SimLink = {
  source: string | SimNode;
  target: string | SimNode;
  structural: boolean;
};

/* ---------------------------------------------------------------- *
 * Force tuning. The goal is Obsidian's "folder galaxy": structural
 * belongs_to links hold clusters tight, relationship links stay long
 * and loose so meaning-edges never collapse the layout, and charge +
 * collision keep labels readable.
 * ---------------------------------------------------------------- */

/** Member → folder-hub distance (before node radii are added). */
const STRUCTURAL_MEMBER_DISTANCE = 96;
/** Folder-hub → candidate orbit distance — the cluster ring. */
const STRUCTURAL_HUB_DISTANCE = 400;
/** Cross-folder relationship links stay long and springy. */
const RELATIONSHIP_DISTANCE = 230;
/** Structural links are stiff (clusters form); relationships are loose. */
const STRUCTURAL_STRENGTH = 0.5;
const RELATIONSHIP_STRENGTH = 0.06;
/** Hubs repel hard so clusters stay airy; entities scale with connectivity. */
const HUB_CHARGE = -1500;
const CANDIDATE_CHARGE = -1000;
const ENTITY_CHARGE_BASE = -160;
const ENTITY_CHARGE_PER_DEGREE = -18;
const CHARGE_MAX_DISTANCE = 1200;
/** Label clearance added to each dot's radius for collision. */
const COLLIDE_PADDING_HUB = 30;
const COLLIDE_PADDING_ENTITY = 16;
/** Weak pull toward the canvas origin so the graph never drifts away. */
const CENTER_PULL = 0.04;
const CANDIDATE_CENTER_PULL = 0.14;
/** Gentle radial force keeping folder hubs on their orbit ring. */
const HUB_RADIAL_STRENGTH = 0.06;
/** Settle pacing: ~1.5–2s of visible organic motion, then sleep. */
const ALPHA_DECAY = 0.045;
const ALPHA_MIN = 0.005;
const VELOCITY_DECAY = 0.32;
/** Re-heat used when the visible node set changes (view mode, growth). */
const DATA_CHANGE_ALPHA = 0.4;
/** Drag keeps the local neighbourhood simmering until release. */
const DRAG_ALPHA_TARGET = 0.3;
/** Hard cap for the synchronous (reduced-motion) settle. */
const MAX_SYNC_TICKS = 320;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export type GraphSimulationHandle = {
  /** Bumped once per animation frame while the simulation is awake. */
  positionsVersion: number;
  /** Incremented each time the simulation goes to sleep (settles). */
  settleCount: number;
  /** Current simulated position for a node (null before first tick). */
  getPosition: (id: string) => { x: number; y: number } | null;
  /** Drag lifecycle — pin the node (fx/fy) and re-heat while dragging. */
  startDrag: (id: string, position: { x: number; y: number }) => void;
  moveDrag: (id: string, position: { x: number; y: number }) => void;
  endDrag: (id: string) => void;
};

export function useGraphForceSimulation(input: {
  nodes: CampaignFlowNode[];
  edges: CampaignFlowEdge[];
}): GraphSimulationHandle {
  const { nodes, edges } = input;

  const [positionsVersion, setPositionsVersion] = React.useState(0);
  const [settleCount, setSettleCount] = React.useState(0);

  const simRef = React.useRef<Simulation<SimNode, SimLink> | null>(null);
  const nodeByIdRef = React.useRef<Map<string, SimNode>>(new Map());
  const rafRef = React.useRef<number | null>(null);
  const draggingRef = React.useRef(false);
  const firstBuildRef = React.useRef(true);

  const stopLoop = React.useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  /** Tick the simulation once per animation frame until it settles. */
  const ensureLoop = React.useCallback(() => {
    if (rafRef.current !== null) return;
    const step = () => {
      const sim = simRef.current;
      if (!sim) {
        rafRef.current = null;
        return;
      }
      sim.tick();
      setPositionsVersion((v) => v + 1);
      const asleep =
        sim.alpha() < ALPHA_MIN && sim.alphaTarget() === 0 && !draggingRef.current;
      if (asleep) {
        rafRef.current = null;
        setSettleCount((c) => c + 1);
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  // (Re)build the simulation whenever the visible node/edge set changes.
  // Existing nodes keep their positions and velocities so the graph morphs
  // smoothly; newcomers spawn at their seeded layout position and get pushed
  // into place by the physics.
  React.useEffect(() => {
    const previous = nodeByIdRef.current;

    const simNodes: SimNode[] = nodes.map((flow) => {
      const radius = getNodeDiameter(flow.data.degree ?? 0, flow.data.isFolderHub) / 2;
      const existing = previous.get(flow.id);
      if (existing) {
        existing.radius = radius;
        existing.isHub = flow.data.isFolderHub;
        existing.isCandidate = flow.data.nodeType === "candidate";
        existing.degree = flow.data.degree ?? 0;
        return existing;
      }
      return {
        id: flow.id,
        x: flow.position.x,
        y: flow.position.y,
        radius,
        isHub: flow.data.isFolderHub,
        isCandidate: flow.data.nodeType === "candidate",
        degree: flow.data.degree ?? 0,
      };
    });
    nodeByIdRef.current = new Map(simNodes.map((node) => [node.id, node]));

    // d3 mutates link endpoints in place, so links are rebuilt every time.
    const simLinks: SimLink[] = edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      structural: edge.data?.relationshipType === "belongs_to",
    }));

    // Hub orbit radius from current hub positions, so re-heats respect where
    // the clusters actually live instead of yanking them to a constant.
    const hubs = simNodes.filter((node) => node.isHub);
    const hubOrbit =
      hubs.length > 0
        ? Math.min(
            720,
            Math.max(
              380,
              hubs.reduce(
                (sum, hub) => sum + Math.hypot(hub.x ?? 0, hub.y ?? 0),
                0,
              ) / hubs.length,
            ),
          )
        : STRUCTURAL_HUB_DISTANCE;

    const sim =
      simRef.current ??
      forceSimulation<SimNode>()
        .alphaDecay(ALPHA_DECAY)
        .alphaMin(ALPHA_MIN)
        .velocityDecay(VELOCITY_DECAY)
        .stop(); // never let d3 run its own timer — rAF drives ticks
    simRef.current = sim as Simulation<SimNode, SimLink>;

    sim.nodes(simNodes);
    sim.force(
      "link",
      forceLink<SimNode, SimLink>(simLinks)
        .id((node) => node.id)
        .distance((link) => {
          const source = link.source as SimNode;
          const target = link.target as SimNode;
          if (link.structural) {
            // Hub ↔ candidate scaffolding forms the cluster ring.
            if (
              (source.isHub && target.isCandidate) ||
              (target.isHub && source.isCandidate)
            ) {
              return hubOrbit;
            }
            return STRUCTURAL_MEMBER_DISTANCE + source.radius + target.radius;
          }
          return RELATIONSHIP_DISTANCE;
        })
        .strength((link) =>
          link.structural ? STRUCTURAL_STRENGTH : RELATIONSHIP_STRENGTH,
        ),
    );
    sim.force(
      "charge",
      forceManyBody<SimNode>()
        .strength((node) =>
          node.isHub
            ? HUB_CHARGE
            : node.isCandidate
              ? CANDIDATE_CHARGE
              : ENTITY_CHARGE_BASE + node.degree * ENTITY_CHARGE_PER_DEGREE,
        )
        .distanceMax(CHARGE_MAX_DISTANCE),
    );
    sim.force(
      "collide",
      forceCollide<SimNode>()
        .radius(
          (node) =>
            node.radius +
            (node.isHub ? COLLIDE_PADDING_HUB : COLLIDE_PADDING_ENTITY),
        )
        .strength(0.9)
        .iterations(2),
    );
    sim.force(
      "x",
      forceX<SimNode>(0).strength((node) =>
        node.isCandidate ? CANDIDATE_CENTER_PULL : CENTER_PULL,
      ),
    );
    sim.force(
      "y",
      forceY<SimNode>(0).strength((node) =>
        node.isCandidate ? CANDIDATE_CENTER_PULL : CENTER_PULL,
      ),
    );
    sim.force(
      "hub-orbit",
      hubs.length > 0
        ? forceRadial<SimNode>(hubOrbit, 0, 0).strength((node) =>
            node.isHub ? HUB_RADIAL_STRENGTH : 0,
          )
        : null,
    );

    if (simNodes.length === 0) {
      return;
    }

    const isFirstBuild = firstBuildRef.current;
    firstBuildRef.current = false;

    if (prefersReducedMotion()) {
      // Settle instantly: run the physics to completion synchronously so the
      // layout is identical, without the animated entrance. The single state
      // publish happens on the next frame (never inside the effect body).
      sim.alpha(isFirstBuild ? 1 : DATA_CHANGE_ALPHA).alphaTarget(0);
      let ticks = 0;
      while (sim.alpha() > ALPHA_MIN && ticks < MAX_SYNC_TICKS) {
        sim.tick();
        ticks += 1;
      }
      const raf = requestAnimationFrame(() => {
        setPositionsVersion((v) => v + 1);
        setSettleCount((c) => c + 1);
      });
      return () => cancelAnimationFrame(raf);
    }

    sim.alpha(isFirstBuild ? 1 : DATA_CHANGE_ALPHA).alphaTarget(0);
    ensureLoop();
  }, [nodes, edges, ensureLoop]);

  React.useEffect(() => {
    return () => {
      stopLoop();
      simRef.current?.stop();
      simRef.current = null;
    };
  }, [stopLoop]);

  const getPosition = React.useCallback(
    (id: string): { x: number; y: number } | null => {
      const node = nodeByIdRef.current.get(id);
      if (!node || typeof node.x !== "number" || typeof node.y !== "number") {
        return null;
      }
      return { x: node.x, y: node.y };
    },
    [],
  );

  const startDrag = React.useCallback(
    (id: string, position: { x: number; y: number }) => {
      const sim = simRef.current;
      const node = nodeByIdRef.current.get(id);
      if (!sim || !node) return;
      draggingRef.current = true;
      node.fx = position.x;
      node.fy = position.y;
      // Re-heat so the neighbourhood elastically follows the dragged node.
      sim.alphaTarget(DRAG_ALPHA_TARGET).alpha(Math.max(sim.alpha(), DRAG_ALPHA_TARGET));
      ensureLoop();
    },
    [ensureLoop],
  );

  const moveDrag = React.useCallback(
    (id: string, position: { x: number; y: number }) => {
      const node = nodeByIdRef.current.get(id);
      if (!node) return;
      node.fx = position.x;
      node.fy = position.y;
    },
    [],
  );

  const endDrag = React.useCallback((id: string) => {
    const sim = simRef.current;
    const node = nodeByIdRef.current.get(id);
    draggingRef.current = false;
    if (node) {
      // Release the pin so the node (and its neighbourhood) re-settles.
      node.fx = null;
      node.fy = null;
    }
    sim?.alphaTarget(0);
  }, []);

  return {
    positionsVersion,
    settleCount,
    getPosition,
    startDrag,
    moveDrag,
    endDrag,
  };
}
