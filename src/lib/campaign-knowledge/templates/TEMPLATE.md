# Populating campaign knowledge

Use this guide when adding or updating pages in a campaign knowledge base.

## File naming

| Pattern | Example | Use for |
|---------|---------|---------|
| kebab-case slug | `q2-call-time-plan.md` | Topics, plans, briefs |
| Entity name | `King-County-Labor-Council.md` | People, orgs, vendors (TitleCase optional) |
| Date prefix | `2026-06-primary-debate.md` | Events, filings, deadlines |

Avoid spaces in filenames. Prefer `.md` only.

## Required frontmatter (document pages)

Every page that should appear in the knowledge graph needs YAML frontmatter:

```yaml
---
title: "Human-readable title"
node_type: research          # GraphNodeType — see folders.ts mapping
summary: "One line for index.md and graph tooltip"
folder: research             # Standard folder id (optional if path implies it)
status: draft                # draft | reviewed | verified | stale | archived
tags: [housing, district-7]
source_object_type: research_brief   # Optional — links to DB row
source_object_id: "uuid-here"        # Optional — links to DB row
related:
  - path: messaging/housing-talking-points.md
    relationship: supports
created: 2026-06-28
updated: 2026-06-28
---
```

### `node_type` values (CampaignOS graph)

`candidate`, `issue`, `voter_segment`, `donor`, `prospect`, `organization`, `event`, `asset`, `research`, `task`, `opponent`, `compliance`, `message_theme`, `strategic_priority`

Pick the type that matches the primary entity. Folder defaults are listed in each folder's `README.md`.

## Page body conventions

1. Start with an **Summary** paragraph (2–4 sentences).
2. Use `##` headings for scannable sections.
3. Link related pages: `[[messaging/housing-talking-points]]` or markdown links.
4. Cite sources inline: `(source: research/opponent-votes-2024.md)`.
5. Flag uncertainty: `> **Open question:** ...` for gaps agents should research.

## Workflows

### Add a new document

1. Choose the correct standard folder.
2. Create `folder/slug.md` with frontmatter + body.
3. Add a line to `index.md` under the folder section (update count).
4. Append to `log.md`.
5. If linked to a DB record, set `source_object_type` and `source_object_id`.

### Ingest external source

1. Store immutable original under `raw/` (optional sibling layer) if used.
2. Create a summary page in the appropriate folder.
3. Update entity pages and cross-links.
4. Update `index.md` and `log.md`.

### Sync to CampaignOS brain graph

Document pages with `node_type` map 1:1 to `graph_nodes`. Folder hubs map to cluster metadata; documents link with `belongs_to` edges to their folder cluster. Meta files are never synced.

## Do not graph

These files are for navigation and schema only:

- `README.md`, `_context.md`, `_index.md`
- `index.md`, `log.md`
- `TEMPLATE.md`, `AGENTS.md`

## Example: fundraising prospect

```markdown
---
title: "Jane Chen — major donor prospect"
node_type: prospect
summary: "Tech executive, prior cycle donor, aligned on climate."
folder: fundraising
status: draft
tags: [major-donor, climate]
source_object_type: fundraising_prospect
related:
  - path: people/jane-chen.md
    relationship: connected_to
---

# Jane Chen

## Summary

Prospect for Q3 call time; estimated capacity $2,500. Introduced via housing coalition.

## Outreach history

- 2026-06-15 — Email intro sent (no response yet)

## Next steps

- [ ] Schedule call after endorsement event
```
