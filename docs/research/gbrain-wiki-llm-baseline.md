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
