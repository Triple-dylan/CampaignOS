# Wiki-LLM folder structure

CampaignOS stores durable campaign knowledge in a **wiki-llm** markdown tree: one root per organization campaign, maintained by humans and agents, synced selectively to the Supabase knowledge graph (`graph_nodes` / `graph_edges`).

## Pattern reference

The design follows Karpathy's [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) pattern:

| Concept | CampaignOS implementation |
|---------|---------------------------|
| Raw sources | Optional `raw/` sibling (immutable uploads) |
| Wiki layer | `campaign-knowledge/{orgId}/{campaignId}/` |
| Schema | `AGENTS.md` in template + this document |
| Index | `index.md` — catalog, read first on query |
| Log | `log.md` — append-only operation history |
| Folder context | `_context.md` — when to descend into a folder |
| Folder readme | `README.md` — purpose and examples |

Agents read `index.md` and folder `_context.md` files before deep traversal, matching llm-wiki v0.5 navigation conventions.

## Repository layout

```
src/lib/campaign-knowledge/
├── index.ts              # Public exports
├── types.ts              # CampaignFolder, KnowledgeNode, frontmatter types
├── folders.ts            # Standard folder registry + DB alignment
├── paths.ts              # Path resolver and meta-file detection
├── graph-mapping.ts      # File/folder → graph node rules
└── templates/            # Empty tree copied on campaign bootstrap
    ├── AGENTS.md
    ├── TEMPLATE.md
    ├── README.md
    ├── index.md
    ├── log.md
    ├── campaign/
    ├── skills/
    ├── assets/
    └── … (20 standard folders)
```

Runtime knowledge (per campaign) is **not** committed to git by default:

```
campaign-knowledge/{organizationId}/{campaignId}/
```

## Locked decisions

1. **One campaign per org** — single knowledge root per `campaigns` row.
2. **Neutral naming** — professional folder slugs aligned with app modules.
3. **No route changes** — this layer is storage/schema only; existing `/brain`, `/assets`, etc. routes unchanged.

## Standard folders

| Folder | Purpose | Primary DB entities | Graph node types |
|--------|---------|---------------------|------------------|
| `campaign/` | Core identity — candidate, office, jurisdiction, election | `campaign`, `campaign_profile` | `candidate`, `strategic_priority` |
| `skills/` | Reusable agent skills and playbooks | `workflow_schedule` | `task` |
| `assets/` | Creative assets, templates, exports | `asset` | `asset` |
| `initiatives/` | Programs — GOTV, persuasion, volunteer recruitment | `task` | `strategic_priority`, `task` |
| `events/` | Rallies, town halls, filing deadlines | `calendar_event` | `event` |
| `fundraising/` | Plans, prospects, call time | `fundraising_plan`, `fundraising_prospect` | `donor`, `prospect` |
| `accounting/` | Budgets, expenses, finance compliance | — | `compliance` |
| `social-media/` | Posts, calendars, channel strategy | `asset` | `asset`, `message_theme` |
| `people/` | Voters, endorsers, stakeholders | `fundraising_prospect` | `donor`, `prospect`, `organization`, `voter_segment` |
| `team/` | Staff, volunteers, roles, org chart | `organization_member` | `organization`, `task` |
| `research/` | Opposition research, district intel | `research_brief` | `research`, `opponent`, `issue` |
| `compliance/` | PDC/FEC notes, review records | `compliance_record` | `compliance` |
| `messaging/` | Framework, talking points, issue map | `campaign_profile` | `message_theme`, `issue` |
| `field/` | Canvass, turf, voter contact | `task` | `voter_segment`, `task`, `strategic_priority` |
| `communications/` | Press, earned media, rapid response | `asset` | `message_theme`, `asset` |
| `vendors/` | Consultants, contracts, spend | `compliance_record` | `organization`, `compliance` |
| `media/` | Paid media, ad buys, placements | `asset` | `asset`, `strategic_priority` |
| `polling/` | Polls, crosstabs, viability | `research_brief` | `research`, `voter_segment` |
| `endorsements/` | Targets and secured endorsements | — | `organization`, `prospect` |
| `ballot-access/` | Filing, signatures, PDC (WA) | `calendar_event` | `compliance`, `event` |

