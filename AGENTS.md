<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CampaignOS cloud / automation notes

## Daily QA loop

GitHub Actions on `main` run the daily review-and-fix loop (smoke → issues → review). Specs: `docs/automations/daily-qa-loop.md`. Prompts under `docs/automations/prompts/` mirror the same stages.

- Workflows: `daily-qa-smoke.yml`, `daily-qa-issue-logger.yml`, `daily-qa-review-fix.yml`
- Handoff: `qa/daily/YYYY-MM-DD/{smoke-report.md,findings.json}` (schema: `qa/findings.schema.json`) + GitHub Issues (`automation:qa`)

### Commands agents should know

- Public smoke: `./scripts/qa-public-smoke.sh [BASE_URL]` (default production `https://campaignos-sigma.vercel.app`)
- Report loops: `node scripts/qa-smoke-report.mjs [BASE_URL] --loops=3`
- Log issues: `node scripts/qa-log-issues.mjs`
- Review/fix: `node scripts/qa-review-and-fix.mjs`
- Quality: `pnpm lint`, `pnpm typecheck`, `pnpm build`
- Dev server: `pnpm dev` (hostname `0.0.0.0`)

### Production

- App: https://campaignos-sigma.vercel.app
- Supabase project ref (linked): see `supabase/.temp/project-ref`
