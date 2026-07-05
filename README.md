# CampaignOS

The operating system for modern political campaigns — strategy, field, fundraising, research, and compliance in one workspace.

> **Milestone 12 (M12):** Campaign Brain visualization — interactive React Flow graph at `/brain` with node-type filters, search, and deep links to source modules.

> **Milestone 8 (M8):** Planner + Tasks — calendar events, task board (list + kanban), optional asset/event linking, graph nodes, and dashboard counts.

> **Milestone 7 (M7):** Asset Studio — create and approve campaign content (social posts, flyer copy, emails) with optional AI generation, compliance metadata, and graph linking.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 10+
- A [Clerk](https://clerk.com/) application (free tier works)
- [Supabase](https://supabase.com/) project (optional locally — app builds without keys; required for data sync)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, for local migrations via `supabase db reset`)
- [OpenAI API key](https://platform.openai.com/) (optional — Campaign Brain is disabled without it; the app works fully otherwise)

## Local setup

1. **Clone and install**

   ```bash
   cd CampaignOS
   pnpm install
   ```

2. **Environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in Clerk keys from your dashboard (see [Clerk setup](#clerk-setup) below). Supabase keys are optional until you want database sync. OpenAI is optional until you want Campaign Brain generation (see [OpenAI setup](#openai-setup-m6)).

3. **Run the dev server**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) for the marketing landing page. Sign up at `/sign-up` to access the app shell.

## Clerk setup

### 1. Create a Clerk application

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) and create an application named **CampaignOS**.
2. Copy the **Publishable key** and **Secret key** into `.env.local`:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

### 2. Enable sign-in methods

In Clerk Dashboard → **Configure** → **Email, phone, username**:

- Enable **Email address** (email + password or email code)
- Under **Social connections**, enable **Google** OAuth

### 3. Enable Organizations

In Clerk Dashboard → **Configure** → **Organizations**:

- Enable organizations
- Set membership limits as needed (one campaign per org in CampaignOS)

The app sidebar includes an **OrganizationSwitcher** so users can create or switch campaign orgs.

### 4. Configure redirect URLs

In Clerk Dashboard → **Configure** → **Paths** (or set via `.env.local`):

| Setting | Value |
| -------- | ----- |
| Sign-in URL | `/sign-in` |
| Sign-up URL | `/sign-up` |
| After sign-in URL | `/auth/after-sign-in` |
| After sign-up URL | `/auth/after-sign-in` |

The `/auth/after-sign-in` route checks **both** Clerk `publicMetadata.onboardingComplete` **and** Supabase campaign + profile data:

- **New or incomplete users** → `/onboarding`
- **Fully onboarded users** → `/dashboard`

Workspace routes (`/dashboard`, `/settings`, etc.) redirect incomplete users to `/onboarding`. Visiting `/onboarding` when already complete redirects to `/dashboard`.

### 5. Webhook (Clerk → Supabase sync)

1. In Clerk Dashboard → **Webhooks**, add an endpoint:
   - **URL:** `https://your-domain.com/api/webhooks/clerk` (local: use [ngrok](https://ngrok.com/) or Clerk's dev tunnel)
   - **Events:** `user.created`, `user.updated`, `organization.created`, `organization.updated`, `organizationMembership.created`, `organizationMembership.updated`, `organizationMembership.deleted`
2. Copy the **Signing secret** to `.env.local` as `CLERK_WEBHOOK_SECRET`.

When Supabase env vars are set, webhooks sync:

- `users` from user events
- `organizations` + owner membership from organization events
- `organization_members` from membership events

Without Supabase, the webhook still validates signatures and logs events.

## Supabase setup (M3)

### 1. Create a project

1. Create a project at [supabase.com](https://supabase.com).
2. Enable the **vector** extension: Dashboard → **Database** → **Extensions** → search `vector` → enable.
3. Copy project URL and keys into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only — never expose to the client)

### 2. Apply migrations

Migrations live in `supabase/migrations/`:

| File | Purpose |
| ---- | ------- |
| `001_users.sql` | Users (Clerk sync) |
| `002_extensions.sql` | `uuid-ossp`, `pgvector` |
| `003_core_schema.sql` | Orgs, members, campaigns, profiles, graph |
| `004_future_tables.sql` | Assets, tasks, research, fundraising, compliance (DDL only) |
| `005_rls.sql` | RLS helpers + policies |
| `006_storage.sql` | Private `campaign-assets` bucket |
| `007_campaign_brain.sql` | Campaign Brain AI columns + graph node types |
| `008_asset_approval.sql` | Asset approval timestamps |
| `009_planner_tasks.sql` | Calendar milestone flag + planner/task indexes |
| `010_research_hub.sql` | Research brief status, topic, key findings |
| `011_fundraising_planner.sql` | Fundraising plan raised amount + prospect outreach history |

**Hosted project:** run each migration in order via Supabase Dashboard → **SQL Editor**, or use the Supabase CLI linked to your project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

**Local Supabase (CLI):**

```bash
supabase start
supabase db reset
```

`supabase db reset` replays all migrations from scratch.

### 3. Schema highlights

- **One active campaign per org** — partial unique index on `campaigns(organization_id)` where `campaign_status = 'active'`
- **RBAC roles** — `owner`, `admin`, `manager`, `member`, `reviewer`, `viewer`
- **RLS** — organization isolation; members read/write campaign data; org settings mutations require `owner` or `admin`
- **Storage** — private `campaign-assets` bucket (path: `{org_id}/{campaign_id}/…`)

### 4. Org sync fallback

If a Clerk org exists before webhooks fire, the app calls `ensureOrganizationSynced()` on authenticated app loads and exposes:

- **Server action:** `ensureOrganizationSynced()` in `src/actions/organizations.ts`
- **API:** `POST /api/organizations/sync`

## OpenAI setup (M6)

Campaign Brain uses OpenAI server-side only. The key is never exposed to the browser.

1. Create an API key at [platform.openai.com](https://platform.openai.com/api-keys).
2. Add to `.env.local`:
   - `OPENAI_API_KEY` — required to enable **Generate Campaign Brain**
   - `OPENAI_MODEL` — optional; defaults to `gpt-4o-mini`
3. Restart the dev server after changing env vars.

Without `OPENAI_API_KEY`, the dashboard button stays disabled with a tooltip explaining how to enable AI. All other app features work normally.

Every OpenAI call is logged to `ai_generation_logs` (prompt, model, tokens, output JSON, campaign and user IDs).

## Testing locally

1. Start the dev server: `pnpm dev`
2. Visit `/sign-up` and create an account (email or Google)
3. Create or select a **campaign organization** via the sidebar OrganizationSwitcher
4. Complete the **6-step onboarding wizard** at `/onboarding`:
   - Campaign basics (candidate, office, jurisdiction, WA default state)
   - Top issues (presets + custom tags)
   - Target voter segments
   - Brand tone preferences
   - Optional fundraising goal
   - Review & submit
5. After submit you should land on `/dashboard` with Clerk `onboardingComplete: true` and an **active** campaign + profile in Supabase
6. Visit `/settings` to see the read-only campaign summary
7. Sign out and sign back in — you should route to `/dashboard`, not onboarding
8. Visit `/dashboard` while signed out — middleware redirects to `/sign-in`

### Dashboard (M5 + M6)

After onboarding, `/dashboard` should show:

- **Campaign summary** — candidate, office, jurisdiction, election date, days-until-election countdown
- **Profile highlights** — top issues, brand tone, fundraising goal; after Brain generation, value proposition and key messages
- **Campaign Brain** — AI summary, tone guidance, taglines, and issue map (after generation)
- **Module empty states** — tasks, calendar, assets, research, compliance with CTAs to module routes (Phase labels)
- **Generate Campaign Brain** — enabled when `OPENAI_API_KEY` is set and onboarding is complete; shows spinner while generating; **Regenerate** prompts for confirmation
- Sidebar/header show org + candidate context; nav items highlight the active route
- Compliance disclaimer footer on all authenticated app pages

### Campaign Brain (M6)

1. Complete onboarding and apply migration `007_campaign_brain.sql` to Supabase.
2. Set `OPENAI_API_KEY` in `.env.local` and restart `pnpm dev`.
3. Open `/dashboard` and click **Generate Campaign Brain**.
4. Expect:
   - Loading spinner on the button during generation
   - **Campaign Brain** card populated with summary, message framework, and issue map
   - Profile highlights updated with value proposition and key messages
   - Rows in `ai_generation_logs` with `module = campaign_brain`
   - New `graph_nodes` (`message_theme`, `strategic_priority`) and edges linking candidate → issues → messages
5. Click **Regenerate Campaign Brain** — confirm dialog appears; prior Brain graph nodes are replaced.
6. Remove `OPENAI_API_KEY` and restart — button disabled with tooltip; dashboard still loads.

**Resume onboarding:** Complete steps 1–3, leave the app, return to `/onboarding` — saved draft data reloads from Supabase.

**Partial metadata test:** Set `onboardingComplete: true` in Clerk without Supabase data — guards still send you to `/onboarding`.

For webhooks locally, expose port 3000 with ngrok and point Clerk's webhook to `https://<tunnel>/api/webhooks/clerk`

## Sentry (optional)

Error monitoring is wired via `@sentry/nextjs` but stays inactive until you set a DSN.

1. Create a project at [sentry.io](https://sentry.io) (Next.js platform).
2. Add to `.env.local` (and Vercel project env):
   - `NEXT_PUBLIC_SENTRY_DSN` — required to enable reporting
   - `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` — optional; used at build time for source map upload
3. Restart dev server or redeploy. Without `NEXT_PUBLIC_SENTRY_DSN`, Sentry is a no-op.

## Vercel deployment

1. Push the repo to GitHub and import the project in [Vercel](https://vercel.com).
2. Set **Framework Preset** to Next.js; build uses `pnpm build` (see `vercel.json`).
3. Add environment variables from `.env.example` (Clerk, Supabase, optional OpenAI, optional Sentry, `NEXT_PUBLIC_APP_URL` = production URL).
4. Configure Clerk redirect URLs and webhook endpoint to your production domain.
5. Apply Supabase migrations to your hosted project before first sign-up.
6. Deploy; verify `/dashboard` after completing onboarding.

**Checklist**

- [ ] Clerk keys + redirect URLs for production domain
- [ ] Supabase URL, anon key, service role key
- [ ] `CLERK_WEBHOOK_SECRET` + webhook URL pointed at `/api/webhooks/clerk`
- [ ] `NEXT_PUBLIC_APP_URL` matches Vercel deployment URL
- [ ] Optional: `OPENAI_API_KEY` (+ `OPENAI_MODEL` if overriding default)
- [ ] Optional: `NEXT_PUBLIC_SENTRY_DSN`
- [ ] `pnpm build` passes locally before promoting

## Scripts

| Command            | Description                    |
| ------------------ | ------------------------------ |
| `pnpm dev`         | Start Next.js dev server       |
| `pnpm build`       | Production build               |
| `pnpm start`       | Serve production build         |
| `pnpm lint`        | Run ESLint                     |
| `pnpm typecheck`   | Run TypeScript (`tsc --noEmit`) |
| `pnpm test`        | Run Vitest unit tests           |
| `pnpm format`      | Format with Prettier           |
| `pnpm format:check`| Check Prettier formatting      |

## Project structure

```
src/
├── actions/             # Server actions (org sync, onboarding, AI)
├── app/
│   ├── (marketing)/     # Public landing page
│   ├── (auth)/          # Clerk sign-in / sign-up
│   ├── (app)/           # Authenticated app shell + module pages
│   ├── auth/            # Post-auth redirect handler
│   └── api/             # Health, Clerk webhook, org sync
├── components/
│   ├── ui/              # ShadCN UI components
│   ├── campaign/        # Campaign context provider (M5)
│   ├── dashboard/       # Dashboard cards and actions (M5)
│   ├── brain/           # Campaign Brain React Flow graph (M12)
│   ├── layout/          # Sidebar, header, disclaimer, module shell
│   └── onboarding/      # Onboarding wizard + placeholders
├── lib/
│   ├── campaign/        # Campaign context loader + display utils (M5)
│   ├── db/              # Supabase data layer (users, orgs, campaigns, members)
│   ├── validators/      # Zod schemas for org/campaign shapes
│   ├── auth/            # Session, permissions, onboarding helpers
│   ├── graph/           # React Flow transforms, node styles, source links
│   └── ai/              # OpenAI client, prompts, logging, Campaign Brain
├── hooks/
└── types/
supabase/
└── migrations/          # Full M3 schema + RLS + storage
```

## Tech stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Auth:** Clerk (Google OAuth, email, organizations)
- **Database:** Supabase Postgres + pgvector + RLS
- **Styling:** Tailwind CSS v4 + ShadCN UI
- **Observability:** Sentry (optional, DSN-gated)
- **Package manager:** pnpm
- **CI:** GitHub Actions (lint, typecheck, build)

## Phase 1 complete (M5)

Phase 1 delivers the authenticated campaign workspace shell: onboarding, settings summary, live dashboard, navigation, compliance disclaimer, and deploy-ready config.

## Phase 2 — Campaign Brain (M6)

M6 adds AI-powered campaign setup:

- **OpenAI integration** — `src/lib/ai/client.ts`, structured JSON prompts, Zod validation
- **Generation logging** — every call recorded in `ai_generation_logs`
- **Profile enrichment** — `summary`, `message_framework`, `issue_map`, `brain_generated_at` on `campaign_profiles`
- **Graph enrichment** — `message_theme` and `strategic_priority` nodes with candidate/issue/message edges
- **Dashboard** — generate/regenerate with loading state and results card

**Phase 3 (Asset Studio)** can consume the message framework, tone guidance, and issue map from `campaign_profiles` and graph nodes when generating creative assets.

## Phase 3 — Asset Studio (M7)

M7 replaces the `/assets` placeholder with a functional Asset Studio:

- **Asset types (MVP):** `social_post`, `flyer` (flyer copy), `email` — text-first; file upload to `campaign-assets` is deferred (schema supports `file_url` for a later milestone).
- **Create flow:** manual form or AI generation via `generateAsset()` server action (`src/actions/assets.ts`).
- **AI context:** injects campaign profile, `message_framework`, and issue map from Campaign Brain; structured JSON output validated with Zod; logged to `ai_generation_logs`.
- **Approval workflow:** `draft` → `needs_review` (pending approval) → `approved`, or reject back to `draft`. Owner/admin/manager roles can approve (`canApproveAssets`).
- **Compliance metadata:** each new asset auto-creates a `compliance_records` row; asset cards show `compliance_status` badges (pending/reviewed/flagged map to schema `pending`/`approved`/`rejected`).
- **Graph:** each asset creates an `asset` graph node linked to the candidate via `belongs_to`.
- **Dashboard:** Assets module card shows count when assets exist and links to `/assets`.

### Testing Asset Studio locally

1. Complete onboarding and optionally generate a Campaign Brain (better AI drafts).
2. Open **Asset Studio** from the sidebar or dashboard.
3. **Manual:** Create asset → pick type → enter title and content → Save → Submit for approval.
4. **AI:** Create asset → AI generate (requires `OPENAI_API_KEY`) → edit draft → submit → approve as owner/admin/manager.
5. Verify filters (type, status, compliance) and dashboard asset count update after create.

Without `OPENAI_API_KEY`, manual create and the full approval/compliance flow still work.

## Phase 4 — Planner + Tasks (M8)

M8 replaces the `/planner` and `/tasks` placeholders with functional campaign operations tools:

- **Planner (`/planner`):** create, edit, and delete `calendar_events` with title, description, start/end datetime, event type (schema enum), location, milestone flag, and optional link to approved assets.
- **Tasks (`/tasks`):** list view (default) and kanban board by status; create/edit/delete tasks with status, priority, due date, and optional links to approved assets or calendar events.
- **Filters:** events by type and view (upcoming / all / milestones); tasks by status, priority, and due date (overdue / this week).
- **Graph:** each event creates an `event` node; each task creates a `task` node — linked to candidate (`belongs_to`), assets (`scheduled_for` / `references`), and events (`connected_to`) when applicable.
- **Dashboard:** Tasks card shows open task count; Calendar card shows upcoming events in the next 7 days.
- **AI weekly plan:** opens the **Generate timeline** wizard (Phase B) or routes open-ended requests through chat.

### Testing Planner + Tasks locally

1. Complete onboarding and apply migration `009_planner_tasks.sql` to Supabase.
2. Optionally create and approve assets in Asset Studio (for cross-linking).
3. **Planner:** open `/planner` → create events → filter by type/view → edit → delete. Verify milestone badge when checked.
4. **Tasks:** open `/tasks` → create tasks → toggle list/kanban → change status via dropdown or kanban buttons → filter by status/priority/due date.
5. Verify dashboard module cards update task and upcoming event counts.
6. Check `graph_nodes` for new `event` and `task` nodes with edges to candidate/assets.

**Phase 5 (Research Hub)** can link `research_briefs` to tasks via `related_research_id` on tasks.

## Phase 5 — Research Hub (M9)

M9 replaces the `/research` placeholder with a functional Research Hub:

- **Brief list view:** grid of research briefs for the active campaign with filters by type, status, and date range; empty state when none exist.
- **CRUD:** manual create/edit/delete with title, topic, summary, key findings, sources (`url`, `title`, `snippet`), research type, and status (`draft` / `complete`).
- **AI generator:** `generateResearchBrief()` server action injects campaign profile, issues, and Campaign Brain context; structured JSON validated with Zod; logged to `ai_generation_logs`.
- **Sources disclaimer:** AI-generated briefs show an amber banner — *AI-generated references, verify independently* before use in paid media or public statements.
- **Task linking:** detail view quick action creates a task with `related_research_id` set to the brief.
- **Graph:** each brief creates a `research` node linked to candidate (`belongs_to`) and matching issue nodes (`references`).
- **Dashboard:** Research briefs card shows count when briefs exist and links to `/research`.

Apply migration `010_research_hub.sql` for `status`, `topic`, and `key_findings_json` columns.

### Testing Research Hub locally

1. Complete onboarding and apply migration `010_research_hub.sql` to Supabase.
2. Optionally generate a Campaign Brain (better AI briefs).
3. Open **Research Hub** from the sidebar or dashboard.
4. **Manual:** Create brief → enter title, findings, sources → Save → mark complete.
5. **AI:** Create brief → AI generate (requires `OPENAI_API_KEY`) → review sources disclaimer → edit → create linked task.
6. Verify filters (type, status, date) and dashboard research count update after create.

Without `OPENAI_API_KEY`, manual brief CRUD and task linking still work.

**Phase 6 (Fundraising Planner)** — see [Phase 6 — Fundraising Planner (M10)](#phase-6--fundraising-planner-m10) below.

## Phase 6 — Fundraising Planner (M10)

M10 replaces the `/fundraising` placeholder with a functional Fundraising Planner:

- **Plan summary:** onboarding `fundraising_goal` plus latest `fundraising_plans` record — goal amount, manually tracked raised amount, progress bar, outreach strategy, and timeline milestones (`timeline_json`).
- **Prospect pipeline:** card grid with filters by status, capacity tier, and related issue; full CRUD for prospects with pipeline statuses (`research` → `donated` / `declined`).
- **Follow-up workflow:** detail view creates a task with `related_prospect_id`; linked task count shown on prospect cards.
- **AI outreach:** `generateProspectOutreach()` drafts email/script and talking points from campaign profile and prospect details; logged to `ai_generation_logs`.
- **Graph:** each prospect creates a `prospect` node linked to candidate (`belongs_to`) and matching issue nodes (`aligns_with`).
- **Dashboard:** Fundraising card shows prospect count, progress % toward goal, and links to `/fundraising`.

Apply migration `011_fundraising_planner.sql` for `raised_amount` on plans and `outreach_history_json` on prospects.

### Testing Fundraising Planner locally

1. Complete onboarding (optional fundraising goal) and apply migration `011_fundraising_planner.sql` to Supabase.
2. Open **Fundraising** from the sidebar or dashboard.
3. **Plan:** Create/edit plan → set goal and raised amounts → add timeline milestones → verify progress bar.
4. **Prospects:** Add prospect → filter by status/capacity/issue → edit status through pipeline → add outreach history.
5. **Tasks:** Open prospect detail → Create follow-up task → verify task on `/tasks` with `related_prospect_id`.
6. **AI:** Draft outreach for a prospect (requires `OPENAI_API_KEY`) → review draft in detail view.
7. Verify dashboard Fundraising card updates prospect count and progress %.
8. Check `graph_nodes` for `prospect` nodes with edges to candidate and issues.

Without `OPENAI_API_KEY`, manual plan and prospect CRUD, task linking, and graph nodes still work.

**Phase 7 (Compliance dashboard)** — see [Phase 7 — Compliance Dashboard (M11)](#phase-7--compliance-dashboard-m11) below.

## Phase 7 — Compliance Dashboard (M11)

M11 replaces the `/compliance` placeholder with a functional Compliance Dashboard:

- **Overview:** summary stats for pending review, flagged, reviewed, and changes-requested counts; filters by status bucket, record type, and date range.
- **Records list:** card grid of `compliance_records` for the active campaign with linked asset title, type, channel, and status badges.
- **Review workflow:** detail dialog shows linked asset preview, auto-generated flags, auto-check results, and reviewer notes. Owner/admin/manager/reviewer roles can mark reviewed, flag for attention, or request changes — syncing `compliance_status` on the linked asset.
- **Auto flags:** asset creation (M7) now seeds `flags_json` and `auto_checks_json` (e.g. AI-generated content, factual-claims verification, disclaimer checks, WA-focused notes).
- **Disclaimer:** prominent banner on `/compliance` — workflow/recordkeeping only, not legal advice; WA state focus note.
- **Dashboard:** Compliance card shows pending review count, amber highlight when items need review, and links to `/compliance`.

Apply migration `012_compliance_dashboard.sql` for `review_notes`, `flags_json`, and `auto_checks_json` columns.

### Testing Compliance Dashboard locally

1. Complete onboarding and apply migration `012_compliance_dashboard.sql` to Supabase.
2. Create assets in Asset Studio (manual or AI) — each asset auto-creates a compliance record.
3. Open **Compliance** from the sidebar or dashboard.
4. Verify overview stats, filters (status, type, date), and record cards with linked asset info.
5. Open a record → review flags and auto-checks → submit review as owner/admin/manager/reviewer.
6. Confirm linked asset `compliance_status` updates in Asset Studio after approve/flag/reject.
7. Verify dashboard Compliance card shows pending count and highlights when review is needed.
8. Confirm viewer/member roles see read-only detail (no review actions).

Without Supabase configured, the page shows the unavailable/onboarding state like other modules.

**Phase 8 (Brain visualization)** can surface compliance-linked assets on the React Flow graph via existing `asset` nodes and the `compliance` graph node type in schema — no heavy new graph work required in M11.

## Phase 8 — Campaign Brain Visualization (M12)

M12 replaces the `/brain` placeholder with an interactive Campaign Brain knowledge graph:

- **React Flow graph (`@xyflow/react`):** fetches `graph_nodes` and `graph_edges` for the active campaign; nodes render as color-coded cards with title, type badge, and summary snippet; edges show relationship labels.
- **Layout:** layered grid by node type (candidate → strategy/issues → module objects); respects `metadata_json` x/y when present.
- **Filters:** toggle by node type (candidate, issue, asset, event, task, research, prospect, etc.), search by title, show/hide edges — all client-side after initial load.
- **Node detail:** click a node to open a side sheet with full summary, type, and deep link to the source module (`/assets`, `/tasks`, `/planner`, `/research`, `/fundraising`).
- **Performance:** displays up to 200 nodes with a warning banner when the graph is larger.
- **Dashboard:** Campaign Brain card shows graph node count and **View Campaign Brain** link when nodes exist.
- **Empty state:** prompts to complete onboarding and generate Campaign Brain when no graph nodes exist.

No new database migrations required — uses existing `graph_nodes`, `graph_edges`, and `metadata_json`.

### Testing Campaign Brain visualization locally

1. Complete onboarding (seeds candidate, issue, and voter segment nodes).
2. Optionally generate Campaign Brain (adds message themes, strategic priorities, and edges).
3. Create assets, events, tasks, research briefs, and prospects — each adds typed graph nodes.
4. Open **Brain** from the sidebar or dashboard **View Campaign Brain** link.
5. Verify filters (node type toggles, search, edge visibility), minimap, zoom controls, and node click detail sheet.
6. Confirm dashboard shows graph node count after onboarding.
7. Check empty state on a fresh campaign with no nodes (or before onboarding completes).

**All 8 build phases are complete** — CampaignOS MVP covers onboarding through compliance and the Campaign Brain visualization.

## Onboarding flow (M4)

| Step | Fields persisted |
| ---- | ---------------- |
| Basics | `campaigns`: candidate, office, jurisdiction, state, district, party, election date |
| Issues | `campaign_profiles.top_issues` |
| Voters | `campaign_profiles.voter_segments` |
| Brand | `campaign_profiles.tone_preferences` |
| Fundraising | `campaign_profiles.fundraising_goal` (optional) |
| Review | Activates campaign (`campaign_status = active`), seeds graph nodes, sets Clerk metadata |

Server actions live in `src/actions/campaigns.ts`. Graph seeding uses `createGraphNode()` in `src/lib/db/graph.ts`.

## Planning docs

Product requirements and overview PDFs are in the repo root for reference.
