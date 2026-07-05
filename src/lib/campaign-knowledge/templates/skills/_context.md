---
title: "Skills folder context"
type: context
folder: skills
---

# Skills

Reusable agent skills and playbooks (Cursor/gbrain-style). Each subdirectory mirrors a canonical harness skill under `src/lib/harness/skills/`.

## When to descend here

- Scheduled automations, cron workflows, or agent playbook questions
- Understanding which skill handles a module (asset-studio, research-brief, etc.)

## Canonical source

Runtime skills live in `src/lib/harness/skills/`. The resolver table is `src/lib/harness/skills/RESOLVER.md`. This folder is the **campaign-local mirror** for graph visibility and wiki navigation.

## When to skip

- One-off content drafting — use `assets/`, `messaging/`, or `communications/` instead.
