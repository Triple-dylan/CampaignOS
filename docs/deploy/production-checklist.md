# Production deployment checklist (CampaignOS)

Production URL: **https://campaignos-sigma.vercel.app**

Vercel project: **dylan-dahls-projects/campaignos** (`prj_drnEnHcc8oCArW8f9lT8doZk61tM`)

GitHub repo: **https://github.com/Triple-dylan/CampaignOS**

---

## Automation status (2026-06-30)

| Step | Status |
|------|--------|
| Vercel CLI auth | Logged in as **triple-dylan** (`VERCEL_TOKEN` not set locally; CLI session used) |
| Production Clerk env on Vercel | **Synced** from `.env.local` via `vercel env add` (keys are still **`pk_test` / `sk_test`**) |
| `NEXT_PUBLIC_APP_URL` (Production) | **`https://campaignos-sigma.vercel.app`** |
| Clerk paths on Vercel | `/sign-in`, `/sign-up`, after sign-in/up `/auth/after-sign-in`, sign-out `/` |
| Clerk Backend API | **`PATCH /v1/instance`** — `allowed_origins` includes `https://campaignos-sigma.vercel.app` |
| Clerk redirect URLs (API) | Added `https://campaignos-sigma.vercel.app` and `…/auth/after-sign-in` |
| `CLERK_WEBHOOK_SECRET` (Production) | **Not set** — empty in `.env.local`; configure in Clerk + Vercel when webhooks are needed |
| Production redeploy | **`vercel deploy --prod`** (deployment `dpl_8TVmpGDmLUBSzkqfjazbxvBsQBQu`) |
| Post-deploy smoke | `/` **200**, `/sign-in` **200**, `/dashboard` (signed out) **307** → `/sign-in` |
| Code: `src/proxy.ts` | Uses `NEXT_PUBLIC_CLERK_SIGN_IN_URL` for `auth.protect` redirect (no change required) |

**Auth on production today:** Works for **development** Clerk keys with Vercel hostname allowed via API. For a true production Clerk instance (stricter cookies, live billing, etc.), you still need **`pk_live` / `sk_live`** in Vercel (see below).

---

## Vercel — Git integration & deploy author

### GitHub auto-deploy

1. Open [Vercel → campaignos → Settings → Git](https://vercel.com/dylan-dahls-projects/campaignos/settings/git).
2. Confirm **Connected Git Repository** shows `Triple-dylan/CampaignOS` (connected via `vercel git connect` on 2026-07-01).
3. Ensure **Production Branch** is `main`.

### `TEAM_ACCESS_REQUIRED` / git author

Git-triggered deploys fail when the **commit author email** is not a member of the Vercel team (e.g. `dev@campaignos.app`).

**Fix (repo-level, already applied in this repo):**

```bash
git config --local user.email "YOUR_GITHUB_VERIFIED_EMAIL"
git config --local user.name "Your Name"
```

Use an email that is:

- Verified on GitHub ([GitHub → Settings → Emails](https://github.com/settings/emails)), and
- Linked to your Vercel account ([Vercel → Account → Email](https://vercel.com/account)).

Do **not** change global git config (`~/.gitconfig`) unless you intend to for all repos.

**Alternative:** deploy without Git author checks:

```bash
npx vercel@latest deploy --prod
```

### Production environment variables

Confirm in [Vercel → campaignos → Settings → Environment Variables](https://vercel.com/dylan-dahls-projects/campaignos/settings/environment-variables) (Production):

| Variable | Expected |
|----------|----------|
| `NEXT_PUBLIC_APP_URL` | `https://campaignos-sigma.vercel.app` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/auth/after-sign-in` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/auth/after-sign-in` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL` | `/` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **`pk_live_…`** for long-term production (currently **`pk_test_…`** if using dev instance) |
| `CLERK_SECRET_KEY` | **`sk_live_…`** for long-term production (currently **`sk_test_…`** if using dev instance) |
| `CLERK_WEBHOOK_SECRET` | From Clerk webhook endpoint (not set yet) |
| Supabase vars | Production project keys |
| `CRON_SECRET` | Random secret for `GET /api/cron/workflows` (Vercel Cron sends `Authorization: Bearer …`) |

After changing env vars, redeploy Production (Git push or `npx vercel@latest deploy --prod`).

---

## Clerk — production domain & keys

### Symptom (historical)

Unauthenticated `GET /dashboard` could return **404** with headers such as:

- `x-clerk-auth-status: signed-out`
- `x-clerk-auth-reason: protect-rewrite, dev-browser-missing`

This happened when Production used **development** Clerk keys (`pk_test_` / `sk_test_`) and/or the Vercel hostname was not allowed in Clerk.

### Automated via Clerk Backend API (2026-06-30)

With a valid `CLERK_SECRET_KEY`, the following were applied programmatically:

- Instance `allowed_origins`: `https://campaignos-sigma.vercel.app`
- Redirect URLs: production origin and `/auth/after-sign-in`

Re-run only if you create a new Clerk application or change domains.

### Still requires Clerk dashboard (minimal)

1. **Production instance (recommended)** — [Clerk → API Keys](https://dashboard.clerk.com/last-active?path=api-keys): switch to **Production**, copy **`pk_live_…`** / **`sk_live_…`**, update Vercel Production env, redeploy.
2. **Webhooks** (org sync) — [Clerk → Webhooks](https://dashboard.clerk.com/last-active?path=webhooks): endpoint `https://campaignos-sigma.vercel.app/api/webhooks/clerk`, then set `CLERK_WEBHOOK_SECRET` on Vercel.
3. **Custom domain** (later): add domain in Clerk **Domains** when you attach a non-`*.vercel.app` hostname.

### Paths (match `.env.example`)

- Sign-in URL: `/sign-in`
- Sign-up URL: `/sign-up`
- After sign-in / sign-up: `/auth/after-sign-in`

### Expected behavior after fix

- `/`, `/sign-in`, `/api/health` — **200** (unchanged).
- `/dashboard` when signed out — **302/307** to `/sign-in` (not 404).

---

## Post-deploy smoke test

```bash
curl -sS -o /dev/null -w "home:%{http_code}\n" https://campaignos-sigma.vercel.app/
curl -sS -o /dev/null -w "sign-in:%{http_code}\n" https://campaignos-sigma.vercel.app/sign-in
curl -sS https://campaignos-sigma.vercel.app/api/health
curl -sSI https://campaignos-sigma.vercel.app/dashboard | grep -E '^(HTTP|location|x-clerk-auth)'
```

---

## Local vs production

- `.env.local` is for local dev only; never commit secrets.
- `NEXT_PUBLIC_APP_URL` in Production must match the Vercel URL (or custom domain) so Clerk redirects and absolute links resolve correctly.
