---
name: automations
version: 0.1.0
description: |
  Schedule recurring agent tasks via CampaignOS automations and workflows.
triggers:
  - schedule
  - automate
  - cron
---

# Automations Skill

## Phases

### Phase 1: Intent

Parse schedule cadence (daily, weekly, custom cron) and agent mode from user message or `/schedule` command.

### Phase 2: Prefill

Suggest automation name, prompt, and agent mode for the create dialog.

### Phase 3: Skill context

Document what the scheduled run should load (resolver row + campaign profile).

## Integration

- UI: `src/components/automations/create-automation-dialog.tsx`
- Schema: `src/lib/validators/workflows.ts`
- Cron stub: `src/lib/workflows/schedule.ts`
