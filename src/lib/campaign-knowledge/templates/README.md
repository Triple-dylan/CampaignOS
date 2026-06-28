# Campaign knowledge template

This directory is the **empty template tree** copied when a campaign knowledge base is bootstrapped. One campaign per organization; runtime data lives at:

```
campaign-knowledge/{organizationId}/{campaignId}/
```

## Quick start

1. Read `AGENTS.md` — schema and workflows for LLM agents maintaining this wiki.
2. Read `index.md` — catalog of all knowledge pages (update on every ingest).
3. Pick a folder from the table below; add one markdown file per entity or topic.
4. Use YAML frontmatter on every document page (see `TEMPLATE.md`).
5. Append operations to `log.md` after ingests or major edits.

## Standard folders

| Folder | Purpose |
|--------|---------|
| `campaign/` | Core identity — candidate, office, jurisdiction, election |
| `skills/` | Reusable agent skills and playbooks |
| `assets/` | Creative assets, templates, exports |
| `initiatives/` | Programs — GOTV, persuasion, volunteer recruitment |
| `events/` | Rallies, town halls, deadlines |
| `fundraising/` | Plans, prospects, call time |
| `accounting/` | Budgets, expenses, finance compliance |
| `social-media/` | Posts, calendars, channel strategy |
| `people/` | Voters, endorsers, stakeholders |
| `team/` | Staff, volunteers, roles |
| `research/` | Opposition research, district intel |
| `compliance/` | PDC/FEC notes, review records |
| `messaging/` | Framework, talking points, issue map |
| `field/` | Canvass, turf, voter contact |
| `communications/` | Press, earned media, rapid response |
| `vendors/` | Consultants, contracts, spend |
| `media/` | Paid media, ad buys, placements |
| `polling/` | Polls, crosstabs, viability |
| `endorsements/` | Targets and secured endorsements |
| `ballot-access/` | Filing, signatures, PDC registration |

## Graph mapping (summary)

- **Folder** → cluster hub in the knowledge graph (`belongs_to` edges from documents).
- **Document file** (with `node_type` frontmatter) → one `graph_nodes` row when synced.
- **Meta files** (`README.md`, `_context.md`, `index.md`, `log.md`) → navigation only, not graph nodes.

See `docs/architecture/wiki-llm-folder-structure.md` for full architecture.
