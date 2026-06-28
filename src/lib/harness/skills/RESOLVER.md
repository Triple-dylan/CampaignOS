# CampaignOS Skill Resolver

Dispatcher for campaign agent skills. **Read the skill file before acting.**

Pattern source: [Gbrain RESOLVER.md](https://github.com/garrytan/gbrain/blob/master/skills/RESOLVER.md)

## Always-on (every message)

| Trigger | Skill |
|---------|-------|
| Every inbound message (parallel, non-blocking) | `skills/campaign-signals/SKILL.md` |
| Any outbound copy or compliance-sensitive output | `skills/conventions/compliance.md` |

## Campaign modules

| Trigger | Skill |
|---------|-------|
| "draft", "social post", "script", "stump speech", "asset", "copy" | `skills/asset-studio/SKILL.md` |
| "research", "opposition", "district", "intel", "brief", "voter segment" | `skills/research-brief/SKILL.md` |
| "donor", "fundraising", "call time", "ask", "prospect" | `skills/fundraising-outreach/SKILL.md` |
| "compliance", "disclaimer", "disclosure", "FEC", "recordkeeping" | `skills/compliance-review/SKILL.md` |
| "schedule", "automate", "cron", "/schedule" | `skills/automations/SKILL.md` |
| "prioritize", "this week", "focus", "plan", "strategy" | `skills/campaign-manager/SKILL.md` |

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
