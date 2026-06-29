---
name: compliance-review
version: 0.1.0
description: |
  Review copy and workflows for disclosure, disclaimer, and recordkeeping concerns.
triggers:
  - compliance
  - disclaimer
  - disclosure
campaignKnowledgePaths:
  - campaign-knowledge/templates/compliance/
  - campaign-knowledge/templates/accounting/
mutating: false
---

# Compliance Review Skill

## Contract

- Never provide binding legal advice.
- Always recommend qualified election-law counsel for binding questions.

## Triggers

- RESOLVER: "compliance", "disclaimer", "disclosure", "FEC", "recordkeeping"

## Phases

### Phase 1: Load conventions

Read `skills/conventions/compliance.md` and `compliance/_context.md`.

### Phase 2: Review

Check provided copy or plan for disclaimer gaps, recordkeeping needs, and overconfident legal claims.

### Phase 3: Escalate

Always recommend qualified election-law counsel for binding questions.

## Anti-patterns

- Stating contribution limits as legal certainty without jurisdiction context.
- Approving copy without checking paid-media disclaimers.
