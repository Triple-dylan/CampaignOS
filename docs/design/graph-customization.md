---
title: Graph customization — Obsidian parity & CampaignOS roadmap
status: draft
updated: 2026-07-05
---

# Graph customization

Research-backed inventory of Obsidian Graph view controls, mapped against CampaignOS today, with a prioritized roadmap for user-facing graph customizability.

**Sources:** [Obsidian Help — Graph view](https://obsidian.md/help/plugins/graph), [obsidian-help Graph view.md](https://github.com/obsidianmd/obsidian-help/blob/master/en/Plugins/Graph%20view.md), [Obsidian Hub — Graph view customization (CSS bridge)](https://publish.obsidian.md/hub/04+-+Guides%2C+Workflows%2C+%26+Courses/Guides/Graph+view+customization), community reverse-engineering of persisted `graph.json` (ObsiViewer / forum guides), Obsidian 1.9.5 changelog (filter flash fix).

There is no standalone “Graph 2.0” release. Core graph settings have been stable since ~v0.11 (color groups). Recent work is incremental: performance, saved-filter application on open (1.9.5 EA), and community plugins (deterministic layout, extended shapes, position save/undo).

---

## 1. Obsidian settings inventory

**Count:** 17 primary user controls in the settings panel, plus 1 local-graph-only control, 8 interaction behaviors, 1 global vault setting that affects the graph, and 11 CSS-bridge classes for advanced theming.

### Settings panel (gear icon)

| # | Setting | Section | What it does | Why users care |
|---|---------|---------|--------------|----------------|
| 1 | **Restore default settings** | Global | Resets all graph settings to factory defaults | Safe experimentation; recover from “I broke my layout” |
| 2 | **Search files** | Filters | Filters visible nodes by Obsidian search syntax (`path:`, `tag:`, regex, boolean) | Focus on a subset; highlight a project or folder |
| 3 | **Tags** | Filters | Show/hide tag nodes as first-class graph nodes | Tags as hubs vs noise; tag-centric vaults |
| 4 | **Attachments** | Filters | Show/hide non-markdown files (images, PDFs) | Keep graph readable; attachments rarely need topology |
| 5 | **Existing files only** | Filters | Hide “unresolved” link targets (linked but no file) | Distinguish real notes from aspirational links |
| 6 | **Orphans** | Filters | Show/hide notes with zero links | Find disconnected notes vs reduce clutter |
| 7 | **Groups → New group** | Groups | Add a color rule: search query + pick color | Visual taxonomy without moving files |
| 8 | **Groups → query + color** (repeatable) | Groups | Each group paints matching nodes one color (first match wins in practice) | Folder/tag/issue coloring at a glance |
| 9 | **Arrows** | Display | Toggle directed edge markers | See link direction (A→B vs bidirectional feel) |
| 10 | **Text fade threshold** | Display | Slider controlling label opacity vs zoom (multiplier ~−3…+3) | Readable when zoomed in; clean constellation when zoomed out |
| 11 | **Node size** | Display | Global multiplier (~0.25…3×) on dot radius | Accessibility; dense vs airy graphs |
| 12 | **Link thickness** | Display | Global multiplier (~0.25…3×) on edge stroke | Emphasize connectivity; match high-DPI screens |
| 13 | **Animate** | Display | Time-lapse: nodes appear in creation-time order | Onboarding narrative; vault growth over time |
| 14 | **Center force** | Forces | Pull toward center (~0…2, default **0.5**) | Compact “ball” vs sparse cloud |
| 15 | **Repel force** | Forces | Many-body charge (~0…20, default **10**) | Node spacing; prevent overlap |
| 16 | **Link force** | Forces | Link spring stiffness (~0…2, default **1**) | Tight vs loose clusters along edges |
| 17 | **Link distance** | Forces | Target edge length (~20…300, default **250**) | Local neighbourhood radius |

**Obsidian defaults (persisted in vault `graph.json`):**

```json
{
  "showTags": false,
  "showAttachments": false,
  "hideUnresolved": false,
  "showOrphans": true,
  "showArrow": false,
  "textFadeMultiplier": 0,
  "nodeSizeMultiplier": 1,
  "lineSizeMultiplier": 1,
  "centerStrength": 0.5,
  "repelStrength": 10,
  "linkStrength": 1,
  "linkDistance": 250
}
```

### Local graph only

| # | Setting | What it does | Why users care |
|---|---------|--------------|----------------|
| 18 | **Depth slider** | How many hops from the active note to include (1 = neighbours only) | Controlled “ego network” without the full vault |

Local graph inherits all 17 panel settings; depth is the extra control at the top of the filter panel.

### Global vault setting (not in graph gear, but affects graph)

| Setting | Effect |
|---------|--------|
| **Excluded files** (Settings → Files & links) | Glob patterns; matching files never appear in graph |

### Intrinsic behavior (not sliders, but user-visible)

| Behavior | Detail |
|----------|--------|
| **Node size by link count** | More backlinks → larger circle (before multiplier) |
| **Hover** | Highlights node + incident edges |
| **Click node** | Opens note in editor |
| **Right-click node** | Context menu (open, delete, etc.) |
| **Scroll / +/-** | Zoom |
| **Drag pane / arrow keys** | Pan (Shift = faster) |
| **Drag node** | Repositions node; physics re-heats; position persists in session |

### Advanced: CSS snippets (WebGL bridge)

Obsidian renders the graph in WebGL; normal CSS cannot style individual nodes. Obsidian exposes **color bridge classes** in Appearance → CSS snippets:

| CSS class | Targets |
|-----------|---------|
| `.graph-view.color-fill` | Default node fill |
| `.graph-view.color-fill-focused` | Focused node (transparent disables) |
| `.graph-view.color-fill-tag` | Tag nodes |
| `.graph-view.color-fill-attachment` | Attachment nodes |
| `.graph-view.color-fill-unresolved` | Unresolved link nodes |
| `.graph-view.color-arrow` | Arrowheads |
| `.graph-view.color-circle` | Node circles |
| `.graph-view.color-line` | Edges |
| `.graph-view.color-text` | Labels |
| `.graph-view.color-fill-highlight` | Search highlight fill |
| `.graph-view.color-line-highlight` | Search highlight edges |

Power users combine **Groups** (query-based) with snippets (global palette / tag / unresolved colors).

---

## 2. CampaignOS current state

Mapped 1:1 to Obsidian where possible. Implementation references are the live codebase as of 2026-07-05.

### Filters & visibility

| Obsidian | CampaignOS today | Notes |
|----------|------------------|-------|
| Search files | **Partial** | Assistant-driven topic highlight (`highlightedNodeIds` in `workspace-home.tsx`); no user text filter in graph |
| Tags toggle | **N/A** | Tags are not graph nodes; `node_type` + folder taxonomy instead |
| Attachments toggle | **N/A** | No attachment nodes in campaign graph |
| Existing files only | **N/A** | All graph nodes are persisted DB rows |
| Orphans toggle | **Missing** | No filter for degree-0 nodes |
| Excluded files | **Partial** | `MAX_DISPLAY_GRAPH_NODES = 200` truncates display; not user-configurable |
| View mode: Folders / Entities / All | **Yes** | `filterNodesByViewMode` + pill toggle in `workspace-graph-canvas.tsx` |
| Local graph depth | **Partial** | Folder-focus dimming (`computeFolderFocusLevels`) ≈ depth-1 around a **folder**, not hop depth from any entity |

### Groups & colors

| Obsidian | CampaignOS today | Notes |
|----------|------------------|-------|
| Custom search groups | **Missing** | No user-defined color rules |
| Color by folder | **Yes** | Folder hub accent via `folderAccentColor`; entities use `GRAPH_NODE_MINIMAP_COLORS` by `node_type` |
| Color by tag | **N/A** | — |
| CSS snippet bridge | **Partial** | `globals.css` theme tokens; not user-editable |

### Display

| Obsidian | CampaignOS today | Notes |
|----------|------------------|-------|
| Node size by links | **Yes** | `getNodeDiameter(degree, …)` in `to-react-flow.ts` |
| Node size multiplier | **Missing** | Fixed formula (15–36px entities; hubs 46px; center 58px) |
| Link thickness multiplier | **Missing** | Fixed CSS: 1px default, modifiers for structural/hover/active |
| Arrows | **Missing** | Straight edges, no `markerEnd` in `graph-floating-edge.tsx` |
| Text fade threshold | **Partial** | Fixed zoom threshold `COMPACT_LABEL_ZOOM = 0.62`; CSS `.graph-labels-compact` |
| Animate (time-lapse) | **Partial** | Per-node entrance pop + canvas fade; not chronological replay |
| Restore defaults | **Missing** | — |

### Forces / physics

| Obsidian | CampaignOS today | Notes |
|----------|------------------|-------|
| Center force | **Hardcoded** | `CENTER_PULL`, `CENTER_PIN_STRENGTH`, `forceX`/`forceY` in `use-force-simulation.ts` |
| Repel force | **Hardcoded** | Per-node-type charges (`HUB_CHARGE`, `ENTITY_CHARGE_*`, `forceManyBody`) |
| Link force | **Hardcoded** | `STRUCTURAL_STRENGTH` / `RELATIONSHIP_STRENGTH` |
| Link distance | **Hardcoded** | Structural vs relationship distances + orbit radii |
| Simulation on/off | **Always on** | d3-force with re-heat on data change / drag |
| Reheat on drag | **Yes** | `startDrag` / `endDrag` pin + release |
| Orbit / radial forces | **CampaignOS+** | Hub orbit ring (`forceRadial`) — not in Obsidian |

### Interaction

| Obsidian | CampaignOS today | Notes |
|----------|------------------|-------|
| Hover → highlight edges | **Yes** | `hoveredNodeId` → `.is-hover` edge classes |
| Click → open note | **Partial** | Opens context **panel** (`onSelectNode` → `setPanelOpen`); not raw markdown editor |
| Click → local focus | **Yes (folder)** | Folder hub click → focus levels + camera push-in |
| Drag to pin | **Session only** | `fx`/`fy` during drag; **released on drop** — not persisted |
| Saved positions | **Read path only** | `readPositionFromMetadata` supports `metadata.x/y`; drag does not write back |
| Zoom / pan | **Yes** | React Flow; min/max zoom; gesture-aware camera queue |
| Keyboard nav | **Partial** | `Escape` exits focus / clears selection; no arrow-key pan |
| Right-click menu | **Missing** | — |
| Search highlight in graph | **Yes (AI)** | Thinking pulse + topic cluster glow |

### Persistence

| Obsidian | CampaignOS today |
|----------|------------------|
| Settings in vault `graph.json` | **None** — all constants in code / CSS |
| Per-user preferences | **None** in DB schema |

---

## 3. Gap analysis (prioritized)

### Must-have — MVP parity with Obsidian’s core “gear panel”

Users expect to tune layout and readability without engineering help.

| Priority | Gap | Rationale |
|----------|-----|-----------|
| P0 | **Forces sliders** (center, repel, link force, link distance) | #1 support request in large graphs; we already mirror Obsidian physics |
| P0 | **Display multipliers** (node size, link thickness, text fade) | Accessibility + zoom readability |
| P0 | **Graph settings panel** (gear + Restore defaults) | Discoverability; Obsidian mental model |
| P1 | **User search filter** (dim/hide non-matches) | Campaign graphs grow; folder toggle alone is insufficient |
| P1 | **Entity local graph + depth** | Click any entity → N-hop neighbourhood focus (not only folder hubs) |
| P1 | **Persist preferences per campaign** | Multi-user orgs; layout taste differs by role |

### Nice-to-have

| Gap | Rationale |
|-----|-----------|
| **Custom color groups** (query → color) | Power users; maps to `path:research/` or `node_type:donor` |
| **Arrows toggle** | Relationship types are directed in DB (`relationship_type`) |
| **Orphan / low-degree filter** | Housekeeping disconnected knowledge |
| **Pin node persistently** | Drag-release currently unpins; Obsidian keeps layout until reset |
| **Settings section on Settings page** | Org-wide defaults vs per-session graph gear overrides |

### Future / advanced

| Gap | Rationale |
|-----|-----------|
| Time-lapse animation (created_at order) | Delight; less critical for campaigns |
| User CSS / theme tokens export | Enterprise white-label |
| “Unresolved link” / stub nodes | When wikilink extraction ships (`related[]` / body links) |
| Tag nodes as graph entities | If we add `#tag` frontmatter indexing |
| Deterministic layout mode | Community plugin pattern; accessibility / screenshots |
| Graph export (SVG/PNG) | Reporting, decks |
| Keyboard pan (+/- zoom already partial via React Flow) | Power-user navigation |

---

## 4. Recommended settings UI

### Where settings live

| Surface | Purpose | Persistence |
|---------|---------|-------------|
| **Gear icon on graph canvas** (top-right, beside stats pill) | Primary — matches Obsidian; in-context tuning with live preview | `campaign_graph_preferences` JSON (see below) |
| **Settings → Campaign → Graph** (subsection) | Org admin defaults, color-group presets, “reset all campaigns” | `organizations.default_graph_preferences` or campaign profile extension |
| **Not in rail / composer** | Avoid competing with chat-first workflow | — |

### Panel structure (mirror Obsidian sections)

```
┌─ Graph settings ─────────────── [Restore defaults] ─┐
│ ▼ Filters                                              │
│   Search nodes …………………………… [input]                   │
│   ☐ Hide orphan nodes (degree 0)                       │
│   View: ( Folders | Entities | All )  ← move from pill │
│   Local depth: ———●———  (when a node is focused)       │
│ ▼ Groups                                               │
│   [+ New group]  query + color swatches                  │
│ ▼ Display                                              │
│   ☐ Show link arrows                                   │
│   Text fade ……… slider                                 │
│   Node size ……… slider                                 │
│   Link thickness … slider                              │
│ ▼ Forces                                               │
│   Center ……… slider                                    │
│   Repel ……… slider                                     │
│   Link force ……… slider                                │
│   Link distance ……… slider                             │
└────────────────────────────────────────────────────────┘
```

**UX notes:**

- Sliders update physics live; debounce re-heat (~150ms) to avoid jank.
- “Restore defaults” resets to **CampaignOS defaults** (not necessarily Obsidian numeric defaults — document both in UI tooltip).
- Collapsible section open/closed state can stay in `localStorage` per device; physics/display values in Supabase.
- Folder / Entities / All toggle can migrate into Filters to reduce duplicate chrome (keep quick toggle optional).

### Data model: `campaign_graph_preferences`

Add JSONB column on `campaigns` (or `campaign_profiles` if preferences are user-facing campaign config):

```typescript
/** @see docs/design/graph-customization.md */
export type CampaignGraphPreferences = {
  version: 1;

  filters: {
    search: string;
    showOrphans: boolean;
    viewMode: "all" | "folders" | "entities";
    localGraphDepth: number; // 1–4, used when a node is focused
  };

  display: {
    showArrows: boolean;
    textFadeMultiplier: number; // map to zoom threshold; Obsidian −3…+3
    nodeSizeMultiplier: number; // 0.25–3, default 1
    lineSizeMultiplier: number; // 0.25–3, default 1
  };

  forces: {
    centerStrength: number;   // 0–2, default TBD after calibration
    repelStrength: number;    // scale our charge constants
    linkStrength: number;     // scale structural + relationship
    linkDistance: number;     // scale distance fn
  };

  colorGroups: Array<{
    id: string;
    query: string; // CampaignOS search dialect: path, node_type, folder
    color: string; // hex
  }>;
};
```

**API:** `getCampaignGraphPreferences(campaignId)` / `updateCampaignGraphPreferences` server action; optimistic merge on workspace load.

**Migration:** nullable column; `{}` → merge with `DEFAULT_CAMPAIGN_GRAPH_PREFERENCES` in `src/lib/graph/graph-preferences.ts`.

---

## 5. Implementation sketch — top 5 gaps

### Gap 1: Forces sliders (P0)

| Touch | Change |
|-------|--------|
| `src/lib/graph/graph-physics-config.ts` | **New.** Export `DEFAULT_GRAPH_PHYSICS`, `DEFAULT_GRAPH_FORCES`, Obsidian-equivalent comments, multiplier helpers |
| `src/lib/graph/use-force-simulation.ts` | Accept optional `forces: CampaignGraphPreferences['forces']`; scale existing constants |
| `src/components/workspace/graph-settings-panel.tsx` | **New.** Forces section sliders |
| `src/components/workspace/workspace-graph-canvas.tsx` | Pass preferences into simulation hook; gear opens panel |

No canvas algorithm changes beyond parameterizing existing forces.

### Gap 2: Display multipliers (P0)

| Touch | Change |
|-------|--------|
| `src/lib/graph/to-react-flow.ts` | `getNodeDiameter(..., multiplier)` |
| `src/app/globals.css` | `--graph-edge-width: 1` custom property; multiply in edge rules |
| `workspace-graph-canvas.tsx` | Replace hardcoded `COMPACT_LABEL_ZOOM` with fn of `textFadeMultiplier` |
| `graph-floating-edge.tsx` | Optional `markerEnd` when `showArrows` |

### Gap 3: User search filter (P1)

| Touch | Change |
|-------|--------|
| `src/lib/graph/graph-search.ts` | **New.** Parse simple queries: `folder:research`, `type:donor`, plain text on title/summary/path |
| `workspace-graph-canvas.tsx` | Filter `visibleFlowNodes` or assign `focusLevel: 'background'` to non-matches |
| `graph-settings-panel.tsx` | Filters → search input (debounced) |

Reuse Obsidian-style dimming already used for folder focus.

### Gap 4: Entity local graph + depth (P1)

| Touch | Change |
|-------|--------|
| `src/lib/graph/to-react-flow.ts` | **New.** `computeLocalGraphLevels({ rootId, depth, nodes, edges })` — BFS hops |
| `workspace-graph-canvas.tsx` | On entity click (non-hub), set `focusNodeId` + apply levels; folder hub keeps current behavior |
| `graph-settings-panel.tsx` | Depth slider enabled when any focus active |

Unifies folder-focus and Obsidian local-graph under one `focusLevel` visual system.

### Gap 5: Persist preferences per campaign (P1)

| Touch | Change |
|-------|--------|
| `supabase/migrations/0xx_campaign_graph_preferences.sql` | `ALTER TABLE campaigns ADD COLUMN graph_preferences JSONB DEFAULT NULL` |
| `src/lib/db/schema.ts` | Type + merge helper |
| `src/actions/campaigns.ts` | `updateGraphPreferences` |
| `src/components/workspace/workspace-home.tsx` | Load preferences with campaign; pass to canvas |

**Pin positions (related):** on `endDrag`, optionally PATCH `graph_nodes.metadata_json` with `{ x, y }` when user enables “Pin layout” — separate follow-up; read path exists in `readPositionFromMetadata`.

---

## 6. CampaignOS ↔ Obsidian semantic mapping

CampaignOS is not a markdown vault; map Obsidian concepts deliberately:

| Obsidian | CampaignOS equivalent |
|----------|----------------------|
| Note | Graph node (`graph_nodes` row) |
| Internal link | Graph edge (`relationship_type`) |
| Folder path | Campaign knowledge folder (`campaign/assets/…`) |
| Tag node | Future: frontmatter tags; today use `node_type` |
| Attachment | Asset nodes / file-backed research docs |
| Unresolved link | Future: wikilink stubs without DB node |
| Orphan | `degree === 0` |
| Local graph | Entity or folder focus + depth slider |
| Groups query | `folder:messaging OR node_type:issue` dialect |

---

## 7. Recent Obsidian changes (relevant)

| Version / date | Change | Implication for us |
|----------------|--------|-------------------|
| 1.9.5 (2025-07) | Saved graph filters apply immediately (no node flash) | When we persist filters, apply before first paint / SSR hydration |
| Roadmap | Graph performance (ongoing) | Keep DOM-direct physics path; settings re-heat should not rebuild React tree |
| Community | Deterministic / Extended Graph plugins | Optional “fixed layout” mode later — not MVP |

---

## 8. Success criteria

- [ ] Gear panel with Filters / Groups / Display / Forces sections
- [ ] Restore defaults
- [ ] Preferences survive reload (per campaign)
- [ ] Forces + display sliders produce visible, reversible layout changes
- [ ] Entity local graph with depth ≥ 1
- [ ] Documented mapping for support (“Obsidian Repel ≈ CampaignOS Repel slider”)

**Follow-up task:** Implement P0 items in a dedicated PR; avoid conflicting with concurrent orbit / white UI polish in `use-force-simulation.ts` / canvas — coordinate on `graph-physics-config.ts` extraction first.
