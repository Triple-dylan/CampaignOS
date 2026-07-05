---
name: fundraising-outreach
version: 0.1.0
description: |
  Donor pipeline thinking: call time, asks, and compliant outreach drafts.
triggers:
  - donor
  - fundraising
  - call time
campaignKnowledgePaths:
  - fundraising/
  - people/
tools:
  - generateProspectOutreachContent
mutating: true
---

# Fundraising Outreach Skill

## Contract

- Match ask level to relationship and jurisdiction limits.
- Never give legal advice on contribution limits — flag for counsel.

## Triggers

- RESOLVER: "donor", "fundraising", "call time", "ask", "prospect", "pipeline"

## Phases

### Phase 1: Prospect context

Load prospect record and campaign issue map when a donor is named.

### Phase 2: Draft ask

Use `generateProspectOutreachContent` for structured drafts; match ask level to relationship.

### Phase 3: Compliance

Contribution limits and disclaimers per jurisdiction — flag, don't adjudicate.

## Anti-patterns

- Generic asks with no tie to campaign issues.
- Skipping recordkeeping reminders for pledged amounts.
