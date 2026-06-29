# Why The Knowledge Graph Feels Confusing

Research date: 2026-06-28. Scope: diagnose why the CampaignOS graph can look like nonsense compared with Gbrain, wiki-llm, and the intended campaign-knowledge folder structure.

## Executive Diagnosis

The graph is confusing because CampaignOS currently mixes **three different models** in one visual surface:

1. **wiki-llm model:** folders, `index.md`, `_context.md`, markdown pages, wikilinks, and source-backed compilation.
2. **Gbrain model:** canonical pages, slugs, frontmatter, typed links, backlinks, graph traversal, and retrieval boosts.
3. **CampaignOS live DB model:** `graph_nodes` and `graph_edges` rows seeded from onboarding, AI-generated Campaign Brain JSON, assets, events, tasks, research, and fundraising actions.

The UI is trying to render a wiki/Gbrain-style graph, but the live data is often still entity rows without visible folder hubs, wiki page paths, wikilink provenance, or skill nodes. The result can look like a generic entity constellation: issues, voter segments, priorities, assets, and donors appear as peer nodes around the candidate rather than as pages inside meaningful folder clusters.

## What The Demo Currently Shows

There are two demo graph sources in the repo:

- `src/lib/preview/demo-workspace.ts`
- `src/lib/preview/build-demo-knowledge-graph.ts`

`src/lib/preview/demo-workspace.ts` now includes many of the right visual ingredients:

- A central candidate node.
- Folder hub nodes such as `Messaging`, `People`, `Field`, `Research`, `Assets`, `Events`, `Fundraising`, `Team`, `Skills`, `Initiatives`, and `Compliance`.
- Nodes carrying `metadata_json.folder`, so `folderForNode()` places them in a folder sector.
- `belongs_to` edges from member nodes to folder hubs.
- Skill nodes under the `skills` folder (`Asset Studio drafting`, `Compliance review`, `Research brief`, `Fundraising outreach`).
- Dynamic growth steps that add `KnowledgeNode` documents such as `fundraising/q2-call-time.md`, `events/ballard-meet-greet.md`, and `field/turf-plan-d3.md`.

`src/lib/preview/build-demo-knowledge-graph.ts` is even closer to the desired model. It builds folder hubs using `allFolderClusterNodes()` and creates demo documents with explicit `path`, `folder`, `nodeType`, and `knowledgeKind` metadata.

So if the user still sees nonsense, the likely causes are:

- The visible route is using **production persisted DB rows**, not the curated preview graph.
- Persisted rows were created before folder hubs/folder metadata existed.
- The preview is stale in the browser/dev server cache.
- The static `demo-workspace.ts` and generated `build-demo-knowledge-graph.ts` paths diverge, and the active preview route imports one but not the other.

## What wiki-llm Says Should Show

wiki-llm and Karpathy LLM Wiki imply a very different visual grammar:

- The graph should be a projection of a **compiled wiki**, not a direct dump of generated entities.
- Folder clusters should be first-class navigation: `campaign/`, `messaging/`, `people/`, `field/`, `research/`, `fundraising/`, `assets/`, `events/`, `skills/`, etc.
- A substantive node should usually correspond to a markdown page path like `messaging/affordable-housing.md`, `people/renters.md`, `research/housing-poll.md`, or `skills/asset-studio/SKILL.md`.
- `index.md` and `_context.md` guide retrieval and traversal but should not appear as graph nodes.
- Body wikilinks and frontmatter relationships should compile into edges.
- Lint should identify orphan pages, broken links, missing cross-references, and stale pages.

In other words, the user should be able to answer: "What folder is this node in? What wiki page does it come from? What source produced it? Why is this edge here?"

## What CampaignOS Actually Shows In Production

The production action `getCampaignGraph()` reads from Supabase:

- `listGraphNodes(context.campaign.id)`
- `listGraphEdges(context.campaign.id)`
- `toReactFlowGraph({ nodes, edges })`

That means the production graph is only as structured as the persisted `graph_nodes.metadata_json` and `graph_edges` rows.

Several graph writers create rows without folder metadata:

