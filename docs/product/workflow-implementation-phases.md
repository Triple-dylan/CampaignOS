# Workflow Implementation Phases

## Phase A: Guided Chat Flows

Goal: make chat able to run the four workflows as prompt chains without external integrations or major UI redesign.

### Deliverables

- Add workflow detection on top of the existing harness resolver.
- Introduce a lightweight pending workflow state in chat for:
  - `event-research`
  - `content-creation`
  - `campaign-structure`
  - `incumbent-research`
- Ask deterministic follow-up prompts for missing fields.
- Generate draft outputs using existing model-backed generators where available:
  - `generateResearchBriefContent` for event and incumbent research.
  - `generateAssetContent` for content creation.
  - A new campaign timeline generator for campaign structure.
- Save confirmed chat outputs through existing module actions or new server actions:
  - Research outputs to `research_briefs`.
  - Content outputs to `assets`.
  - Campaign structure outputs to `calendar_events` and `tasks`.
- Add resolver triggers:
  - Event research: `event`, `town hall`, `forum`, `debate prep`, `rally`.
  - Incumbent research: `incumbent`, `candidate comparison`, `compare candidates`.
  - Campaign structure: `segments`, `timeline`, `district plan`, `campaign structure`.

### Acceptance Criteria

- A user can describe each workflow in chat and be prompted for missing required fields.
- The system produces a preview before saving.
- On confirmation, the artifact appears in the correct module and graph.
- No external integration is required beyond the configured model provider.

### Suggested Build Order

1. Add workflow registry consumers in chat/harness.
2. Add pending workflow state and prompt helpers.
3. Implement save-from-chat server actions for research and assets first.
4. Add campaign timeline generator and bulk event/task creation.
5. Add focused tests around resolver routing and workflow state transitions.

## Phase B: Tab Wizards

Goal: add explicit module entry points that converge on the same artifacts and generator paths as chat.

### Deliverables

- Research tab:
  - Rename or complement `Create brief` with `New Report`.
  - Add `New Comparison` for incumbent/candidate comparisons.
  - Add mode-specific fields for event research and comparison research.
- Assets tab:
  - Rename or complement `Create asset` with `New Content`.
  - Support multi-draft generation and approval selection.
  - Keep existing approval workflow: `draft` -> `needs_review` -> `approved`.
- Planner/Campaign structure:
  - Enable `Generate weekly plan` or add a `Generate timeline` wizard.
  - Collect district, voter segments, issues, date range, and output selection.
  - Bulk-create planner events and tasks from selected timeline rows.
- Reuse `src/lib/workflows/registry.ts` for labels, steps, output type, and destination module.

### Acceptance Criteria

- Chat and tab entry points produce the same record types.
- A tab-created event report is indistinguishable from a chat-created event report after save.
- Wizard previews let the user edit before save.
- Existing module pages remain inside `WorkPageFrame` and right-rail chat continues to follow the user.

### Suggested Build Order

1. Extend `BriefFormDialog` into mode-aware report/comparison creation.
2. Extend `AssetFormDialog` into a content wizard with preview state.
3. Add campaign timeline wizard to Planner before introducing a separate Campaign tab.
4. Add bulk persistence helpers and graph linking tests.

## Phase C: Integrations

Goal: connect external systems after the internal workflow shape is stable.

### Google Calendar

- Use for event research and campaign timelines.
- Import date, location, attendees, and meeting descriptions into event research context.
- Export generated milestones/events to calendar after user confirmation.
- Store external IDs in metadata fields or a future integration mapping table.

### Gmail

- Use for event context, candidate notes, and content handoff only with explicit user permission.
- Pull relevant threads or drafts into workflow context.
- Do not send email automatically in the MVP workflow; create approved assets first.

### Canva

- Replace the current `integration_not_connected` template stub.
- Map campaign profile, theme, issue, and asset copy into Canva templates.
- Save design/export URLs on `assets.file_url`, `assets.metadata_json` if added, or a future provider output table.

### Higgsfield

- Generate visual/video outputs from approved creative prompts.
- Save returned media URLs as assets and mark synthetic media in compliance records where appropriate.

### Model Providers

- Keep OpenAI path working.
- Introduce a provider abstraction before adding Claude or other model families.
- Preserve prompt/model logging in `ai_generation_logs`.

### Acceptance Criteria

- Integrations are opt-in from Settings.
- Workflows degrade to Phase A behavior when integrations are absent.
- Imported external context is visible in the preview before it affects saved artifacts.
- Generated/exported URLs are traceable from assets and compliance records.

## Phase D: Automations

Goal: let users schedule reruns of the same workflows after manual flows are reliable.

### Deliverables

- Add workflow-specific automation templates:
  - Weekly event prep report.
  - Weekly content draft batch.
  - Weekly campaign timeline refresh.
  - Monthly incumbent comparison refresh.
- Wire the runner described in `actions/workflows.ts`:
  - Poll enabled `workflow_schedules`.
  - Create `workflow_runs` with prompt snapshots.
  - Invoke the same workflow registry/generator path.
  - Save output previews or artifacts according to schedule settings.
  - Update run status, `last_run_at`, `next_run_at`, and generation logs.
- Extend `/schedule` and Automations UI to preserve workflow ID and destination module in metadata.

### Acceptance Criteria

- A scheduled workflow run creates a `workflow_runs` row.
- Run outputs can be inspected before permanent artifact creation unless the schedule is explicitly configured for auto-save.
- Failed runs are visible in Automations with actionable error text.
- Schedules can be paused without deleting history.

## Recommended Next Slice After Cycle 1

Build Phase A for Research first:

1. Add workflow routing for `event-research` and `incumbent-research`.
2. Add pending chat state that collects required fields.
3. Add save-from-chat action that creates `research_briefs` and graph nodes.
4. Add `New Report` and `New Comparison` labels only after the chat flow saves reliably.

This slice is narrow because Research already has the strongest persistence path, graph linking, manual/AI creation UI, and `research-brief` harness skill. It proves the dual-entry workflow contract before expanding to multi-draft asset approval or bulk campaign timelines.
