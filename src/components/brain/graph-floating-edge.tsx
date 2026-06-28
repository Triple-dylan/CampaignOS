"use client";

import {
  getStraightPath,
  useInternalNode,
  type EdgeProps,
  type InternalNode,
  type Node,
} from "@xyflow/react";

/**
 * Computes where an edge should meet each node. Because the workspace nodes are
 * circular dots, we draw straight from the boundary of the source circle to the
 * boundary of the target circle — the clean, center-anchored connectors that
 * give the graph its Obsidian feel.
 */
function getCircleAnchors(source: InternalNode<Node>, target: InternalNode<Node>) {
  const sw = source.measured?.width ?? 0;
  const sh = source.measured?.height ?? 0;
  const tw = target.measured?.width ?? 0;
  const th = target.measured?.height ?? 0;

  const scx = source.internals.positionAbsolute.x + sw / 2;
  const scy = source.internals.positionAbsolute.y + sh / 2;
  const tcx = target.internals.positionAbsolute.x + tw / 2;
  const tcy = target.internals.positionAbsolute.y + th / 2;

  const sr = Math.min(sw, sh) / 2;
  const tr = Math.min(tw, th) / 2;

  const dx = tcx - scx;
  const dy = tcy - scy;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;

  return {
    sx: scx + ux * sr,
    sy: scy + uy * sr,
    tx: tcx - ux * tr,
    ty: tcy - uy * tr,
  };
}

export function GraphFloatingEdge({ id, source, target, markerEnd }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty } = getCircleAnchors(sourceNode, targetNode);
  const [edgePath] = getStraightPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  });

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      markerEnd={markerEnd}
      fill="none"
    />
  );
}
