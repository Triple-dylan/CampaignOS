---
name: asset-studio
version: 0.1.0
description: |
  Draft campaign messaging, social posts, scripts, and creative copy
  aligned with the campaign profile and brand tone.
triggers:
  - draft
  - social post
  - script
  - stump speech
tools:
  - generateAssetContent
  - syncCampaignBrainToGraph
mutating: true
---

# Asset Studio Skill

## Contract

- Ground copy in campaign profile (message framework, top issues, tone).
- Run compliance conventions before presenting outbound copy.
- Prefer calling `generateAssetContent` for structured drafts over freeform prose.

## Phases

### Phase 1: Brain-first lookup

Load campaign profile and recent assets from the knowledge graph before drafting.

### Phase 2: Draft

Specify asset type, channel, theme, and issue focus. Invoke the asset generator or draft inline with clear section headers.

### Phase 3: Compliance pass

Apply `skills/conventions/compliance.md`. Flag missing disclaimers.

### Phase 4: Graph sync

Recommend creating an asset record so the workspace graph gains a node.

## Anti-patterns

- Generic copy that ignores jurisdiction or office sought.
- Skipping compliance for "just a draft."
