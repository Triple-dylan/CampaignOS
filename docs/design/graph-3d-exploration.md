---
title: Graph 3D exploration
status: shipped (experimental toggle)
updated: 2026-07-05
---

# Graph 3D exploration

## Shipped

- **Gear panel → View:** `2D orbit` | `3D explore` toggle persists in `campaign_graph_preferences.view.renderer`.
- **`Graph3DCanvas`** (`src/components/workspace/graph-3d-canvas.tsx`): dynamic import of `react-force-graph-3d` (no SSR). Same node/link data as React Flow; centre pinned at origin; Z derived from radial distance for depth.
- **2D pseudo-3D (default):** elliptical hub orbits (`forceEllipticalRadial`), per-hub Y-aspect, idle drift rotation, CSS `perspective` + `rotateX(4deg)` on `.graph-stage-orbit`, depth-based opacity/scale/z-index on nodes.

## Dependencies

- `react-force-graph-3d` + `three` — loaded only when user selects 3D.

## Follow-ups

- Relationship-type arrowheads in 3D links
- Shared selection/highlight styling between 2D and 3D
- Camera presets (top-down vs orbit)
- Export PNG from 3D view

## Spike notes

If 3D bundle size becomes an issue, keep 2D maxed and gate 3D behind `NEXT_PUBLIC_GRAPH_3D=1` or org feature flag.
