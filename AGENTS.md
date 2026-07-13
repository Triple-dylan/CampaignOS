<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CampaignOS cloud / automation notes

## Daily QA loop

Three Cursor Automations own the daily review-and-fix loop. Specs live in `docs/automations/daily-qa-loop.md` and prompts in `docs/automations/prompts/`.

Handoff files: `qa/daily/YYYY-MM-DD/{smoke-report.md,findings.json}` (schema: `qa/findings.schema.json`). Cross-automation state uses those files + GitHub Issues (`automation:qa`), not Memories across different automations.

### Commands agents should know

- Public smoke: `./scripts/qa-public-smoke.sh [BASE_URL]` (default production `https://campaignos-sigma.vercel.app`)
- Quality: `pnpm lint`, `pnpm typecheck`, `pnpm build`
- Dev server: `pnpm dev` (hostname `0.0.0.0`)

### Production

- App: https://campaignos-sigma.vercel.app
- Supabase project ref (linked): see `supabase/.temp/project-ref`
