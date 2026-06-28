# Campaign knowledge schema (wiki-llm)

This file defines how LLM agents maintain the CampaignOS campaign knowledge base. It follows the [Karpathy LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) pattern: persistent markdown, index-first retrieval, and compounding cross-references.

## Architecture

| Layer | Location | Owner | Purpose |
|-------|----------|-------|---------|
| Raw (optional) | `raw/` sibling | Human | Immutable source PDFs, transcripts, clips |
| Knowledge | `campaign-knowledge/{orgId}/{campaignId}/` | Agent + human | Structured campaign wiki |
| Schema | This file (`AGENTS.md`) | Co-evolved | Conventions and workflows |
| App graph | Supabase `graph_nodes` | CampaignOS sync | Interactive brain UI |

**Locked decision:** one campaign knowledge root per organization campaign.

## Before answering a query

1. Read `index.md` at the knowledge root.
2. For each candidate folder, read `_context.md` before descending (saves tokens).
3. Open only relevant document pages in full.
4. Cite paths in answers: `(knowledge: research/district-overview.md)`.

## Ingest workflow

When the user adds a source or fact:

1. Discuss key takeaways with the user if ambiguous.
2. Create or update document page(s) in the correct standard folder.
3. Update cross-links and related entity pages.
4. Update `index.md` section counts and entries.
5. Append to `log.md` with date, operation, and pages touched.

## Lint workflow (periodic)

- Orphan pages with no inbound links
- Contradictions between pages
- Missing `node_type` on substantive documents
- Stale `status` (no update in 90+ days on active topics)
- Index section counts out of sync

## Frontmatter contract

See `TEMPLATE.md`. Required for graph-eligible documents: `title`, `node_type`, `summary`.

## Index format

```markdown
## Fundraising (3)
- [Q2 call time plan](fundraising/q2-call-time-plan.md) — Weekly goals and scripts
```

Update `(N)` counts when adding or removing pages.

## Log format

```markdown
## [2026-06-28] ingest | District housing report

- **Actor:** agent
- **Summary:** Added research brief and linked messaging talking points
- **Pages touched:** research/district-housing.md, messaging/housing-talking-points.md
```

## Naming

- Folders: fixed standard slugs (`fundraising`, `social-media`, …)
- Files: kebab-case slugs; TitleCase allowed for entity names
- Wikilinks: `[[folder/page-slug]]` without `.md`

## DB alignment

When a page mirrors an app record, always set:

```yaml
source_object_type: asset | calendar_event | research_brief | fundraising_prospect | compliance_record | task | campaign | campaign_profile | fundraising_plan | workflow_schedule | organization_member
source_object_id: "<uuid>"
```

## Graph extraction

- **Folder → cluster:** each standard folder is a hub; documents `belongs_to` their folder cluster.
- **File → node:** one markdown file with `node_type` → one knowledge document → one `graph_nodes` row on sync.
- **Meta files:** never become graph nodes.

## Professional tone

Use neutral, professional campaign language. Avoid partisan slurs or informal abbreviations in filed knowledge.
