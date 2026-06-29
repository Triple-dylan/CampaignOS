# Gbrain & wiki-llm Baseline Research

Research date: 2026-06-28. Purpose: inform a **thin harness, fat skills** agent layer for CampaignOS.

## Sources

| Project | URL | License | Notes |
|---------|-----|---------|-------|
| **Gbrain** | https://github.com/garrytan/gbrain | MIT | Garry Tan's production agent brain (~24k stars). Postgres-backed knowledge graph + markdown skillpack. |
| **wiki-llm** | https://github.com/LeoBR84p/wiki_llm | MIT | Leandro Bernardo's programmatic Karpathy LLM Wiki pipeline (Python). |
| **Karpathy LLM Wiki** (pattern) | https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f | — | Idea file: compile sources into interlinked markdown wiki. |
| **nvk/llm-wiki** (related) | https://github.com/nvk/llm-wiki | — | Portable `AGENTS.md` protocol + Claude/Codex plugins. |
| **Gbrain ethos** | https://github.com/garrytan/gbrain/blob/master/docs/ethos/THIN_HARNESS_FAT_SKILLS.md | — | Core architectural essay. |

---

## 1. What Gbrain Provides

### 1.1 Thin harness, fat skills

Gbrain's central thesis (YC Spring 2026 talk): **intelligence lives in markdown skill files; the runtime stays thin.**

| Layer | Role | Gbrain implementation |
|-------|------|----------------------|
| **Fat skills** | Judgment, process, domain workflows | `skills/*/SKILL.md` — phased procedures with YAML frontmatter |
| **Thin harness** | Loop, file I/O, context routing, safety | TypeScript CLI (`gbrain`), MCP server, ~200-line orientation in `CLAUDE.md` |
| **Deterministic foundation** | Same input → same output | Postgres graph, `gbrain search`, `gbrain pages`, cron jobs |

**Skill vs code decision guide** (from Gbrain ethos):

- Needs judgment / adapts to environment → **Skill**
- Lookup, list, status, aggregation → **Code** (CLI)
- Same input always same output → **Code**

### 1.2 Resolver pattern

**Skills say HOW. Resolvers say WHAT to load WHEN.**

Gbrain ships `skills/RESOLVER.md` as a markdown routing table:

```
| Trigger | Skill |
|---------|-------|
| Every inbound message | skills/signal-detector/SKILL.md |
| "What do we know about X" | skills/query/SKILL.md |
```

Key properties:

1. **Always-on rows** — e.g. signal-detector fires on every message in parallel.
2. **Functional-area dispatchers** — for large resolver files (≥12KB), compress N skill rows into one area entry with `(dispatcher for: sub-skill-a, sub-skill-b)`.
3. **Disambiguation rules** — prefer most specific skill; chain skills explicitly in Phases sections.
4. **Cross-cutting conventions** — `skills/conventions/*.md` loaded by reference, not inlined.
5. **Dual entry points** — `RESOLVER.md` or `AGENTS.md` (v0.19+); `CLAUDE.md` is thin orientation (~200 lines) pointing to docs on demand.

`gbrain check-resolvable` validates the skill tree for reachability, MECE, and DRY.

### 1.3 Skills folder format

Each skill is a directory with `SKILL.md`:

```yaml
---
name: signal-detector
version: 1.0.0
description: |
  Always-on ambient signal capture...
triggers:
  - every inbound message (always-on)
tools:
  - search
  - put_page
mutating: true
writes_pages: true
---

# Signal Detector — Ambient Brain Capture
## Contract
## Phases
### Phase 1: ...
## Anti-Patterns
```

Patterns to note:

- **Frontmatter** = machine-readable metadata + natural-language description (doubles as LLM routing signal in Claude Code).
- **Phases** = ordered workflow the agent follows.
- **Contract** = guarantees the skill makes.
- **Anti-patterns** = explicit failure modes.
- **Conventions by reference** — quality, brain-first lookup, citation rules live in shared files.

Skillpack CLI:

