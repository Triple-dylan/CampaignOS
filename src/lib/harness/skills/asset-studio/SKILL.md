---
name: asset-studio
version: 0.1.0
description: |
  Draft campaign messaging, social posts, scripts, and creative copy
  aligned with the campaign profile and brand tone.
  Powers the content-creation workflow.
triggers:
  - draft
  - social post
  - script
  - stump speech
  - content creation
campaignKnowledgePaths:
  - campaign-knowledge/templates/assets/
  - campaign-knowledge/templates/messaging/
  - campaign-knowledge/templates/social-media/
tools:
  - generateAssetContent
  - syncCampaignBrainToGraph
  - generate-from-skill
mutating: true
---

# Asset Studio Skill

## Contract

- Ground copy in campaign profile (message framework, top issues, tone).
- Run compliance conventions before presenting outbound copy.
- Prefer calling `generateAssetContent` for structured drafts over freeform prose.

## Triggers

- RESOLVER: "draft", "social post", "script", "stump speech", "asset", "copy", "message"
- Workflow: `content-creation`

## Phases

### Phase 1: Brain-first lookup

Load campaign profile and recent assets from the knowledge graph before drafting.
Read `assets/_context.md` and `messaging/_context.md`.

### Phase 2: Draft

Specify asset type, channel, theme, and issue focus. Invoke the asset generator or draft inline with clear section headers.

### Phase 3: Compliance pass

Apply `skills/conventions/compliance.md`. Flag missing disclaimers.

### Phase 4: Graph sync

Recommend creating an asset record so the workspace graph gains a node.
Run `sync-folder-to-graph` for the assets cluster.

## Anti-patterns

- Generic copy that ignores jurisdiction or office sought.
- Skipping compliance for "just a draft."