- `seedCampaignGraphNodes()` creates candidate, issue, and voter segment nodes with `metadata: { source: "onboarding" }`.
- `enrichCampaignBrainGraph()` creates issue, message theme, and strategic priority nodes with `metadata: { source: "campaign_brain" }`, plus some issue/scope fields, but no `folder`.
- `linkAssetToCampaignGraph()` uses `metadata: { source: "asset_studio", assetType }`.
- `linkEventToCampaignGraph()` uses `metadata: { source: "planner", eventType }`.
- `linkTaskToCampaignGraph()` uses `metadata: { source: "tasks", status }`.
- `linkResearchToCampaignGraph()` uses `metadata: { source: "research_hub", researchType }`.

The layout falls back to `NODE_TYPE_FOLDER` in `src/lib/graph/folder-clusters.ts`:

- `issue` -> `messaging`
- `voter_segment` -> `people`
- `message_theme` -> `messaging`
- `research` -> `research`
- `strategic_priority` -> `initiatives`
- `task` -> `initiatives`
- `asset` -> `assets`

That fallback helps the layout, but it does not create the missing conceptual objects: folder hubs, wiki page nodes, source paths, skill pages, or compiled index context.

## Are Voter Segments And Issues Shown As Peers?

Yes, in the live DB model they can be perceived as peers even if the layout places them in different sectors.

Why:

- Onboarding creates `issue` and `voter_segment` rows as direct graph nodes.
- Campaign Brain creates more `issue` and `message_theme` rows.
- Edges often connect candidate -> issue (`supports`) and issue -> message theme (`aligns_with`), or campaign object -> candidate (`belongs_to`).
- There may be no folder hub node between the candidate and the issue/segment.
- There may be no `metadata_json.path` such as `messaging/affordable-housing.md` or `people/renters.md`.

In wiki-llm terms, `Affordable housing` should probably be a page inside `messaging/` or `research/` with links to voter segment pages. In the live graph it is often just an `issue` row. `Renters` should be a page inside `people/` or a field universe under `field/`, not just a peer entity beside issues.

## Missing Nodes

The current architecture defines these concepts but production does not consistently materialize them:

- **Folder hub nodes:** `folderClusterNode()` and `DynamicCampaignGraph.mergeFromFolderPath()` can create them, and demos include them, but `getCampaignGraph()` does not inject missing folder hubs around DB rows.
- **Wiki page nodes:** `documentNodeFromFrontmatter()` maps a markdown page to a `KnowledgeNode`, but there is no production sync job that reads campaign knowledge pages and upserts graph nodes.
- **Skill nodes:** the demo includes skill playbooks under `skills/`; production graph does not automatically expose `src/lib/harness/skills/*/SKILL.md` as graph nodes.
- **Index/log/meta nodes:** these should stay out of the graph, but their absence is only correct if their navigation effect is present elsewhere. Currently retrieval is not index-first, so the user gets neither visible meta nodes nor the navigation benefit.
- **Raw source nodes:** wiki-llm writes `raw/` source pages and links generated pages to `source_raw`. CampaignOS has source object fields for DB rows but not a raw-source page layer.
- **Backlink/relationship audit nodes or diagnostics:** Gbrain surfaces graph health through doctor/backlink/graph-query commands. CampaignOS has no equivalent user-visible diagnosis.

## Missing Edges

The UI can only explain relationships that exist in `graph_edges`. Current gaps:

- No deterministic body wikilink extraction from campaign markdown pages.
- No campaign equivalent of Gbrain's `FRONTMATTER_LINK_MAP`.
- No auto-link reconciliation on every page write.
- No back-link enforcement.
- No graph backfill command that scans pages and creates missing edges.
- No typed traversal command to debug "why is this connected?"

This makes the graph look arbitrary. If an edge came from an LLM JSON field, a DB object relationship, a demo fixture, or a folder `belongs_to`, the user cannot easily tell.

## Production/Demo Staleness Risk

The repo shows evidence of a graph redesign in progress:

- `docs/architecture/wiki-llm-folder-structure.md` says each folder should produce a cluster and each document should belong to a cluster.
- `src/lib/campaign-knowledge/graph-mapping.ts` implements folder/document/meta mapping.
- `src/lib/graph/dynamic-graph.ts` can create hubs and sync `KnowledgeNode` documents into clusters.
- `src/lib/preview/demo-workspace.ts` now includes folder hubs and skill nodes.
- `src/lib/preview/build-demo-knowledge-graph.ts` appears to be a richer generated demo builder.

But production `src/actions/brain.ts` only converts persisted DB rows to React Flow. It does not run the campaign-knowledge folder mapping. Existing campaigns can therefore keep old, hubless, pathless graph rows until a migration/backfill runs.

