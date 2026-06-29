# CampaignOS Agent Harness

Thin runtime inspired by [Garry Tan's Gbrain](https://github.com/garrytan/gbrain) (**thin harness, fat skills**) and compile-time knowledge patterns from [wiki-llm](https://github.com/LeoBR84p/wiki_llm).

## Architecture

```
┌─────────────────────────────────────────┐
│  Fat skills (markdown)                  │
│  skills/*/SKILL.md, conventions/        │
├─────────────────────────────────────────┤
│  Thin harness (TypeScript)              │
│  RESOLVER.md → resolver → scripts → loop│
├─────────────────────────────────────────┤
│  Campaign knowledge (wiki-llm)          │
│  campaign-knowledge/templates/          │
└─────────────────────────────────────────┘
```

| File | Role |
|------|------|
| `parse-resolver-md.ts` | Parse `skills/RESOLVER.md` tables (trigger → skill → scripts) |
| `resolver.ts` | Runtime dispatch + workflow registry + graph folder plan |
| `resolver-client.ts` | Client-safe graph folder highlights (no fs) |
| `skill-folders.ts` | Skill/workflow → campaign-knowledge folder mapping |
| `skills/RESOLVER.md` | Human-editable routing table (source of truth) |
| `scripts/sync-folder-to-graph.ts` | Folder → KnowledgeNodes for graph |
| `scripts/list-research-context.ts` | Load `research/` wiki context |
| `scripts/generate-from-skill.ts` | Document skill execution flow (stub) |
| `scripts/run.ts` | Deterministic script dispatcher |
| `loop.ts` | `planHarnessTurn()` — wired into `src/actions/chat.ts` |

## Resolver → graph connection

1. User message hits `resolveCampaignContext()` (parses `RESOLVER.md`).
2. Primary skill + optional workflow (`registry.ts`) produce `graphFoldersToHighlight`.
3. `sendChatMessage` returns folders to `ChatProvider`.
4. `WorkspaceHome` maps folders → node ids via `nodeIdsForFolders()` (replaces keyword guess).

## Usage

```ts
import { planHarnessTurn, resolveGraphFoldersFromMessage } from "@/lib/harness";

const plan = await planHarnessTurn({
  campaignId: "...",
  userMessage: "Prepare event research for the town hall",
  agentMode: "researcher",
});

// plan.resolver.graphFoldersToHighlight → ["research", "events"]
```

## Skill vs script (Gbrain rule)

| Needs judgment | Use skill |
|----------------|-----------|
| Lookup / list / count | Use script in `scripts/` |