- `gbrain skillpack scaffold --all` — copy curated skills into agent workspace (non-destructive).
- `gbrain skillpack reference <skill>` — diff against upstream bundle.

### 1.4 Scripts & deterministic tooling

Gbrain's CLI (`gbrain`) handles deterministic operations:

| Category | Examples |
|----------|----------|
| Search | `gbrain search`, `gbrain query`, hybrid graph+text retrieval |
| Pages | `gbrain pages get/put`, `gbrain link`, `gbrain timeline-add` |
| Health | `gbrain integrations doctor`, `gbrain features --json` |
| Jobs | `gbrain jobs submit shell`, `gbrain agent run` (minion-orchestrator skill) |
| Eval | `gbrain eval run-all`, routing harness for resolver compression |

Philosophy: **CLI first, MCP later**. JSON in, text out. Read-only by default.

### 1.5 Agent harness loop

1. **Orientation** — agent reads thin `CLAUDE.md` / `RESOLVER.md`.
2. **Intent match** — user message → resolver row → skill file(s).
3. **Context load** — skill Phases tell agent which docs/tools to pull (brain-first before external APIs).
4. **Parallel sub-agents** — signal-detector, enrichment spawn without blocking main response.
5. **Deterministic writes** — `put_page`, graph links via CLI; judgment in latent steps only.
6. **Cron / autopilot** — `gbrain autopilot --install` for maintenance; 66+ autonomous jobs in production brain.
7. **Self-improvement** — skill-creator, functional-area-resolver with A/B eval harness (`evals/functional-area-resolver/harness-runner.ts`).

### 1.6 Knowledge graph (Gbrain-specific)

- Regex cascade on wikilinks: `FOUNDED → INVESTED → ADVISES → WORKS_AT` (zero LLM calls for graph extraction).
- Postgres-backed: pages, people, companies, timeline, typed links.
- BrainBench benchmark: P@5 49.1% with graph vs ~18% without.

---

## 2. What wiki-llm Provides

### 2.1 Core idea (Karpathy pattern)

Move work from **query time to compile time**:

- **Raw sources** (`content_new/`, `raw/`) — immutable inputs.
- **Compiled wiki** (`wiki/`) — LLM-generated, interlinked markdown pages with citations.
- **Index-first retrieval** — read `index.md` → drill into relevant pages (no embedding infra at moderate scale).

### 2.2 wiki-llm folder structure

```
wiki_llm/
├── AGENTS.md              # Agent-driven workflow (8 stages)
├── CLAUDE.md              # Thin shim → AGENTS.md
├── config/                # WikiConfig Python modules
├── src/                   # Pipeline implementation
├── content_new/           # Drop zone for sources
├── wiki/                  # Generated output
│   ├── {EntityType}/      # e.g. Manuals/
│   ├── Topics/
│   ├── Groups/
│   └── index.md
└── logs/                  # JSONL run logs
```

### 2.3 Pipeline stages (compile-time)

| Stage | Purpose |
|-------|---------|
| `generate` | Read sources → Writer → Evaluator → Editor loop per page |
| `topics` | Collect terms, LLM-normalize taxonomy |
| `groups` | Organizational grouping pages |
| `index` | Rebuild `index.md` |
| `consolidate` | `markdown_merge` + LLM dedupe |
| `lint` | Structural validation (headings, anchors, fences) |
| `repair` | LangGraph agent fixes lint failures |
| `run-all` | Full pipeline |
| `chat` | BM25 + LLM RAG over compiled wiki (no vector DB) |

### 2.4 How it feeds LLM context

1. **Deterministic IDs** — UUID from SHA-256 of stripped body (content-addressable, rename-safe).
2. **Section-aware chunking** — `markdown-hero` `extract_chunks(purpose="rag")` keeps chunks inside heading hierarchy.
3. **Frontmatter metadata** — title, source_count, confidence for index-weighted retrieval.
4. **Index navigation** — agent reads catalog before loading full pages.
5. **Citation traceability** — every claim links to `raw/` source page.
6. **Agent mode** — paste `AGENTS.md` into Cursor/Claude; agent runs pipeline without installing Python.