## Why This Does Not Match Gbrain

Gbrain's graph makes sense because:

- Pages and slugs are canonical.
- Filing rules determine where pages go.
- Links are extracted from markdown and frontmatter.
- Edge types are deterministic and inspectable.
- Backlinks are mandatory.
- Graph traversal is a CLI/tooling behavior, not just a canvas effect.
- Search quality depends on graph quality, so graph maintenance has operational value.

CampaignOS currently has pieces of that model but not the full loop. The graph UI arrived before the compiled wiki sync and maintenance loop were complete.

## Why This Does Not Match wiki-llm

wiki-llm makes sense because:

- Raw sources are preserved.
- Generated pages are compiled at ingest time.
- `index.md` is rebuilt.
- Topic/group pages are created.
- Lint finds orphans and broken links.
- Repair writes missing stubs/backlinks.
- Chat retrieval reads compiled wiki chunks.

CampaignOS currently has:

- A folder template with `index.md`, `_context.md`, `README.md`, `log.md`.
- A frontmatter contract.
- A graph mapping module.

CampaignOS is missing:

- A production compile pipeline.
- A wiki page sync job.
- A lint/repair loop.
- BM25/index-first retrieval over campaign pages.
- UI provenance tying nodes back to page paths.

## Immediate Fix Plan

1. **Inject folder hubs in production graph rendering.** Before `toReactFlowGraph()`, ensure every present folder has a hub node and every non-hub node has a `belongs_to` edge to its folder hub. Use existing `folderForNode()` fallback if `metadata_json.folder` is missing.
2. **Backfill `metadata_json.folder` and `metadata_json.knowledgeKind`.** Update all graph writer functions in `src/lib/db/graph.ts` to include folder metadata. Existing rows need a migration/backfill.
3. **Add `metadata_json.path` for wiki-shaped objects.** Even before full markdown sync, use paths like `messaging/affordable-housing.md`, `people/renters.md`, `research/housing-poll.md`, `assets/<asset-slug>.md`.
4. **Use `build-demo-knowledge-graph.ts` or remove the duplicate demo path.** One demo source should exist so preview cannot drift.
5. **Add a campaign-knowledge sync job.** Read folder pages, parse frontmatter and body wikilinks, upsert document nodes and edges.
6. **Add graph diagnostics.** A simple command/report should list: nodes missing folder, nodes missing path, folders missing hubs, documents missing `belongs_to`, orphan document nodes, and broken `related[]`/wikilinks.
7. **Show provenance in the node panel.** The selected-node panel should display folder, path, source object, knowledge kind, source, and why the edge exists.

## What The Graph Should Look Like

The intended shape:

```text
Maria Alvarez (campaign/profile.md)
├── Messaging hub (messaging/)
│   ├── Affordable housing (messaging/affordable-housing.md)
│   ├── Transit (messaging/transit.md)
│   └── A District 3 that works for everyone (messaging/core-message.md)
├── People hub (people/)
│   ├── Renters (people/renters.md)
│   └── Young families (people/young-families.md)
├── Research hub (research/)
│   ├── Housing poll (research/housing-poll.md)
│   └── Opponent record (research/opponent-record.md)
├── Skills hub (skills/)
│   ├── Asset Studio (skills/asset-studio/SKILL.md)
│   └── Compliance Review (skills/compliance-review/SKILL.md)
└── Fundraising hub (fundraising/)
    ├── Q2 call-time list (fundraising/q2-call-time.md)
    └── A. Chen (fundraising/a-chen.md)
```

Cross-folder edges should still exist, but they should not erase folder membership:

- `messaging/affordable-housing.md` targets `people/renters.md`.
- `assets/housing-one-pager.md` derived_from `messaging/affordable-housing.md`.
- `research/housing-poll.md` references `messaging/affordable-housing.md`.
- `skills/asset-studio/SKILL.md` operates_on `assets/` and `messaging/`.

That gives the user both meanings at once: "where it lives" and "what it relates to."

## Bottom Line

The graph feels nonsensical because it visualizes **entities without their wiki containers**. Gbrain and wiki-llm both make the containers primary: folders, pages, slugs, indexes, source pages, typed links, backlinks, and maintenance loops. CampaignOS has the UI and some mapping primitives, but production needs to compile the campaign wiki into the graph before the canvas can make sense.
