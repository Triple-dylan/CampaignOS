# Obsidian Graph Interaction Notes

Research date: 2026-06-28.

## What Obsidian does

Obsidian has two graph modes:

- **Global graph** shows the whole vault, after filters. It is most useful as an audit surface: find clusters, orphans, dense areas, and disconnected notes.
- **Local graph** centers the currently active note and shows connected notes up to a configurable depth. Depth 1 shows direct neighbors; depth 2 adds neighbors of those neighbors.

The global and local graph share the same settings:

- **Filters** include search terms, path/folder queries, tag visibility, attachment visibility, existing-files-only, and orphans.
- **Groups** color matching nodes by search query, commonly `path:...` or `tag:#...`.
- **Display controls** tune arrows, text fade threshold, node size, link thickness, and animation.
- **Forces** tune center force, repel force, link force, and link distance.

The core interaction model is intentionally simple:

- Hover a node to highlight that node and its connections.
- Click a node to open it.
- Right-click a node for actions.
- Node size increases with inbound link count / connectivity.

The important product lesson is that Obsidian does not make the global graph carry all navigation weight. The global graph is ambient context and health checking; the local graph is where the user understands a specific note's neighborhood. Obsidian users often rely on folder/path filters and color groups to make the graph readable, and local graph depth 2 is a common sweet spot before the view becomes noisy.

## CampaignOS today

CampaignOS already has most of the structural primitives needed for an Obsidian-like interaction:

- `toReactFlowGraph` lays out nodes into deterministic folder clusters around the campaign center.
- Folder hubs are first-class graph nodes with `metadata_json.cluster === true`.
- Every wiki-style document belongs to a campaign folder through metadata such as `folder`, `path`, and `knowledgeKind`.
- `filterNodesByViewMode` already supports `folders`, `entities`, and `all`.
- Node size is degree-based, with folder hubs rendered larger.
- Folder hubs use stable accent colors from the folder's primary graph node type.
- `WorkspaceGraphCanvas` already supports selected nodes, smooth recentering, topic highlights, and highlighted edges.
- Chat activity currently simulates Obsidian-like spreading activation with BFS waves from topic-matched folder clusters.

The gap is not graph construction. The gap is interaction state: CampaignOS needs a persistent focus mode that says "this folder or node is the current local graph" and renders everything else as context.

## What to copy

Copy Obsidian's split between global context and local focus:

- Keep the full CampaignOS graph visible as ambient geography when it is useful.
- Add local graph semantics on top of the existing graph instead of replacing the whole view.
- Use folder/path as the primary filter and color grouping axis.
- Treat depth 1 and depth 2 as product concepts, not just graph traversal details.
- Highlight the focused node/folder and its direct neighbors by default.
- Dim unrelated nodes instead of hiding them immediately; hiding can be a stronger filter mode later.
- Keep hover behavior lightweight: hover temporarily foregrounds a node, its edges, and its immediate neighbors.
- Keep click behavior persistent: click commits focus until back/reset.

CampaignOS should also copy the "graph as audit" idea:

- Global graph answers: "What is in this campaign brain, and what is disconnected?"
- Local graph answers: "What matters around this folder, artifact, issue, voter segment, or task right now?"

## What to avoid

Avoid copying Obsidian's hairball failure mode:

- Do not render every node with equal visual weight.
- Do not make tags into always-visible hub nodes by default; tags can become giant attractors that distort the map.
- Do not rely on physics controls as the main solution for readability.
- Do not make users tune graph settings before the graph becomes useful.
- Do not treat the global graph as a file explorer replacement.
- Do not make click only "open details"; in CampaignOS, click should also establish graph focus.

Avoid over-modeling Obsidian's search syntax in the MVP. CampaignOS can start with explicit folder, node type, source object, and relationship filters before adding a general query language.

## Recommended interaction model

### 1. Default: campaign global graph

Default state is the current CampaignOS graph:

- Candidate / campaign center in the middle.
- Folder hubs arranged as stable outer clusters.
- Children arranged around folder hubs.
- Cross-folder edges visible but visually quieter than `belongs_to` structure.
- View toggle remains: `Folders`, `Entities`, `All`.

This is the "global graph" equivalent. It should feel like a living campaign map, not a complete control surface.

### 2. Folder hub focus

When the user clicks a folder hub:

- Set `focus = { type: "folder", folderId }`.
- Recenter camera on the folder hub.
- Keep the folder hub selected.
- Promote all children in that folder to foreground.
- Promote direct cross-folder neighbors of those children to midground.
- Dim every other exterior node and edge.
- Show a focus chip / breadcrumb: `Campaign / Messaging`.
- Show controls: `Back`, `Reset`, and optional `Depth: 1 | 2`.

Visual treatment:

- Focus folder hub: strongest ring, full opacity, elevated z-index.
- Folder children: full opacity, labels visible, slightly larger or "popped out" scale.
- Direct neighbors outside folder: 65-75% opacity, labels visible on hover.
- Exterior unrelated graph: 12-25% opacity, links faint, labels hidden or heavily faded.

This matches the user's desired behavior: clicking a folder makes the interior nodes pop out highlighted while exterior nodes shadow/dim.