### 2.5 markdown-hero role

Structural floor preventing "LLM markdown garbage":

- `lint()` before repair
- `markdown_merge(dedupe_headings=True)` before semantic dedupe
- `extract_frontmatter()` / `strip()` for stable hashing

---

## 3. Side-by-Side Comparison

| Dimension | Gbrain | wiki-llm | CampaignOS today |
|-----------|--------|----------|------------------|
| **Primary artifact** | Postgres brain + markdown pages | Compiled markdown wiki | Supabase rows + React Flow graph |
| **Routing** | `RESOLVER.md` trigger → skill | `AGENTS.md` stage commands | `AgentMode` enum in chat (`campaign-manager`, etc.) |
| **Skills format** | `skills/*/SKILL.md` + YAML frontmatter | `AGENTS.md` single protocol file | Inline system prompts in `src/lib/ai/prompts/*` |
| **Retrieval** | Hybrid search + typed graph | Index-first + BM25 chat | Graph node count in chat prompt; no retrieval layer |
| **Deterministic layer** | `gbrain` CLI (TypeScript) | Python pipeline + markdown-hero | Server actions + Zod validators |
| **Graph extraction** | Regex wikilink cascade (no LLM) | Cross-links in wiki compile step | `syncCampaignBrainToGraph()` from AI JSON output |
| **Background jobs** | Cron + minion-orchestrator | `run-all` pipeline / K8s CronJob | Workflows/automations (stub schedules) |
| **Context bloat control** | Thin CLAUDE.md + on-demand docs | Index-first, section chunks | Fixed campaign context in every prompt |
| **Eval harness** | Resolver A/B harness, BrainBench | Writer/Evaluator/Editor self-review | `ai_generation_logs` table only |
| **Self-improvement** | skill-creator, skillify, dream cycle | consolidate + repair agent | None yet |

---

## 4. Gbrain Files/Patterns to Port (Inspiration Only)

Do **not** copy verbatim. These are reference patterns:

| Gbrain path | Pattern | CampaignOS mapping |
|-------------|---------|-------------------|
| `skills/RESOLVER.md` | Trigger → skill routing table | `src/lib/harness/skills/RESOLVER.md` |
| `skills/*/SKILL.md` | Phased markdown procedures | `src/lib/harness/skills/*/` |
| `skills/conventions/quality.md` | Shared cross-cutting rules | Campaign compliance + citation conventions |
| `skills/functional-area-resolver/SKILL.md` | Two-layer dispatcher compression | Scale when resolver exceeds ~12KB |
| `evals/functional-area-resolver/harness-runner.ts` | LLM routing regression tests | Future: test agent mode → skill resolution |
| `docs/ethos/THIN_HARNESS_FAT_SKILLS.md` | Architecture principles | `src/lib/harness/README.md` |
| `INSTALL_FOR_AGENTS.md` | Agent onboarding checklist | Future: CampaignOS agent setup doc |
| `gbrain check-resolvable` | Skill tree validation | Future: `pnpm harness:check-resolvable` |
| `skills/minion-orchestrator/SKILL.md` | Background shell + LLM jobs | Integrate with `src/lib/workflows/*` |
| `skills/signal-detector/SKILL.md` | Always-on parallel capture | Campaign signal capture (new assets, tasks, events) |

---

## 5. What CampaignOS Should Adopt vs Skip

### Adopt

