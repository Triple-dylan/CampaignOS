---
name: campaign-signals
version: 0.1.0
description: |
  Always-on ambient capture for campaign workspace activity.
  Detects new tasks, assets, and graph-worthy entities from each message.
triggers:
  - every inbound message (always-on)
campaignKnowledgePaths:
  - campaign/
  - log.md
mutating: false
---

# Campaign Signals — Ambient Capture

Lightweight parallel check on every inbound message. Does not block the main reply.

## Contract

- Runs silently; no visible output unless debugging.
- Suggests graph nodes or follow-up tasks when the user mentions concrete campaign entities.
- Never auto-writes to the database in this stub — only recommends actions.

## Triggers

- RESOLVER always-on row (every inbound message)

## Phases

### Phase 1: Entity detection

Extract mentions of: voters/issues, events, donors, opponents, jurisdictions, assets.

### Phase 2: Signal log

Emit a one-line internal summary:

`Signals: N entities, M suggested graph links (skipped: operational)`

Append significant filing operations to `campaign-knowledge/templates/log.md`.

## Anti-patterns

- Blocking the chat response to wait for signal processing.
- Creating graph nodes without user confirmation in MVP.
