# Campaign Workflows Product Spec

## Scope

This spec turns the linear workflow notes into CampaignOS product behavior. The product rule is that chat entry and module-tab entry must converge on the same artifact type, persistence layer, graph node behavior, and review surface.

Current surfaces to build on:

- Chat: `ChatProvider`, `ChatDock`, persistent `WorkspaceChatPanel`, `sendChatMessage`, and the harness resolver/loop.
- Research: `/research`, `ResearchHub`, `BriefFormDialog`, `research_briefs`, and `research-brief` skill.
- Assets: `/assets`, `AssetStudio`, `AssetFormDialog`, Canva/Higgsfield template stubs, `assets`, and `asset-studio` skill.
- Campaign structure: `/planner`, `/tasks`, `/brain`, `calendar_events`, `tasks`, `graph_nodes`, `campaign_profile`, and `campaign-manager` skill.
- Automations: `/automations`, `/schedule`, `workflow_schedules`, `workflow_runs`, and `automations` skill.

## Workflow Summary

| Workflow | Chat entry | Tab entry | Output stored | Integrations needed |
| --- | --- | --- | --- | --- |
| Event Research | User states event intent in chat | Research tab: `New Report`/current `Create brief` wizard with event research mode | `research_briefs` row, Research graph node, optional planner/task links | Model provider, Google Calendar, Gmail |
| Content Creation | User describes event or content need in chat | Assets tab: `New Content`/current `Create asset` wizard | `assets` row, compliance record, Asset graph node, approved asset library | Model provider, Canva, Higgsfield, Gmail |
| Campaign Structure | User states district and voter segments in chat | Campaign/Planner tab: segment wizard or current disabled `Generate weekly plan` area | Timeline as `calendar_events`, follow-up `tasks`, graph nodes, campaign-knowledge pages | Model provider, Google Calendar |
| Incumbent Research | User requests candidate comparison in chat | Research tab: `New Comparison`/current `Create brief` wizard with opponent mode | `research_briefs` row, Research graph node, optional task | Model provider, Gmail |

## Shared Workflow Contract

Every guided workflow follows one contract:

1. Entry starts from chat intent or a tab wizard.
2. The system collects missing required fields through concise prompts.
3. Generation uses the same workflow definition, harness skill, campaign profile, graph context, and compliance conventions.
4. Output lands as a first-class module artifact, not just chat text.
5. Artifact creation links to the campaign graph and, when useful, creates follow-up tasks or planner events.
6. Automations can later rerun the same workflow with saved prompt snapshots.

## 1. Event Research

### Linear State Machine

| State | Chat path | Research tab path | Output |
| --- | --- | --- | --- |
| Intent captured | User says they are preparing for an event, town hall, debate, house party, fundraiser, or audience meeting. | User clicks `New Report` and chooses `Event Research` (current equivalent: `Create brief` with `AI generate`). | Workflow `event-research` starts. |
| Details requested | Prompt for date, location, audience, event type, candidate role, likely questions, and desired report depth. | Wizard fields collect the same values directly. | Normalized event research request. |
| Context loaded | Harness routes to `research-brief`; always-on `campaign-signals` extracts event, audience, and issue entities. | Wizard calls same generation action/request shape. | Campaign profile, top issues, graph summary, optional planner context. |
| Report generated | Assistant summarizes and offers to save. | Wizard generates directly. | Draft report with summary, key findings, risks, suggested talking points, and source list. |
| Artifact stored | User confirms save or explicit "store this." | Submit wizard. | `research_briefs` row with `research_type = "issue"` or future `event`; graph node via `linkResearchToCampaignGraph`. |
| Follow-up offered | Suggest event task, talking-point asset, or planner event link. | Detail drawer shows `Create task`; future wizard can link/create event. | Optional `tasks` row and graph node. |

### Required Prompts

- What is the event date and time?
- Where is it located?
- Who is the expected audience?
- What should the candidate accomplish?
- Which issues or likely questions should the report cover?

### Storage and Data Model

- `research_briefs`: title, topic, summary, body, key findings, sources, `ai_generated`, `prompt_used`, `model_used`, status.
- `graph_nodes`: `node_type = "research"`, `source_object_type = "research_brief"`.
- `graph_edges`: links to candidate and issue nodes when available.
- Optional `calendar_events`: if the event is new or imported from Google Calendar.
- Optional `tasks`: follow-up prep tasks linked through `related_research_id`.
- Campaign-knowledge folder: `research/` for the report and `events/` for event context pages when file/wiki sync exists.

