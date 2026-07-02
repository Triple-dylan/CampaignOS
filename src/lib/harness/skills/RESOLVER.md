# CampaignOS Skill Resolver

Dispatcher for campaign agent skills. **Read the skill file before acting.**

Pattern source: [Gbrain RESOLVER.md](https://github.com/garrytan/gbrain/blob/master/skills/RESOLVER.md)

## Always-on (every message)

| Trigger | Skill | Scripts |
|---------|-------|---------|
| Every inbound message (parallel, non-blocking) | `skills/campaign-signals/SKILL.md` | `list-campaign-context` |
| Any outbound copy or compliance-sensitive output | `skills/conventions/compliance.md` | — |

## Campaign modules

| Trigger | Skill | Scripts |
|---------|-------|---------|
| "draft", "social post", "script", "stump speech", "asset", "copy", "message" | `skills/asset-studio/SKILL.md` | `list-campaign-context`, `generate-from-skill` |
| "research", "opposition", "district", "intel", "brief", "voter segment" | `skills/research-brief/SKILL.md` | `list-research-context`, `generate-from-skill` |
| "donor", "fundraising", "call time", "ask", "prospect", "pipeline" | `skills/fundraising-outreach/SKILL.md` | `list-campaign-context`, `generate-from-skill` |
| "compliance", "disclaimer", "disclosure", "FEC", "recordkeeping" | `skills/compliance-review/SKILL.md` | `list-campaign-context` |
| "schedule", "automate", "cron", "/schedule" | `skills/automations/SKILL.md` | `list-campaign-context` |
| "prioritize", "this week", "focus", "plan", "strategy" | `skills/campaign-manager/SKILL.md` | `list-campaign-context`, `sync-folder-to-graph` |

## Workflows (registry)

Maps user chat intents to `src/lib/workflows/registry.ts` entries and graph folder highlights.

| Workflow | Trigger phrases | Skill | Graph folders |
|----------|-----------------|-------|---------------|
| `event-research` | "event research", "town hall prep", "event brief", "prepare for event" | `research-brief` | research, events |
| `content-creation` | "content creation", "create content", "write a post", "draft content" | `asset-studio` | assets, messaging, social-media |
| `content-calendar` | "content calendar", "posting schedule", "social calendar", "schedule posts" | `asset-studio` | social-media, events, messaging |
| `campaign-structure` | "campaign structure", "campaign timeline", "build a plan", "voter segments" | `campaign-manager` | campaign, initiatives, field |
| `incumbent-research` | "incumbent research", "compare candidates", "opponent comparison", "incumbent report" | `research-brief` | research, people, polling |

## Agent mode defaults

When no keyword matches, fall back to the active agent mode:

| Agent mode | Default skill |
|------------|---------------|
| campaign-manager | `skills/campaign-manager/SKILL.md` |
| content-strategist | `skills/asset-studio/SKILL.md` |
| researcher | `skills/research-brief/SKILL.md` |
| fundraiser | `skills/fundraising-outreach/SKILL.md` |
| compliance-reviewer | `skills/compliance-review/SKILL.md` |

## Disambiguation

1. Prefer the most specific skill (compliance-review over asset-studio when both match).
2. Load compliance conventions for any outbound content skill.
3. Chain skills explicitly: research-brief → asset-studio when user asks to "research then draft."
4. Deterministic lookups (asset lists, graph counts) → harness scripts, not skills.

## Conventions (cross-cutting)

- `skills/conventions/compliance.md` — disclaimers, no legal advice, recordkeeping