1. **Thin harness + resolver** — Keep `src/actions/chat.ts` thin; route intents via `RESOLVER.md` + campaign skills instead of growing monolithic system prompts.
2. **Skill files per domain** — Extract `content-strategist`, `fundraiser`, `compliance-reviewer` personas into `skills/*/SKILL.md` with Phases (draft → compliance check → graph sync).
3. **Brain-first lookup** — Before generating copy, query campaign graph + profile (Gbrain's `brain-ops` pattern).
4. **Index-first context** — Campaign profile + graph summaries as compiled "wiki pages" the resolver loads on demand.
5. **Deterministic vs latent split** — Cron schedules, asset lists, compliance flags = code; messaging strategy, opposition framing = skills.
6. **Skillpack validation** — Reachability check on resolver table as automations grow.
7. **Compile-time knowledge** — When ingesting research PDFs/briefs, compile into structured campaign wiki pages (wiki-llm pattern) rather than re-prompting raw sources.

### Adapt (campaign-specific)

1. **Graph in Supabase** — Keep React Flow UI; add wikilink-style relationship types for voters, donors, issues, events.
2. **Compliance as always-on convention** — Like Gbrain's `ACCESS_POLICY.md`; every outbound skill references disclaimer rules.
3. **Agent modes → functional areas** — Map existing `AgentMode` to resolver dispatcher rows.
4. **Automations as cron skills** — `/schedule` in chat-dock → workflow creation; skill defines what the scheduled agent should load.

### Skip (for now)

1. **Full Gbrain Postgres brain** — CampaignOS already has Supabase schema; don't duplicate page store.
2. **Regex-only graph extraction** — Political entities need richer types; keep LLM-assisted `generateCampaignBrainOutput` but add deterministic post-hooks.
3. **43-skill scaffold wholesale** — Cherry-pick patterns; don't port meeting-ingestion, soul-audit, etc.
4. **Python wiki-llm pipeline** — Stay TypeScript; borrow index/lint/consolidate *concepts* not the Python runtime.
5. **BM25 chat server** — Defer until compiled campaign wiki volume justifies it; graph + profile may suffice for MVP.
6. **MCP-first tooling** — CLI/server actions first per Gbrain ethos.

---

## 6. CampaignOS Cross-References

| Existing module | Role today | Harness integration |
|-----------------|------------|---------------------|
| `src/lib/ai/*` | One-shot generators (brain, assets, research, fundraising) | Generators become **deterministic script backends** invoked by skills |
| `src/lib/ai/log-generation.ts` | `ai_generation_logs` audit trail | Harness loop logs skill invocations alongside completions |
| `src/lib/db/graph.ts` | Node/edge CRUD, brain sync | Resolver loads graph summaries as context chunks |
| `src/lib/graph/*` | React Flow rendering | UI surface for harness-discovered relationships |
| `src/actions/chat.ts` | AgentMode personas, canned replies | Replace inline personas with resolver → skill load |
| `src/lib/workflows/*` | Schedule cron, workflow validators | Minion-orchestrator pattern for scheduled campaign tasks |
| `src/components/automations/*` | Create automation dialog, `/schedule` | User-facing cron skill triggers |
| `src/components/workspace/chat-dock.tsx` | Chat UI + schedule shortcut | Entry point for harness loop |

---

## 7. Top 5 Patterns to Adopt

1. **Resolver routing table** (`RESOLVER.md`) — Decouple "what context to load" from agent code; scale via functional-area dispatchers.
2. **SKILL.md with Phases + Contract** — Move campaign expertise out of TypeScript strings into versioned markdown procedures.
3. **Thin orientation, fat on-demand docs** — ~200-line entry point; load module docs only when resolver says so.
4. **Compile-time campaign wiki** (wiki-llm) — Research briefs, district intel, and opposition notes as interlinked pages with index-first retrieval.
5. **Deterministic/latent split** — Server actions + Zod for lookups; skills for judgment; never seat 800 donors in latent space.

---

## 8. Scaffold Created

See `src/lib/harness/README.md` for the CampaignOS harness stub inspired by the above research.

---

## 9. Deep Research Addendum — What To Actually Clone

This addendum is based on local inspection of `garrytan/gbrain`, `LeoBR84p/wiki_llm`, `nvk/llm-wiki`, and the current CampaignOS graph/harness code. The key correction: **Gbrain's "graph" is not primarily a UI graph.** It is a markdown/page brain whose graph emerges from page slugs, wikilinks, frontmatter, deterministic link extraction, backlinks, typed traversal, and search boosts. CampaignOS currently has a visual graph and some folder-cluster code, but the live DB graph is still mostly seeded/generated entities rather than compiled wiki pages.

### 9.1 Gbrain File Tree Patterns Worth Cloning

Exact upstream paths worth using as implementation references:

```text
gbrain/
├── AGENTS.md
├── CLAUDE.md
├── INSTALL_FOR_AGENTS.md
├── docs/ethos/
│   ├── THIN_HARNESS_FAT_SKILLS.md
│   └── MARKDOWN_SKILLS_AS_RECIPES.md
├── skills/
│   ├── RESOLVER.md
│   ├── manifest.json
│   ├── _AGENT_README.md
│   ├── _brain-filing-rules.md
│   ├── _brain-filing-rules.json
│   ├── _output-rules.md
│   ├── conventions/
│   │   ├── brain-first.md
│   │   ├── brain-routing.md
│   │   ├── quality.md
│   │   ├── search-modes.md
│   │   └── schema-evolution.md
│   ├── brain-ops/SKILL.md
│   ├── query/SKILL.md
│   ├── signal-detector/SKILL.md
│   ├── maintain/SKILL.md
│   ├── frontmatter-guard/SKILL.md
│   ├── functional-area-resolver/SKILL.md
│   ├── skill-creator/SKILL.md
│   ├── skillify/SKILL.md
│   ├── minion-orchestrator/SKILL.md
│   └── skillpack-check/SKILL.md
├── src/
│   ├── core/link-extraction.ts
│   ├── core/skill-frontmatter.ts
│   ├── core/skill-trigger-index.ts
│   ├── core/resolvers/registry.ts
│   ├── core/search/hybrid.ts
│   ├── core/search/graph-signals.ts
│   ├── core/search/relational-recall.ts
│   ├── core/search/token-budget.ts
│   ├── commands/graph-query.ts
│   ├── commands/backlinks.ts
│   ├── commands/reconcile-links.ts
│   ├── commands/resolvers.ts
│   ├── commands/search.ts
│   └── commands/skillpack-check.ts
├── scripts/
│   ├── check-skill-brain-first.sh
│   ├── check-key-files-current-state.sh
│   ├── skillify-check.ts
│   └── live-brain-first-check.ts
└── evals/functional-area-resolver/
    ├── harness-runner.ts
    ├── harness.mjs
    ├── fixtures.jsonl
    ├── fixtures-held-out.jsonl
    └── variants/
        ├── baseline.md
        ├── functional-areas.md
        └── resolver-of-resolvers.md
```

The important pattern is the *shape*, not a wholesale copy. Gbrain has one human-readable routing map, many self-describing skills, conventions by reference, deterministic CLI commands for checks/search/graph traversal, and evals to prevent resolver drift.

### 9.2 How Gbrain Builds Graph From Markdown And Wikilinks

Gbrain graph construction is deterministic and page-centric:

1. **Pages are canonical objects.** Markdown pages have slugs such as `people/alice`, `companies/acme`, `meetings/demo-day-w26`, `concepts/foo`. The graph is a projection of these pages, not an independent canvas-first model.
2. **Entity references are extracted from markdown.** `src/core/link-extraction.ts` recognizes markdown links like `[Alice](people/alice.md)`, engine-style links like `[Alice](people/alice)`, Obsidian links like `[[people/alice]]`, qualified multi-source links like `[[wiki:concepts/ai]]`, and generic basename links like `[[alice]]` that pass through a slug resolver.
3. **Frontmatter creates typed edges.** `FRONTMATTER_LINK_MAP` maps fields to edge types and directions: `company`/`companies` on person pages -> `works_at`, `founded` on person pages -> `founded`, `key_people` on company pages -> incoming `works_at`, `investors` on company/deal pages -> incoming `invested_in`, `attendees` on meeting pages -> incoming `attended`, `source` -> `source`, `related`/`see_also` -> `related_to`.
4. **Relationship inference is a regex cascade, not an LLM call.** `inferLinkType()` applies precedence `founded > invested_in > advises > works_at > page-role prior > mentions`. Context windows around mentions are matched with calibrated regexes such as `FOUNDED_RE`, `INVESTED_RE`, `ADVISES_RE`, and `WORKS_AT_RE`.
5. **`put_page` runs auto-link reconciliation.** `skills/brain-ops/SKILL.md` documents that every page write extracts references, writes typed graph links, and removes stale links no longer present in the page text. The response reports `auto_links: { created, removed, errors }`.
6. **Backlinks are a health invariant.** `skills/_brain-filing-rules.md`, `skills/signal-detector/SKILL.md`, and `src/commands/backlinks.ts` all enforce the "Iron Law": mentions with existing pages must have reverse backlinks. "An unlinked mention is a broken brain."
7. **Graph queries are operational commands.** `src/commands/graph-query.ts` traverses typed edges with `--type`, `--depth`, and `--direction`, e.g. `works_at`, `invested_in`, `founded`, `advises`, `attended`, `mentions`, `source`.
8. **Search uses graph signals.** `src/core/search/hybrid.ts` fuses keyword/vector results with RRF, boosts compiled truth, applies backlink/salience/recency boosts, and keeps results token-budget aware. Graph quality affects retrieval, not just visualization.
9. **Maintenance backfills the graph.** `skills/maintain/SKILL.md` routes "extract links", "build link graph", and "backfill graph" to deterministic extraction (`gbrain extract links`) and the dream cycle (`lint -> backlinks -> sync -> synthesize -> extract -> patterns -> embed -> orphans`).

CampaignOS should copy this mental model: **source pages and folders first; graph as a compiled index/projection second; UI as a view third.**

### 9.3 wiki-llm Compile Pipeline Steps

`LeoBR84p/wiki_llm` is a compile-time wiki generator. The pipeline is explicit in `src/pipeline.py`, `src/cli.py`, and `src/stages/*`:

1. **Read** (`src/readers/filesystem.py`): walk `content_new/`, convert `.md`, `.txt`, `.docx`, `.pptx`, `.xlsx`, `.pdf` into `Document` objects. `object_type` comes from frontmatter, then immediate subdirectory, then first configured object type. IDs are deterministic UUIDs from the first 128 bits of SHA-256 of `markdown_hero.strip(body)`.
2. **Generate** (`src/stages/generate.py`): for each document, write a raw page in `wiki/<ObjectSubdir>/raw/<uuid>_raw.md`, then run Writer -> Evaluator -> Editor. Generated pages have frontmatter with `id`, `title`, `object_type`, `status`, `source_file`, `content_sha256`, `source_raw`, and `generated_at`.
3. **Key themes / topics** (`src/stages/key_theme.py`): scan generated pages for wikilinks in a configured section or values in a frontmatter field; normalize terms via LLM batches; create one page per canonical term under a configured theme directory.
4. **Groups** (`src/stages/groups.py`): group documents by metadata fields and create deterministic or LLM-authored group pages. This is deliberately more mechanical than topics.
5. **Index** (`src/stages/index.py`): rebuild `wiki/index.md` from object directories, key theme directories, and group directories. It writes `[[page-stem]]` entries, not arbitrary graph records.
6. **Consolidate** (`src/stages/consolidate.py`): structural merge with `markdown_hero.markdown_merge(dedupe_headings=True)` followed by LLM semantic dedupe.
7. **Lint** (`src/stages/lint.py`): static link analysis finds orphans and broken wikilinks; `markdown_hero.lint()` catches markdown structure issues; an LLM semantic lint produces `lint_report.md`.
8. **Repair** (`src/stages/repair.py`): LangGraph fan-out repairs broken links by creating stubs and repairs orphans by asking which existing pages should link to them.
9. **Chat** (`src/ui/chat_engine.py`): build an in-memory BM25 index from non-system wiki pages using `markdown_hero.extract_chunks(purpose="rag")`; retrieve top-K chunks; answer with LLM. No vector DB is required.

Karpathy's LLM Wiki pattern is less prescriptive but aligns with the same loop: raw sources are immutable, the wiki is persistent and compounding, `index.md` is read first, `log.md` records operations, queries can be filed back as new pages, and lint checks contradictions, stale claims, orphans, missing cross-references, and new pages that should exist.

`nvk/llm-wiki` adds a mature agent-instruction variant: root `AGENTS.md` / `CLAUDE.md`, command docs under `claude-plugin/commands/` (`ingest`, `compile`, `query`, `lint`, `refresh`, `librarian`, etc.), and a plugin-friendly workflow around a wiki maintained by agents. The CampaignOS takeaway is to make campaign knowledge operations explicit commands/skills, not hidden UI side effects.

### 9.4 Side-by-Side: Gbrain vs wiki-llm vs CampaignOS vs Missing

| Dimension | Gbrain | wiki-llm / LLM Wiki | CampaignOS has now | Missing or confusing in CampaignOS |
|---|---|---|---|---|
| Source of truth | DB-backed pages plus markdown sources | Compiled markdown wiki under `wiki/` | Supabase `graph_nodes`, `graph_edges`; folder template under `src/lib/campaign-knowledge/templates/` | Live graph is not yet compiled from campaign wiki pages. |
| Folder taxonomy | Filing rules: primary subject decides directory | `content_new/<type>` and `wiki/<ObjectSubdir>`; index groups pages | 20 standard folders in `CAMPAIGN_FOLDERS` | No live bootstrap/sync that materializes folder hubs for existing campaigns. |
| Page nodes | Slugs are canonical: `people/x`, `companies/y` | UUID page files plus `raw/` source pages | `KnowledgeNode` type and `documentNodeFromFrontmatter()` | DB nodes are still issue/segment/entity rows, not first-class wiki page nodes. |
| Wikilinks | Markdown links, qualified wikilinks, bare wikilinks with basename resolver | `[[Page]]` links drive topics, index, lint, repair | Template says use `[[folder/page-slug]]`; `related[]` frontmatter maps edges | No parser/sync for body wikilinks in production; only `related[]` typed field exists. |
| Folder hubs | Implicit in slugs and graph traversal; not UI-first | Directories and `index.md` sections are the navigation layer | `folderClusterNode()`, `allFolderClusterNodes()`, `DynamicCampaignGraph.mergeFromFolderPath()` | Production `getCampaignGraph()` does not inject hubs; seeded nodes lack `metadata_json.folder`. |
| Skill layer | `skills/RESOLVER.md`, `skills/*/SKILL.md`, conventions, frontmatter trigger index | `AGENTS.md` with 8-stage workflow | `src/lib/harness/skills/*`, `src/lib/harness/resolver.ts` | Resolver is static TS mirror, not generated/validated from markdown/frontmatter. |
| Retrieval | Hybrid keyword/vector, RRF, backlink boost, graph traversal, token budget | Index-first + BM25 over section-aware chunks | Chat context chunk says "graph summary"; graph node count in prompts | No index-first campaign wiki retrieval; no BM25 over campaign pages. |
| Maintenance | Doctor/remediate, backlinks, extract links, frontmatter guard, dream cycle | Lint + repair agent for broken links/orphans | Architecture docs and template lint workflow | No runnable campaign wiki lint/sync/repair job. |
| UI graph | Secondary view over page/link structure | Obsidian graph emerges from markdown links | React Flow graph with folder-sector layout | UI can show entity-type clusters without exposing wiki page/folder provenance. |
| Demo | N/A | N/A | `demo-workspace.ts` now has hubs and skills; `build-demo-knowledge-graph.ts` has richer compiled-demo builder | Production/demo may diverge; preview may be stale if a route imports old static graph or if persisted DB has old rows. |

### 9.5 Ten Concrete Clone Targets

| # | Upstream target | Port as-is or adapt? | CampaignOS action |
|---|---|---|---|
| 1 | `skills/RESOLVER.md` trigger table | **Adapt for campaigns** | Keep markdown as source of truth; generate or validate `src/lib/harness/resolver.ts` from it instead of hand-syncing. |
| 2 | `skills/*/SKILL.md` YAML frontmatter (`name`, `description`, `triggers`, `tools`, `mutating`, `writes_pages`, `writes_to`) | **Port mostly as-is** | Add strict frontmatter to CampaignOS skills and a parser modeled on `src/core/skill-frontmatter.ts`. |
| 3 | `src/core/skill-trigger-index.ts` union of frontmatter triggers + resolver rows | **Port as-is conceptually** | Build `loadCampaignSkillTriggerIndex()` to catch drift between `RESOLVER.md` and skill frontmatter. |
| 4 | `skills/conventions/brain-first.md` and `skills/brain-ops/SKILL.md` | **Adapt for campaigns** | Require "campaign-knowledge/index.md first, then folder `_context.md`, then DB graph" before generation. |
| 5 | `src/core/link-extraction.ts` wikilink parser | **Adapt for campaigns** | Implement deterministic `[[folder/page]]`, markdown-link, and `related[]` extraction for campaign pages. |
| 6 | `FRONTMATTER_LINK_MAP` typed edge map | **Adapt for campaigns** | Map `candidate`, `issues`, `segments`, `endorsers`, `donors`, `events`, `assets`, `source_raw`, `related` to campaign relationship types. |
| 7 | `inferLinkType()` regex cascade | **Adapt for campaigns** | Use campaign verbs: `supports`, `opposes`, `targets`, `aligns_with`, `derived_from`, `references`, `scheduled_for`, `belongs_to`. |
| 8 | `src/commands/graph-query.ts` | **Adapt for campaigns** | Add `pnpm graph:query <path-or-node> --type --direction --depth` for debugging graph meaning independent of UI. |
| 9 | `skills/maintain/SKILL.md` + `frontmatter-guard/SKILL.md` | **Adapt for campaigns** | Add `campaign-knowledge lint`, `sync`, `repair`, `doctor` scripts before polishing UI layout further. |
| 10 | `evals/functional-area-resolver/*` | **Port as-is structure** | Create fixtures for campaign intents -> expected skill/folder/page context; prevent "resolver feels right" regressions. |

### 9.6 Actionable Clone/Adapt Plan

1. **Make campaign wiki pages the graph input.** Build a sync job that reads `campaign-knowledge/{orgId}/{campaignId}/index.md`, folder `_context.md`, and document frontmatter/body wikilinks, then upserts folder hubs, document nodes, and typed edges. Do not rely on `graph_nodes` seeded from onboarding as the primary graph.
2. **Backfill folder metadata and hubs for current DB rows.** Until full wiki sync exists, every graph writer in `src/lib/db/graph.ts` should set `metadata.folder` and create/link to a folder hub. Onboarding issues belong under `messaging`; voter segments under `people` or `field`; research briefs under `research`; tasks under `initiatives`; assets under `assets`; events under `events`.
3. **Show wiki provenance in the UI.** Nodes should distinguish `folder_hub`, `wiki_document`, and `entity` in `metadata_json.knowledgeKind` or equivalent. The graph becomes legible when the user can see "this is a page in `messaging/`" rather than just "this is an issue node."
4. **Add deterministic link extraction before more AI graph generation.** The LLM can suggest pages and relationships, but body wikilinks/frontmatter should compile deterministically into edges like Gbrain/wiki-llm.
5. **Add index-first retrieval to chat.** Build a small BM25/index reader over campaign knowledge pages before adding vector infra. The first query-time context should come from `index.md` and relevant folder `_context.md`, not a generic graph count.
6. **Treat graph UI as a projection.** React Flow should render the compiled folder/page/link model. If the projection looks odd, debug the compiled pages/edges first, not the animation.
