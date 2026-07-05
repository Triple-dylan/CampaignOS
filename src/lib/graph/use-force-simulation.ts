"use client";

import * as React from "react";
import { useReactFlow, useStoreApi, type Node } from "@xyflow/react";
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
  ALPHA_DECAY,
  ALPHA_MIN,
  DATA_CHANGE_ALPHA,
  DRAG_ALPHA_TARGET,
  FORCE_CHANGE_ALPHA,
  FORCE_REHEAT_DEBOUNCE_MS,
  HUB_ORBIT_MAX,
  HUB_ORBIT_MIN,
  MAX_SYNC_TICKS,
  DEFAULT_GRAPH_FORCE_SLIDERS,
  scalePhysicsForUserForces,
  STORE_SYNC_INTERVAL,
  STRUCTURAL_HUB_DISTANCE,
  VELOCITY_DECAY,
  type GraphForceSliders,
  type ScaledGraphPhysics,
} from "@/lib/graph/graph-physics-config";
import {
  getNodeDiameter,
  type CampaignFlowEdge,
  type CampaignFlowNode,
  type CampaignGraphNodeData,
} from "@/lib/graph/to-react-flow";

/**
 * Live force-directed physics for the campaign knowledge graph — the Obsidian
 * graph-view feel. A d3-force simulation is the single source of truth for
 * node positions.
 *
 * The critical performance contract: while the simulation is moving, each
 * animation frame writes node transforms and edge paths *directly to the
 * DOM* — zero React renders per tick. React Flow's store is synced at a low
 * cadence (every ~10 frames, so fitView / hit-testing stay approximately
 * current) and once more when the simulation goes to sleep. Rendering 60+
 * node components and ~100 edge components through React every frame is what
 * made the previous implementation feel like it had "no physics" (5fps).
 *
 * Continuity rules:
 * - Existing nodes keep their simulated positions across data/filter changes.
 * - New nodes spawn at their seeded cluster position and glide into place.
 * - The simulation re-heats gently on changes and sleeps when idle (no rAF).
 * - Force slider changes update d3 forces in-place (no graph remount).
 */

type SimNode = SimulationNodeDatum & {
  id: string;
  /** Half the rendered dot diameter — drives collision + link spacing. */
  radius: number;
  isHub: boolean;
  isCandidate: boolean;
  isCampaignCenter: boolean;
  degree: number;
  /** Per-hub orbit radius — varies by folder for a natural constellation. */
  orbitRadius: number;
  /** Last position written to the DOM — skips sub-pixel writes. */
  domX?: number;
  domY?: number;
};