### Integrations

- Phase A: model provider only, using current OpenAI generation path or equivalent provider adapter.
- Phase C: Google Calendar to import event date/location/attendees; Gmail to pull invitation context, stakeholder notes, or recent email threads with explicit user permission.

### Harness and UI Mapping

- Skill: `research-brief`.
- Resolver triggers already include `research`, `district`, `opposition`, `brief`, and `voter segment`; add event-oriented triggers such as `event`, `town hall`, `debate`, and `forum`.
- UI touchpoints: right-rail chat, Work desk chat, `/research` `Create brief`, future `New Report` button, brief detail `Create task`.

## 2. Content Creation

### Linear State Machine

| State | Chat path | Asset tab path | Output |
| --- | --- | --- | --- |
| Need captured | User describes an event, audience, channel, or content need. | User clicks `New Content` (current equivalent: `/assets` `Create asset`). | Workflow `content-creation` starts. |
| Theme requested | Prompt for theme, issue, audience, channel, asset type, tone, and approval deadline. | Wizard fields collect asset type, theme, issue, and channel. | Normalized asset generation request. |
| Context loaded | Harness routes to `asset-studio`; compliance conventions are always applied. | Wizard calls same generation action/request shape. | Campaign profile, message framework, top issues, graph context. |
| Drafts generated | Assistant produces one or more drafts and asks for approval/save. | Wizard generates a draft asset. | Draft copy or creative prompt. |
| Review requested | User approves, requests changes, or asks to submit for approval. | Asset detail supports edit, submit, approve/reject. | Asset moves from `draft` to `needs_review` to `approved`. |
| Artifact stored | On save, create asset library item. | Submit wizard. | `assets` row, `compliance_records` row, graph node. |

### Required Prompts

- What should we create?
- Which audience and channel is this for?
- What theme, issue, or message should lead?
- Should it reference an event, research brief, or approved talking point?
- Is it ready to save as a draft or submit for approval?

### Storage and Data Model

- `assets`: asset type, title, content text, status, channel, theme, issue, prompt/model fields, approval fields, compliance status.
- `compliance_records`: created automatically for each asset, especially AI-generated or distribution-bound content.
- `graph_nodes`: `node_type = "asset"`, `source_object_type = "asset"`.
- Optional `calendar_events`: if the asset is scheduled against an event/content date.
- Campaign-knowledge folders: `assets/`, `social-media/`, `communications/`, `media/`, and `messaging/`.

### Integrations

- Phase A: model provider for text drafts.
- Phase C: Canva for template autofill/export; Higgsfield for image/video generation; Gmail for email draft context or outbound handoff.

### Harness and UI Mapping

- Skill: `asset-studio`.
- Resolver triggers already include `draft`, `social post`, `script`, `asset`, `copy`, and `message`.
- UI touchpoints: right-rail chat, Work desk chat, `/assets` `Create asset`, template card `Generate`, `Connect integrations`, asset detail approval actions.

## 3. Campaign Structure

### Linear State Machine

| State | Chat path | Campaign/Planner tab path | Output |
| --- | --- | --- | --- |
| Strategy captured | User states district and voter segments. | User opens Campaign/Planner flow and defines segments manually. | Workflow `campaign-structure` starts. |
| Issues requested | Prompt for key issues, election date, available channels, and desired planning horizon. | Wizard collects segments, issues, goals, date range, and cadence. | Structured campaign planning request. |
| Context loaded | Harness routes to `campaign-manager`; campaign profile and graph are loaded. | Wizard calls same planning service. | Campaign profile, top issues, existing events/tasks/assets. |
| Timeline generated | Assistant returns timeline and asks what to save. | Wizard previews generated timeline. | Milestones, content beats, field beats, research needs, and task seeds. |
| Artifact stored | User confirms save. | Wizard saves selected rows. | `calendar_events`, `tasks`, graph nodes/edges, optional campaign-knowledge pages. |

### Required Prompts

- Which district or jurisdiction are we planning around?
- Which voter segments matter most?
- Which key issues should anchor the timeline?
- What is the election date or target date range?
- Should the output create planner events, tasks, or both?

### Storage and Data Model

- `calendar_events`: milestones, content beats, field events, debates, fundraisers, compliance dates.
- `tasks`: owners, priorities, due dates, and links to events/assets/research.
- `campaign_profile`: existing voter segments, top issues, message framework; future updates may write refined segment strategy.
- `graph_nodes`: event/task/strategic priority nodes.
- `graph_edges`: candidate, issue, event, asset, and task relationships.
- Campaign-knowledge folders: `campaign/`, `field/`, `initiatives/`, `events/`, `messaging/`, and `polling/`.

