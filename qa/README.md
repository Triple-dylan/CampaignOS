# Daily QA loop (CampaignOS)

Handoff area for three Cursor Automations that form a daily review-and-fix loop.

| Stage | Automation | Schedule (UTC) | Writes | Reads |
| ----- | ---------- | -------------- | ------ | ----- |
| 1 | Daily Smoke Loop | `0 13 * * *` (13:00) | `qa/daily/YYYY-MM-DD/smoke-report.md` + `findings.json` | Production + local app |
| 2 | Daily Issue Logger | `0 15 * * *` (15:00) | GitHub Issues (`automation:qa`, …) | Latest `qa/daily/*/findings.json` |
| 3 | Daily Review & Fix | `0 17 * * *` (17:00) + label `autofix-candidate` | Draft PRs closing/linking issues | Open GitHub Issues |

Cross-automation state lives here and in GitHub Issues — not in Memories (Memories are per-automation only).

## Labels (create once in GitHub)

| Label | Color | Purpose |
| ----- | ----- | ------- |
| `automation:qa` | `#0E8A16` | Created/managed by the QA loop |
| `severity:critical` | `#B60205` | Blocks core flows / data loss / auth break |
| `severity:high` | `#D93F0B` | Major broken feature |
| `severity:medium` | `#FBCA04` | Degraded UX / recoverable error |
| `severity:low` | `#C5DEF5` | Cosmetic / minor |
| `autofix-candidate` | `#5319E7` | Logger thinks a small, high-confidence fix is possible |
| `needs-human` | `#E99695` | Ambiguous, product, or risky — do not autofix |

Create with:

```bash
gh label create "automation:qa" --color "0E8A16" --description "QA automation loop"
gh label create "severity:critical" --color "B60205" --description "Critical QA finding"
gh label create "severity:high" --color "D93F0B" --description "High severity QA finding"
gh label create "severity:medium" --color "FBCA04" --description "Medium severity QA finding"
gh label create "severity:low" --color "C5DEF5" --description "Low severity QA finding"
gh label create "autofix-candidate" --color "5319E7" --description "Safe for daily autofix automation"
gh label create "needs-human" --color "E99695" --description "Requires human judgment"
```

## Quick start

1. Merge this PR (or copy prompts from `docs/automations/`).
2. Create the labels above.
3. Open [cursor.com/automations/new](https://cursor.com/automations/new) three times and paste each prompt from `docs/automations/prompts/`.
4. For each: set **repository** to `triple-dylan/campaignos` / `main`, enable **Computer use**, **PR creation** (stage 3), and **Memories**.
5. Activate.

Full setup: [`docs/automations/daily-qa-loop.md`](../docs/automations/daily-qa-loop.md).
