---
name: research-brief
version: 0.1.0
description: |
  Frame district intel, opposition research, and voter segments into sourced briefs.
  Powers event-research and incumbent-research workflows.
triggers:
  - research
  - opposition
  - district
  - event research
  - incumbent research
campaignKnowledgePaths:
  - research/
  - events/
  - people/
tools:
  - generateResearchBriefContent
  - list-research-context
mutating: true
---

# Research Brief Skill

## Contract

- Every claim cites a source or is labeled as inference.
- Prefer compiled wiki pages (`research/_context.md`, `index.md`) over raw re-reads.
- Event and incumbent workflows store output in the Research module.

## Triggers

- RESOLVER: "research", "opposition", "district", "intel", "brief", "voter segment"
- Workflows: `event-research`, `incumbent-research`

## Phases

### Phase 1: Scope

Clarify geography, office, and research target (opponent, issue, demographic, event).

### Phase 2: Compile

Run `list-research-context` for folder entries. Prefer compiled wiki-style pages over re-reading raw PDFs each query.
Invoke `generateResearchBriefContent` when structured output is needed.

### Phase 3: Cite

Label sources; distinguish verified public record from inference.

### Phase 4: Store

Write brief to Research module; append entry to `campaign-knowledge/templates/log.md`.

## Anti-patterns

- Unsourced opposition attacks.
- Treating stale intel as current without a date check.