type SimLink = {
  source: string | SimNode;
  target: string | SimNode;
  structural: boolean;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Fields that affect how a node renders. When these all match, the previous
 * node's `data` reference is reused so the memoized node component skips
 * re-rendering — even when the source graph snapshot was rebuilt wholesale.
 */
function sameCoreData(
  a: CampaignGraphNodeData,
  b: CampaignGraphNodeData,
): boolean {
  return (
    a.dbId === b.dbId &&
    a.title === b.title &&
    a.summary === b.summary &&
    a.nodeType === b.nodeType &&
    a.folder === b.folder &&
    a.isFolderHub === b.isFolderHub &&
    a.isCampaignCenter === b.isCampaignCenter &&
    a.degree === b.degree &&
    a.knowledgePath === b.knowledgePath &&
    a.knowledgeKind === b.knowledgeKind
  );
}

function hubOrbitRadius(nodeId: string, fallback: number): number {
  let hash = 0;
  for (let i = 0; i < nodeId.length; i += 1) {
    hash = (hash * 31 + nodeId.charCodeAt(i)) | 0;
  }
  const t = (((hash % 1000) + 1000) % 1000) / 1000;
  return HUB_ORBIT_MIN + t * (HUB_ORBIT_MAX - HUB_ORBIT_MIN) || fallback;
}

function applyScaledForces(
  sim: Simulation<SimNode, SimLink>,
  simLinks: SimLink[],
  physics: ScaledGraphPhysics,
  hubOrbit: number,
  hubs: SimNode[],
): void {
  sim.force(
    "link",
    forceLink<SimNode, SimLink>(simLinks)
      .id((node) => node.id)
      .distance((link) => {
        const source = link.source as SimNode;
        const target = link.target as SimNode;
        if (link.structural) {
          if (
            (source.isHub && target.isCampaignCenter) ||
            (target.isHub && source.isCampaignCenter)
          ) {
            return source.isHub ? source.orbitRadius : target.orbitRadius;
          }
          if (
            (source.isHub && target.isCandidate) ||
            (target.isHub && source.isCandidate)
          ) {
            return hubOrbit * 0.35;
          }
          return (
            physics.structuralMemberDistance + source.radius + target.radius
          );
        }
        return physics.relationshipDistance;
      })
      .strength((link) =>
        link.structural
          ? physics.structuralStrength
          : physics.relationshipStrength,
      ),
  );
  sim.force(
    "charge",
    forceManyBody<SimNode>()
      .strength((node) => {
        if (node.isCampaignCenter) return 0;
        if (node.isHub) return physics.hubCharge;
        if (node.isCandidate) return physics.candidateCharge;
        return (
          physics.entityChargeBase +
          node.degree * physics.entityChargePerDegree
        );
      })
      .distanceMax(1200),
  );
  sim.force(
    "collide",
    forceCollide<SimNode>()
      .radius(
        (node) =>
          node.radius +
          (node.isCampaignCenter
            ? 36
            : node.isHub
              ? 30
              : 16),
      )
      .strength(0.9)
      .iterations(2),
  );
  sim.force(
    "x",
    forceX<SimNode>(0).strength((node) => {
      if (node.isCampaignCenter) return physics.centerPinStrength;
      if (node.isCandidate) return physics.candidateCenterPull;
      return physics.centerPull;
    }),
  );
  sim.force(
    "y",
    forceY<SimNode>(0).strength((node) => {
      if (node.isCampaignCenter) return physics.centerPinStrength;
      if (node.isCandidate) return physics.candidateCenterPull;
      return physics.centerPull;
    }),
  );
  sim.force(
    "hub-orbit",
    hubs.length > 0
      ? forceRadial<SimNode>(
          (node) => node.orbitRadius || hubOrbit,
          0,
          0,
        ).strength((node) => (node.isHub ? physics.hubRadialStrength : 0))
      : null,
  );
}

export type GraphPhysicsHandle = {
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
  flowNodes: CampaignFlowNode[];
  flowEdges: CampaignFlowEdge[];
  forces?: GraphForceSliders;
  nodeSizeMultiplier?: number;
}): GraphPhysicsHandle {
  const {
    flowNodes,
    flowEdges,
    forces,
    nodeSizeMultiplier = 1,
  } = input;

  const { setNodes } = useReactFlow();
  const storeApi = useStoreApi();
  const [settleCount, setSettleCount] = React.useState(0);

  const simRef = React.useRef<Simulation<SimNode, SimLink> | null>(null);
  const nodeByIdRef = React.useRef<Map<string, SimNode>>(new Map());
  const linksRef = React.useRef<
    { id: string; source: SimNode; target: SimNode }[]
  >([]);
  const nodeElCacheRef = React.useRef<Map<string, HTMLElement>>(new Map());
  const edgeElCacheRef = React.useRef<Map<string, SVGPathElement>>(new Map());
  const rafRef = React.useRef<number | null>(null);
  const tickCountRef = React.useRef(0);
  const draggingRef = React.useRef(false);
  const firstBuildRef = React.useRef(true);
  const seenIdsRef = React.useRef<Set<string>>(new Set());
  const hubOrbitRef = React.useRef(STRUCTURAL_HUB_DISTANCE);
  const physicsRef = React.useRef<ScaledGraphPhysics>(
    scalePhysicsForUserForces(forces ?? DEFAULT_GRAPH_FORCE_SLIDERS),
  );

  const stopLoop = React.useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const applyDomPositions = React.useCallback(() => {
    const dom = storeApi.getState().domNode;
    if (!dom) return;

    const nodeCache = nodeElCacheRef.current;
    const moved = new Set<string>();
    for (const node of nodeByIdRef.current.values()) {
      if (typeof node.x !== "number" || typeof node.y !== "number") continue;
      if (
        node.domX !== undefined &&
        node.domY !== undefined &&
        Math.abs(node.x - node.domX) < 0.15 &&
        Math.abs(node.y - node.domY) < 0.15
      ) {
        continue;
      }
      let el = nodeCache.get(node.id);
      if (!el || !el.isConnected) {
        el = dom.querySelector<HTMLElement>(
          `.react-flow__node[data-id="${CSS.escape(node.id)}"]`,
        ) ?? undefined;
        if (!el) continue;
        nodeCache.set(node.id, el);
      }
      el.style.transform = `translate(${node.x}px, ${node.y}px)`;
      node.domX = node.x;
      node.domY = node.y;
      moved.add(node.id);
    }

    const edgeCache = edgeElCacheRef.current;
    for (const link of linksRef.current) {
      const s = link.source;
      const t = link.target;
      if (!moved.has(s.id) && !moved.has(t.id)) continue;
      if (
        typeof s.x !== "number" ||
        typeof s.y !== "number" ||
        typeof t.x !== "number" ||
        typeof t.y !== "number"
      ) {
        continue;
      }
      let el = edgeCache.get(link.id);
      if (!el || !el.isConnected) {
        el = dom.querySelector<SVGPathElement>(
          `.react-flow__edge[data-id="${CSS.escape(link.id)}"] .react-flow__edge-path`,
        ) ?? undefined;
        if (!el) continue;
        edgeCache.set(link.id, el);
      }
      const scx = s.x + s.radius;
      const scy = s.y + s.radius;
      const tcx = t.x + t.radius;
      const tcy = t.y + t.radius;
      const dx = tcx - scx;
      const dy = tcy - scy;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;
      el.setAttribute(
        "d",
        `M${scx + ux * s.radius},${scy + uy * s.radius}L${tcx - ux * t.radius},${
          tcy - uy * t.radius
        }`,
      );
    }
  }, [storeApi]);

  const publishPositions = React.useCallback(() => {
    const byId = nodeByIdRef.current;
    setNodes((current) => {
      let changed = false;
      const next = current.map((node) => {
        const sim = byId.get(node.id);
        if (!sim || typeof sim.x !== "number" || typeof sim.y !== "number") {
          return node;
        }
        if (node.position.x === sim.x && node.position.y === sim.y) {
          return node;
        }
        changed = true;
        return { ...node, position: { x: sim.x, y: sim.y } };
      });
      return changed ? next : current;
    });
  }, [setNodes]);

  const ensureLoop = React.useCallback(() => {
    if (rafRef.current !== null) return;
    const step = () => {
      const sim = simRef.current;
      if (!sim) {
        rafRef.current = null;
        return;
      }
      sim.tick();
      applyDomPositions();
      tickCountRef.current += 1;
      const asleep =
        sim.alpha() < ALPHA_MIN &&
        sim.alphaTarget() === 0 &&
        !draggingRef.current;
      if (asleep) {
        rafRef.current = null;
        publishPositions();
        setSettleCount((c) => c + 1);
        return;
      }
      if (tickCountRef.current % STORE_SYNC_INTERVAL === 0) {
        publishPositions();
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [applyDomPositions, publishPositions]);

  React.useEffect(() => {
    const previous = nodeByIdRef.current;
    const mult = nodeSizeMultiplier;

    const simNodes: SimNode[] = flowNodes.map((flow) => {
      const radius =
        getNodeDiameter(
          flow.data.degree ?? 0,
          flow.data.isFolderHub,
          flow.data.isCampaignCenter,
          mult,
        ) / 2;
      const existing = previous.get(flow.id);
      if (existing) {
        existing.radius = radius;
        existing.isHub = flow.data.isFolderHub;
        existing.isCandidate = flow.data.nodeType === "candidate";
        existing.isCampaignCenter = flow.data.isCampaignCenter;
        existing.degree = flow.data.degree ?? 0;
        if (flow.data.isFolderHub) {
          existing.orbitRadius = hubOrbitRadius(
            flow.id,
            STRUCTURAL_HUB_DISTANCE,
          );
        }
        return existing;
      }
      return {
        id: flow.id,
        x: flow.position.x,
        y: flow.position.y,
        radius,
        isHub: flow.data.isFolderHub,
        isCandidate: flow.data.nodeType === "candidate",
        isCampaignCenter: flow.data.isCampaignCenter,
        degree: flow.data.degree ?? 0,
        orbitRadius: flow.data.isFolderHub
          ? hubOrbitRadius(flow.id, STRUCTURAL_HUB_DISTANCE)
          : 0,
      };
    });

    for (const node of simNodes) {
      if (node.isCampaignCenter) {
        node.x = 0;
        node.y = 0;
        node.fx = 0;
        node.fy = 0;
      }
    }

    nodeByIdRef.current = new Map(simNodes.map((node) => [node.id, node]));

    const simLinks: SimLink[] = flowEdges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      structural: edge.data?.relationshipType === "belongs_to",
    }));

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
    hubOrbitRef.current = hubOrbit;

    const physics = physicsRef.current;

    const sim =
      simRef.current ??
      forceSimulation<SimNode>()
        .alphaDecay(ALPHA_DECAY)
        .alphaMin(ALPHA_MIN)
        .velocityDecay(VELOCITY_DECAY)
        .stop();
    simRef.current = sim as Simulation<SimNode, SimLink>;

    sim.nodes(simNodes);
    applyScaledForces(sim, simLinks, physics, hubOrbit, hubs);

    linksRef.current = simLinks.map((link, index) => ({
      id: flowEdges[index].id,
      source: link.source as SimNode,
      target: link.target as SimNode,
    }));
    nodeElCacheRef.current.clear();
    edgeElCacheRef.current.clear();

    const isFirstBuild = firstBuildRef.current;
    firstBuildRef.current = false;
    const seen = seenIdsRef.current;
    const simById = nodeByIdRef.current;

    setNodes((current) => {
      const prevById = new Map(current.map((node) => [node.id, node]));
      return flowNodes.map((flow) => {
        const sim = simById.get(flow.id);
        const position =
          sim && typeof sim.x === "number" && typeof sim.y === "number"
            ? { x: sim.x, y: sim.y }
            : flow.position;
        const prev = prevById.get(flow.id);
        if (prev && sameCoreData(prev.data as CampaignGraphNodeData, flow.data)) {
          if (prev.position.x === position.x && prev.position.y === position.y) {
            return prev;
          }
          return { ...prev, position };
        }
        const entering = !isFirstBuild && !seen.has(flow.id);
        seen.add(flow.id);
        const prevData = prev?.data as CampaignGraphNodeData | undefined;
        return {
          id: flow.id,
          type: flow.type,
          position,
          draggable: flow.draggable ?? true,
          data: {
            ...flow.data,
            entering,
            highlighted: prevData?.highlighted ?? false,
            focusLevel: prevData?.focusLevel,
          },
          selected: prev?.selected ?? false,
        } satisfies Node;
      });
    });
    if (isFirstBuild) {
      for (const flow of flowNodes) seen.add(flow.id);
    }

    if (simNodes.length === 0) {
      return;
    }

    if (prefersReducedMotion()) {
      sim.alpha(isFirstBuild ? 1 : DATA_CHANGE_ALPHA).alphaTarget(0);
      let ticks = 0;
      while (sim.alpha() > ALPHA_MIN && ticks < MAX_SYNC_TICKS) {
        sim.tick();
        ticks += 1;
      }
      const raf = requestAnimationFrame(() => {
        applyDomPositions();
        publishPositions();
        setSettleCount((c) => c + 1);
      });
      return () => cancelAnimationFrame(raf);
    }

    sim.alpha(isFirstBuild ? 1 : DATA_CHANGE_ALPHA).alphaTarget(0);
    ensureLoop();
  }, [
    flowNodes,
    flowEdges,
    ensureLoop,
    publishPositions,
    applyDomPositions,
    setNodes,
    // nodeSizeMultiplier intentionally excluded — radius-only updates go through
    // the debounced force effect to avoid remounting the simulation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]);

  // Re-apply force sliders + node size without rebuilding the node set.
  const forceMountRef = React.useRef(true);
  React.useEffect(() => {
    if (!forces) return;
    if (forceMountRef.current) {
      forceMountRef.current = false;
      physicsRef.current = scalePhysicsForUserForces(forces);
      return;
    }
    const timer = setTimeout(() => {
      const sim = simRef.current;
      if (!sim) return;

      physicsRef.current = scalePhysicsForUserForces(forces);
      const mult = nodeSizeMultiplier;

      for (const node of nodeByIdRef.current.values()) {
        node.radius =
          getNodeDiameter(
            node.degree,
            node.isHub,
            node.isCampaignCenter,
            mult,
          ) / 2;
      }

      const hubs = [...nodeByIdRef.current.values()].filter((n) => n.isHub);
      const simLinksFromRef: SimLink[] = linksRef.current.map((link) => {
        const edge = flowEdges.find((e) => e.id === link.id);
        return {
          source: link.source.id,
          target: link.target.id,
          structural: edge?.data?.relationshipType === "belongs_to",
        };
      });

      applyScaledForces(
        sim,
        simLinksFromRef,
        physicsRef.current,
        hubOrbitRef.current,
        hubs,
      );

      sim
        .alphaTarget(0)
        .alpha(Math.max(sim.alpha(), FORCE_CHANGE_ALPHA));
      ensureLoop();
    }, FORCE_REHEAT_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [forces, nodeSizeMultiplier, flowEdges, ensureLoop]);

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
      if (!sim || !node || node.isCampaignCenter) return;
      draggingRef.current = true;
      node.fx = position.x;
      node.fy = position.y;
      sim
        .alphaTarget(DRAG_ALPHA_TARGET)
        .alpha(Math.max(sim.alpha(), DRAG_ALPHA_TARGET));
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
      node.fx = null;
      node.fy = null;
    }
    for (const n of nodeByIdRef.current.values()) {
      if (n.isCampaignCenter) {
        n.fx = 0;
        n.fy = 0;
      }
    }
    sim?.alphaTarget(0);
  }, []);

  return {
    settleCount,
    getPosition,
    startDrag,
    moveDrag,
    endDrag,
  };
}