Washington-specific coverage: `compliance/`, `accounting/`, and `ballot-access/` are the primary homes for PDC filing, C-4 reports, and state ballot-access deadlines.

## Frontmatter conventions

Document pages use YAML frontmatter for graph extraction:

```yaml
---
title: "Page title"
node_type: research
summary: "One-line description"
folder: research
status: draft
source_object_type: research_brief
source_object_id: "550e8400-e29b-41d4-a716-446655440000"
related:
  - path: messaging/housing-talking-points.md
    relationship: supports
---
```

| Field | Required | Purpose |
|-------|----------|---------|
| `title` | Yes | Display name and graph node title |
| `node_type` | Yes (documents) | Maps to `graph_nodes.node_type` |
| `summary` | Recommended | Index line and graph tooltip |
| `folder` | Optional | Overrides path-inferred folder |
| `source_object_*` | When synced | Links to Supabase row |
| `related` | Optional | Wikilink edges → `graph_edges` |
| `status` | Optional | Lifecycle: draft → verified → stale |

Meta files (`README.md`, `_context.md`, `index.md`, `log.md`) may have frontmatter but are **not** synced to the graph.

## Graph node mapping

```mermaid
flowchart TB
  subgraph knowledge [Knowledge layer]
    F[Standard folder]
    D[Document .md]
    M[Meta files]
  end
  subgraph graph [Supabase graph]
    C[Cluster hub metadata]
    N[graph_nodes row]
    E[graph_edges]
  end
  F -->|1 cluster per folder| C
  D -->|1:1 when node_type set| N
  D -->|belongs_to| C
  D -->|related[]| E
  M -.->|excluded| graph
```

### Rules

1. **Folder → cluster** — Each entry in `CAMPAIGN_FOLDERS` (`folders.ts`) with `isCluster: true` produces one `KnowledgeNode` with `kind: "cluster"`. On sync, documents connect via `belongs_to` edges. Cluster hubs may be virtual (metadata-only) until a dedicated cluster node type is added to the brain UI.

2. **File → document node** — One markdown file with valid `node_type` frontmatter → one `KnowledgeNode` with `kind: "document"` → one `graph_nodes` insert/update when `source_object_id` is present or inferred.

3. **Subfolders** — Allowed for organization (e.g. `fundraising/prospects/`). Cluster is still the top-level standard folder; nested paths do not create nested clusters.

4. **Meta files** — `kind: "meta"`; used for LLM navigation only.

5. **Index and log** — Never graph nodes; index is the retrieval catalog per llm-wiki.

### TypeScript API

```typescript
import {
  buildCampaignKnowledgeRoot,
  resolveKnowledgePath,
  folderClusterNode,
  documentNodeFromFrontmatter,
} from "@/lib/campaign-knowledge";

const root = buildCampaignKnowledgeRoot({
  organizationId: orgId,
  campaignId: campaignId,
});

const path = resolveKnowledgePath(root, "research", "district-overview.md");
const cluster = folderClusterNode("research");
```

## Bootstrap flow (future)

1. On campaign creation, copy `src/lib/campaign-knowledge/templates/` to `campaign-knowledge/{orgId}/{campaignId}/`.
2. Seed `campaign/profile.md` from `campaigns` + `campaign_profiles` rows.
3. Optionally mirror existing DB records into folder pages with `source_object_*` frontmatter.
4. Run graph sync job to upsert `graph_nodes` from document frontmatter.

## Related code

- `src/lib/campaign-knowledge/` — types, folder registry, path resolver
- `src/lib/db/schema.ts` — `DbGraphNode`, entity types
- `src/lib/validators/enums.ts` — `GraphNodeType`, `GraphRelationshipType`
- `src/lib/db/graph.ts` — graph persistence

## Changelog

- **2026-06-28** — Initial wiki-llm scaffold and architecture doc.
