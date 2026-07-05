# Integrations: pilot-testing readiness

Status of every integration surface, what works today in demo mode, and what
each provider needs before pilots run against real accounts.

Run the smoke test anytime:

```bash
INTEGRATIONS_DEMO_MODE=true npx tsx scripts/smoke-integrations.ts
```

## How the plumbing works

- OAuth connect/callback routes: `/api/integrations/[provider]/connect` and
  `/api/integrations/[provider]/callback` (all four providers).
- Tokens are AES-256-GCM encrypted at rest when
  `INTEGRATION_TOKEN_ENCRYPTION_KEY` is set (base64 fallback otherwise — set
  the key before any real pilot).
- Expired Google access tokens are refreshed transparently via
  `getFreshIntegrationAccessToken` (uses the stored refresh token, marks the
  integration `expired` if refresh fails).
- With `INTEGRATIONS_DEMO_MODE=true`, connect buttons simulate OAuth and all
  provider calls return realistic placeholders — full workflow loops
  (chat → generate → store → sync) can be piloted without any real keys.

## Provider status

| Provider | Demo mode | Real-key readiness |
| --- | --- | --- |
| Google Calendar | Export/import return placeholders | **Ready.** Set `GOOGLE_CALENDAR_CLIENT_ID/SECRET`, add the callback URL to the Google Cloud OAuth client, connect in Settings. Export/import + token refresh are implemented. |
| Gmail | Connect flow simulated | **OAuth ready, sender not built.** Set `GMAIL_CLIENT_ID/SECRET`. The scope (`gmail.send`) and token handling are wired; the outreach-draft send action is the remaining work. |
| Canva | Placeholder graphics via placehold.co | **OAuth ready, autofill not built.** Set `CANVA_CLIENT_ID/SECRET`. Real generation requires implementing Canva Autofill + Export API calls in `template-generation.ts`. |
| Higgsfield | Placeholder renders | **OAuth ready, generation not built.** Set `HIGGSFIELD_CLIENT_ID/SECRET`; real MCP generation calls still need implementing. |
| Claude / OpenAI models | n/a | Configured separately via `ANTHROPIC_API_KEY` / model envs used by the chat actions. |

## Wiring fixed in this pass

- Gmail was registered in OAuth config and routes but invisible in Settings —
  it now appears with connect/disconnect.
- `getIntegrationConnectUrl` pointed at `localhost` when `NEXT_PUBLIC_APP_URL`
  was unset; it now falls back to the deployment URL (`VERCEL_URL`).
- Google access tokens (1-hour lifetime) were used until they silently
  expired; calendar export/import and Canva/Higgsfield generation now refresh
  through `getFreshIntegrationAccessToken`.

## Environment checklist for a real-key pilot

```bash
INTEGRATIONS_DEMO_MODE=false
INTEGRATION_TOKEN_ENCRYPTION_KEY=<long random string>
NEXT_PUBLIC_APP_URL=https://<your-deployment>
GOOGLE_CALENDAR_CLIENT_ID=...
GOOGLE_CALENDAR_CLIENT_SECRET=...
# optional, per provider being piloted:
GMAIL_CLIENT_ID=... / GMAIL_CLIENT_SECRET=...
CANVA_CLIENT_ID=... / CANVA_CLIENT_SECRET=...
HIGGSFIELD_CLIENT_ID=... / HIGGSFIELD_CLIENT_SECRET=...
```

## Campaign knowledge storage

The file/folder base behind the context graph now has two interchangeable
backends (`src/lib/campaign-knowledge/storage.ts`):

- **Supabase Storage** (default when Supabase is configured): the canonical
  cloud store, bucket `campaign-knowledge`, keyed by org/campaign. Survives
  serverless deploys.
- **Local files** (`CAMPAIGN_KNOWLEDGE_STORAGE=local`): plain markdown under
  the project root — local-first development or self-hosted use.

Users can download the whole tree from Settings → Campaign knowledge (zip via
`/api/knowledge/export`) to keep a local copy or seed their own cloud folder.
A Google Drive sync mirror is the planned follow-up.
