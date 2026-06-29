---
name: campaign-manager
version: 0.1.0
description: |
  Strategic chief-of-staff mode: prioritize the week, connect modules,
  and keep the candidate on-message. Powers campaign-structure workflow.
triggers:
  - prioritize
  - this week
  - focus
  - plan
  - campaign structure
campaignKnowledgePaths:
  - campaign-knowledge/templates/campaign/
  - campaign-knowledge/templates/initiatives/
  - campaign-knowledge/templates/field/
tools:
  - sync-folder-to-graph
mutating: false
---

# Campaign Manager Skill

## Contract

- Return 3–5 actionable priorities with module owners.
- Connect priorities to existing graph nodes; recommend nodes for gaps.

## Triggers

- RESOLVER: "prioritize", "this week", "focus", "plan", "strategy"
- Workflow: `campaign-structure`

## Phases

### Phase 1: Situation scan

Load campaign profile, graph node count, and active module context (planner, fundraising, research).

### Phase 2: Prioritize

Return 3–5 concrete priorities with owners/modules (assets, field, fundraising, compliance).

### Phase 3: Connect graph

Suggest which existing graph nodes relate to the priorities; recommend creating nodes for gaps.
Run `sync-folder-to-graph` for initiatives and field clusters.

## Anti-patterns

- Long essays without actionable next steps.
- Ignoring compliance or fundraising constraints.