### 3. Child node focus

When the user clicks a child node:

- Set `focus = { type: "node", nodeId, parentFolderId }`.
- Keep the parent folder breadcrumb visible: `Campaign / Messaging / Affordable housing`.
- Foreground the selected node and its direct neighbors.
- Midground siblings in the same folder.
- Dim unrelated exterior nodes.
- In depth 2, include neighbors of direct neighbors as midground instead of full foreground.

This is CampaignOS's local graph equivalent. It should help the user understand what surrounds a specific campaign artifact without losing folder context.

### 4. Hover behavior

Hover should be temporary and should not replace committed focus:

- If no focus is active, hover foregrounds the hovered node, incident edges, and immediate neighbors.
- If folder focus is active, hover can further foreground one child and its edges inside the focused folder.
- If node focus is active, hover acts as a preview but does not change breadcrumbs.
- On mouse leave, return to the committed focus state.

Hover is for inspection; click is for navigation state.

### 5. Dimming and highlighting rules

Represent graph relevance as levels instead of a boolean:

- `focus`: selected folder hub or node.
- `foreground`: focused folder children, selected node's direct neighbors, active retrieval path.
- `midground`: depth-2 neighbors or cross-folder neighbors.
- `background`: visible but unrelated context.
- `hidden`: only when a filter explicitly removes nodes.

Recommended opacity:

- Focus: `1.0`
- Foreground: `0.95-1.0`
- Midground: `0.55-0.75`
- Background: `0.12-0.25`
- Hidden: not rendered

Edges should follow the weaker endpoint unless they are part of the active focus path. Active path edges should be visibly brighter than normal structural edges.

### 6. Breadcrumbs, back, and reset

Use a small focus stack:

- Clicking a folder pushes `folder`.
- Clicking a child inside that folder pushes `node`.
- `Back` pops one focus state.
- `Reset` clears the stack and returns to the global graph.
- Pane click should clear hover/preview but should not accidentally destroy committed focus; use explicit reset for that.

Suggested breadcrumb examples:

- `Campaign`
- `Campaign / Messaging`
- `Campaign / Messaging / Affordable housing`

### 7. Filters and groups

Start with opinionated controls:

- Folder filter: show one or more campaign folders.
- Node type filter: assets, people, events, research, compliance, etc.
- Relationship filter: `belongs_to`, `references`, `targets`, `derived_from`, etc.
- Orphans / disconnected toggle for graph health.
- Existing-backed toggle once imported or inferred nodes exist.

Use color groups, but make them system-owned at first:

- Folder colors remain stable.
- Retrieval / assistant activity can add a temporary blue foreground path.
- Compliance risk or stale facts can add warning colors later.

Do not expose arbitrary Obsidian-style query groups until users need that power.

## Implementation notes

This can be implemented without changing graph storage:

- Add graph focus state in `WorkspaceGraphCanvas` or its parent:
  - `focusStack: GraphFocus[]`
  - `hoveredNodeId: string | null`
  - `localDepth: 1 | 2`
- Build an adjacency map from existing React Flow edges.
- Derive a `visibilityLevelByNodeId` map from focus, hover, view mode, and highlighted retrieval nodes.
- Pass visual state through node `data`, replacing the current boolean `highlighted` with a richer status when ready.
- Add edge classes from endpoint visibility plus active-path membership.
- Preserve existing `filterNodesByViewMode`; focus is a visual layer first, not a data filter.

First shippable slice:

1. Folder hub click creates folder focus.
2. Folder children pop to foreground.
3. Exterior nodes and edges dim.
4. Breadcrumb shows `Campaign / {Folder}` with `Reset`.
5. Existing selected-node details still open.

Second slice:

1. Child click creates local node focus.
2. Add depth 1 / depth 2 toggle.
3. Add `Back`.
4. Add hover-neighbor preview.

Third slice:

1. Add graph-health filters like orphans.
2. Replace simulated BFS thinking highlights with actual retrieval traces.
3. Let assistant answers set focus to the folder or node path they used.

## Top recommendation

Make folder hub click the primary interaction. Obsidian's local graph proves that users understand complex knowledge graphs best when the product gives them a focused neighborhood, not when it exposes every node equally. For CampaignOS, that focused neighborhood should be folder-first: click `Messaging`, pop out messaging documents, keep cross-folder campaign relationships visible as dim context, and give the user clear `Back` and `Reset` controls.

## Sources

- Obsidian Help: Graph view, Global Graph, Local Graph, filters, groups, display, forces, and hover/click behavior: https://obsidian.md/help/plugins/graph
- Obsidian forum discussion: selected/local graph focus visibility and foreground/background fading: https://forum.obsidian.md/t/selected-note-shown-highlighted-on-the-local-graph/9643
- Obsidian forum design discussion: graph sculpting, local depth, fading search, and foreground/background mode: https://forum.obsidian.md/t/design-talk-about-the-graph-view/22594
- Dan Holloran, "Making Obsidian's Graph View Actually Useful": practical use of global graph for audits and local graph depth for focused work: https://danholloran.me/posts/making-obsidians-graph-view-actually-useful
