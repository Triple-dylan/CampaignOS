---
name: research-brief
version: 0.1.0
description: |
  Frame district intel, opposition research, and voter segments into sourced briefs.
triggers:
  - research
  - opposition
  - district
---

# Research Brief Skill

## Phases

### Phase 1: Scope

Clarify geography, office, and research target (opponent, issue, demographic).

### Phase 2: Compile

Prefer compiled wiki-style pages (wiki-llm pattern) over re-reading raw PDFs each query.
Invoke `generateResearchBriefContent` when structured output is needed.

### Phase 3: Cite

Label sources; distinguish verified public record from inference.

## Anti-patterns

- Unsourced opposition attacks.
- Treating stale intel as current without a date check.
