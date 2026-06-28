# CampaignOS Agent Harness

Thin runtime inspired by [Garry Tan's Gbrain](https://github.com/garrytan/gbrain) (**thin harness, fat skills**) and compile-time knowledge patterns from [wiki-llm](https://github.com/LeoBR84p/wiki_llm).

Research baseline: [`docs/research/gbrain-wiki-llm-baseline.md`](../../docs/research/gbrain-wiki-llm-baseline.md).

## Architecture

```
┌─────────────────────────────────────────┐
│  Fat skills (markdown)                  │
│  skills/*/SKILL.md, conventions/        │
├─────────────────────────────────────────┤
│  Thin harness (TypeScript)              │
│  resolver → loader → scripts → loop     │
├─────────────────────────────────────────┤
│  CampaignOS app                         │
│  Supabase, graph, src/lib/ai/*, chat    │
└─────────────────────────────────────────┘
```

| File | Role |
|------|------|
| `resolver.ts` | Trigger + agent-mode → skill paths and context chunks |
| `skills/RESOLVER.md` | Human-editable routing table (source of truth) |
| `skills/loader.ts` | Parse `SKILL.md` frontmatter and body |
| `skills/*/SKILL.md` | Campaign procedures (Phases, Contract, Anti-patterns) |
| `scripts/run.ts` | Deterministic script dispatcher |
| `scripts/list-campaign-context.ts` | Stub: summarize resolved context |
| `loop.ts` | `planHarnessTurn()` — assemble system context for one chat turn |
| `types.ts` | Shared harness types |

## Usage (stub)

```ts
import { planHarnessTurn } from "@/lib/harness";

const plan = await planHarnessTurn({
  campaignId: "...",
  userMessage: "Draft a social post on housing",
  agentMode: "content-strategist",
  campaignPath: "assets",
});

// Merge plan.systemPreamble + plan.skillContext into chat system prompt.
// Run plan.scriptIds via runHarnessScripts for deterministic facts.
```

Not yet wired into `src/actions/chat.ts` — this directory is an intentional scaffold.

## Skill vs script (Gbrain rule)

| Needs judgment | Use skill |
|----------------|-----------|
| Lookup / list / count | Use script in `scripts/` |
| Same input → same output | Code |
| Adapts to conversation | Skill markdown |

## Cross-references

- **AI generators**: `src/lib/ai/generate-*.ts` — invoke from skill `tools` lists
- **Chat**: `src/actions/chat.ts` — replace inline personas with harness plan
- **Graph**: `src/lib/db/graph.ts` — hydrate `graph-summary` context chunks
- **Automations**: `src/lib/workflows/*`, `src/components/automations/*`

## Next steps

1. Wire `planHarnessTurn` into `sendChatMessage`.
2. Hydrate `campaign-profile` and `graph-summary` chunks from Supabase.
3. Add `pnpm harness:check-resolvable` validating RESOLVER.md ↔ `resolver.ts` parity.
4. Compile research into campaign wiki pages (wiki-llm index-first pattern).
