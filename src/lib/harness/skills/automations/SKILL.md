---
name: automations
version: 0.1.0
description: |
  Schedule recurring agent tasks via CampaignOS automations and workflows.
triggers:
  - schedule
  - automate
  - cron
campaignKnowledgePaths:
  - skills/
mutating: true
---

# Automations Skill

## Contract

- Parse cadence and agent mode before suggesting automation prefill.
- Document which resolver skill the scheduled run should load.

## Triggers

- RESOLVER: "schedule", "automate", "cron", "/schedule"

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
- Registry: `src/lib/workflows/registry.ts`
