# Daily QA loop (CampaignOS)

Handoff area for the **daily review-and-fix loop**. The live runners are GitHub Actions (this agent owns schedules, commits, and merges). Cursor Automations prompts remain available for dashboard use when a Cursor session is present.

| Stage | Workflow | Schedule (UTC) | Writes | Reads |
| ----- | -------- | -------------- | ------ | ----- |
| 1 | `Daily QA — Smoke Loop` | `0 13 * * *` + dispatch | `qa/daily/YYYY-MM-DD/` + draft report PR | Production |
| 2 | `Daily QA — Issue Logger` | after smoke (`workflow_run`) + `0 15 * * *` | GitHub Issues (`automation:qa`, …) | Latest findings |
| 3 | `Daily QA — Review & Fix` | after logger + `0 17 * * *` + label `autofix-candidate` | Issue comments / close / Cursor agent (if `CURSOR_API_KEY`) | Open Issues |

## Labels

Created automatically by `scripts/qa-log-issues.mjs` / `scripts/qa-ensure-labels.sh`.

| Label | Purpose |
| ----- | ------- |
| `automation:qa` | QA loop |
| `severity:*` | critical / high / medium / low |
| `autofix-candidate` | Safe for autofix stage |
| `needs-human` | Do not autofix |

## Manual run

```bash
node scripts/qa-smoke-report.mjs https://campaignos-sigma.vercel.app --loops=3
node scripts/qa-log-issues.mjs
node scripts/qa-review-and-fix.mjs
```

Or: Actions → each workflow → **Run workflow**.

## Cursor Cloud Agent autofix (optional)

Set repository secret `CURSOR_API_KEY` (Cursor Dashboard → API Keys). The review stage then launches a Cloud Agent per candidate issue. Without it, the stage still re-probes, closes resolved issues, and comments.

Setup detail: [`docs/automations/daily-qa-loop.md`](../docs/automations/daily-qa-loop.md).
