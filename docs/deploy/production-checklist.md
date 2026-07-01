# Production deployment checklist (CampaignOS)

Production URL: **https://campaignos-sigma.vercel.app**

Vercel project: **dylan-dahls-projects/campaignos** (`prj_drnEnHcc8oCArW8f9lT8doZk61tM`)

GitHub repo: **https://github.com/Triple-dylan/CampaignOS**

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
vercel deploy --prod
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
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **`pk_live_…`** (not `pk_test_…`) |
| `CLERK_SECRET_KEY` | **`sk_live_…`** (not `sk_test_…`) |
| Supabase vars | Production project keys |

After changing env vars, redeploy Production (Git push or `vercel deploy --prod`).

---

## Clerk — production domain & keys

### Symptom

Unauthenticated `GET /dashboard` returns **404** with headers such as:

- `x-clerk-auth-status: signed-out`
- `x-clerk-auth-reason: protect-rewrite, dev-browser-missing`

This happens when Production uses **development** Clerk keys (`pk_test_` / `sk_test_`) and/or the Vercel hostname is not allowed in Clerk.

### Required dashboard steps

1. **Domains** — [Clerk Dashboard → Configure → Domains](https://dashboard.clerk.com/last-active?path=domains):
   - Add **`campaignos-sigma.vercel.app`** (and any custom domain later).
   - For development instances, add the hostname under allowed origins / satellite domains per Clerk’s prompt for your plan.

2. **Production instance** — [Clerk Dashboard → API Keys](https://dashboard.clerk.com/last-active?path=api-keys):
   - Switch to **Production**.
   - Copy **Publishable key** (`pk_live_…`) and **Secret key** (`sk_live_…`).
   - Update Vercel Production env vars (see table above). Redeploy.

3. **Paths** (usually match `.env.example`):
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in / sign-up: `/auth/after-sign-in`

4. **Webhooks** (org sync) — [Clerk → Webhooks](https://dashboard.clerk.com/last-active?path=webhooks):
   - Endpoint: `https://campaignos-sigma.vercel.app/api/webhooks/clerk`
   - Set `CLERK_WEBHOOK_SECRET` in Vercel Production.

### Expected behavior after fix

- `/`, `/sign-in`, `/api/health` — **200** (unchanged).
- `/dashboard` when signed out — **302/307** to `/sign-in` (not 404).

---

## Post-deploy smoke test

```bash
curl -sS -o /dev/null -w "home:%{http_code}\n" https://campaignos-sigma.vercel.app/
curl -sS -o /dev/null -w "sign-in:%{http_code}\n" https://campaignos-sigma.vercel.app/sign-in
curl -sS https://campaignos-sigma.vercel.app/api/health
curl -sSI https://campaignos-sigma.vercel.app/dashboard | grep -E '^(HTTP|x-clerk-auth)'
```

---

## Local vs production

- `.env.local` is for local dev only; never commit secrets.
- `NEXT_PUBLIC_APP_URL` in Production must match the Vercel URL (or custom domain) so Clerk redirects and absolute links resolve correctly.
