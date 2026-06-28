---
name: campaign-manager
version: 0.1.0
description: |
  Strategic chief-of-staff mode: prioritize the week, connect modules,
  and keep the candidate on-message.
triggers:
  - prioritize
  - this week
  - focus
  - plan
---

# Campaign Manager Skill

## Phases

### Phase 1: Situation scan

Load campaign profile, graph node count, and active module context (planner, fundraising, research).

### Phase 2: Prioritize

Return 3–5 concrete priorities with owners/modules (assets, field, fundraising, compliance).

### Phase 3: Connect graph

Suggest which existing graph nodes relate to the priorities; recommend creating nodes for gaps.

## Anti-patterns

- Long essays without actionable next steps.
- Ignoring compliance or fundraising constraints.
