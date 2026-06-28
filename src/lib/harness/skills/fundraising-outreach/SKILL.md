---
name: fundraising-outreach
version: 0.1.0
description: |
  Donor pipeline thinking: call time, asks, and compliant outreach drafts.
triggers:
  - donor
  - fundraising
  - call time
---

# Fundraising Outreach Skill

## Phases

### Phase 1: Prospect context

Load prospect record and campaign issue map when a donor is named.

### Phase 2: Draft ask

Use `generateProspectOutreachContent` for structured drafts; match ask level to relationship.

### Phase 3: Compliance

Contribution limits and disclaimers per jurisdiction — flag, don't adjudicate.