### Integrations

- Phase A: model provider only.
- Phase C: Google Calendar for export/import and conflict checks.

### Harness and UI Mapping

- Skill: `campaign-manager`.
- Resolver triggers include `plan`, `strategy`, `prioritize`, `this week`, and `focus`; add segment/timeline-specific triggers as needed.
- UI touchpoints: chat, `/planner` disabled `Generate weekly plan` button, `/planner` `New event`, `/tasks` board, `/brain` graph. The user asked for a `Campaign` tab; current app equivalent is Planner plus Knowledge graph until a dedicated Campaign tab exists.

## 4. Incumbent Research

### Linear State Machine

| State | Chat path | Research tab path | Output |
| --- | --- | --- | --- |
| Comparison requested | User asks for candidate/incumbent comparison. | User clicks `New Comparison` (current equivalent: `/research` `Create brief`, research type `Opponent`). | Workflow `incumbent-research` starts. |
| Targets requested | Prompt for candidate names, office, district, timeframe, and comparison dimensions. | Wizard fields collect candidates and focus areas. | Normalized comparison request. |
| Context loaded | Harness routes to `research-brief`; graph and campaign profile are loaded. | Wizard calls same generation action/request shape. | Candidate, opponent, issue, and district context. |
| Data aggregated | Model drafts with sources and clearly labels unverified claims. | Same. | Comparison report with source list and confidence notes. |
| Artifact stored | User confirms save. | Submit wizard. | `research_briefs` row with `research_type = "opponent"` and graph node. |
| Follow-up offered | Suggest tasks, content briefs, or debate prep. | Detail drawer supports `Create task`. | Optional task and graph node. |

### Required Prompts

- Which candidates or incumbents should be compared?
- Which office, district, or race context applies?
- What comparison dimensions matter: record, fundraising, votes, endorsements, message contrast, vulnerabilities?
- What date range should be considered current?

### Storage and Data Model

- `research_briefs`: `research_type = "opponent"`, topic as candidate set, findings and sources.
- `graph_nodes`: research node; future opponent/candidate nodes may be added if opponent graph typing is expanded.
- `tasks`: follow-up debate prep, verification, or content assignments.
- Campaign-knowledge folders: `research/`, `people/`, `communications/`, and `messaging/`.

### Integrations

- Phase A: model provider only.
- Phase C: Gmail for staff-provided candidate notes or forwarded source material. Public-record/search integrations are not present yet and should be treated as a separate integration decision.

### Harness and UI Mapping

- Skill: `research-brief`.
- Resolver triggers already include `opposition`, `research`, `brief`, and `voter segment`; add `incumbent`, `comparison`, and `candidate comparison`.
- UI touchpoints: chat, `/research` `Create brief`, future `New Comparison`, brief detail `Create task`.

## Current App Gaps

| Area | Exists | Missing |
| --- | --- | --- |
| Shared workflow contract | Harness resolver, skills, chat provider, module actions, graph linking | Workflow run state, save-from-chat actions, and shared chat/tab request schema |
| Event Research | Research briefs, planner events, graph links | Event-specific research type, Google Calendar import, event-to-brief linking UI |
| Content Creation | Asset generation, approval states, compliance record, Canva/Higgsfield stubs | Multi-draft approval, provider connections, asset scheduling, true creative export URLs |
| Campaign Structure | Planner events, tasks, graph, campaign profile, disabled generate plan button | Dedicated Campaign tab, segment timeline wizard, bulk create events/tasks |
| Incumbent Research | Opponent research type and research skill | Dedicated `New Comparison` flow, candidate target fields, public-source aggregation |
| Automations | Schedule create UI, `/schedule`, workflow schedules/runs tables | Runner execution, workflow-specific schedule templates, saved artifact outputs |
| Campaign Knowledge | Folder taxonomy and graph mapping | File/wiki write path for generated workflow pages |

## Implementation Notes

- `src/lib/workflows/registry.ts` defines the first shared workflow identifiers, entry points, steps, output types, destination modules, harness skills, and integration requirements.
- Chat should not merely answer with generated content once workflow save actions exist. It should carry a pending workflow state and ask for missing fields until an artifact can be saved.
- Tab wizards should use the same registry and generation adapters as chat, so `New Report`, `New Content`, and `New Comparison` are alternate entry points, not separate products.
