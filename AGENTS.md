<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

CampaignOS is a single Next.js 16 (App Router, Turbopack) app — no monorepo. Auth is Clerk, with optional Supabase (Postgres) and optional OpenAI. The update script already runs `pnpm install`; the notes below are the non-obvious gotchas for running it here. Standard commands live in `package.json`/`README.md` (`pnpm dev` binds `0.0.0.0`, plus `pnpm lint` / `pnpm typecheck` / `pnpm build` / `pnpm start`).

- **A `.env.local` is required to boot** (it is gitignored, so it is NOT restored on a fresh VM — recreate it). Copy `.env.example` and set at minimum `NEXT_PUBLIC_APP_URL=http://localhost:3000` and `CAMPAIGN_KNOWLEDGE_STORAGE=local` (avoids Supabase for the knowledge tree).
- **Clerk: use keyless mode; do NOT set a placeholder key.** Leave `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` UNSET. Clerk 7 then runs in keyless dev mode, auto-provisions a real dev instance (needs outbound network), and writes `.clerk/`. The CI placeholder key (`pk_test_…`) compiles fine but is rejected at runtime — the browser 500s / redirects to `example.clerk.accounts.dev`. Set real Clerk keys only if you have them.
- **Auth-free way to see the product:** `/preview/workspace` (and `/preview/module`) render the full workspace shell + campaign knowledge graph from static demo data — no Clerk login, Supabase, or OpenAI needed. This is the fastest end-to-end smoke test. These routes 404 in production (`next start`) unless `ALLOW_WORKSPACE_PREVIEW=1`.
- **Keyless caveat in the workspace:** an "Organizations feature required" modal pops up (the app uses Clerk Organizations, which keyless dev instances don't enable by default). Dismiss it with "I'll remove it myself" to reach the UI, or enable Organizations in the claimed Clerk dashboard.
- **Middleware lives in `src/proxy.ts`** (this Next.js version uses `proxy.ts`, not `middleware.ts`). Public routes: `/`, `/sign-in`, `/sign-up`, `/preview`, `/api/health`, `/api/webhooks/clerk`. All other routes (`/dashboard`, `/onboarding`, …) redirect to `/sign-in` when unauthenticated.
- **Supabase/OpenAI are optional.** Without Supabase, protected module pages show onboarding/unavailable states and webhooks only validate+log; without `OPENAI_API_KEY`, Campaign Brain / AI generation buttons stay disabled. Everything else works.
- `pnpm lint` currently reports 2 pre-existing warnings (0 errors) in `workspace-graph-canvas.tsx` — not introduced by your change.
