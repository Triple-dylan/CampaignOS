/**
 * Demo-mode smoke test for the integration surfaces used by workflow pilots.
 * Run with: INTEGRATIONS_DEMO_MODE=true npx tsx scripts/smoke-integrations.ts
 */
import {
  decryptIntegrationToken,
  encryptIntegrationToken,
  isIntegrationsDemoMode,
} from "../src/lib/integrations/token-crypto";
import { decodeOAuthState, encodeOAuthState } from "../src/lib/integrations/oauth-state";
import {
  buildOAuthAuthorizeUrl,
  integrationOAuthConfigured,
  OAUTH_PROVIDER_CONFIGS,
  oauthRedirectUri,
} from "../src/lib/integrations/oauth-config";
import {
  exportEventToGoogleCalendar,
  importEventsFromGoogleCalendar,
} from "../src/lib/integrations/providers/google-calendar";
import {
  generateFromCanvaTemplate,
  generateFromHiggsfieldTemplate,
} from "../src/lib/integrations/providers/template-generation";
import { SOCIAL_ASSET_TEMPLATES } from "../src/lib/assets/social-templates";
import { knowledgeStorageBackend } from "../src/lib/campaign-knowledge/storage";
import type { DbCalendarEvent } from "../src/lib/db/schema";

let failures = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ok  ${name}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  console.log(`demo mode: ${isIntegrationsDemoMode()}`);
  check("demo mode enabled for this run", isIntegrationsDemoMode());

  // Token crypto roundtrip (base64 fallback without key; AES-GCM with key).
  const secret = "token-abc-123";
  check(
    "token crypto roundtrip",
    decryptIntegrationToken(encryptIntegrationToken(secret)) === secret,
  );

  // OAuth state roundtrip.
  const state = encodeOAuthState({
    organizationId: "org-1",
    provider: "google_calendar",
    userId: "user-1",
    demo: true,
  });
  const decoded = decodeOAuthState(state);
  check(
    "oauth state roundtrip",
    decoded?.organizationId === "org-1" &&
      decoded?.provider === "google_calendar" &&
      decoded?.demo === true,
  );

  // Provider configs are complete and demo mode marks everything configured.
  for (const provider of Object.keys(OAUTH_PROVIDER_CONFIGS) as Array<
    keyof typeof OAUTH_PROVIDER_CONFIGS
  >) {
    const config = OAUTH_PROVIDER_CONFIGS[provider];
    check(
      `${provider} oauth config complete`,
      Boolean(config.authUrl && config.tokenUrl && config.scopes.length > 0),
    );
    check(
      `${provider} configured in demo mode`,
      integrationOAuthConfigured(provider),
    );
    const url = buildOAuthAuthorizeUrl({ provider, state });
    check(
      `${provider} authorize url valid`,
      url.startsWith(config.authUrl) &&
        url.includes(encodeURIComponent(oauthRedirectUri(provider))),
    );
  }

  // Google Calendar demo export/import.
  const demoEvent = {
    id: "evt-1",
    title: "Canvass kickoff",
    description: null,
    location: null,
    start_time: new Date().toISOString(),
    end_time: null,
  } as unknown as DbCalendarEvent;
  const exported = await exportEventToGoogleCalendar({ event: demoEvent });
  check(
    "gcal demo export returns placeholder mapping",
    exported.externalId.startsWith("demo-gcal-") &&
      exported.externalUrl.includes("calendar.google.com"),
  );
  const imported = await importEventsFromGoogleCalendar({});
  check("gcal demo import returns sample events", imported.length > 0);

  // Canva / Higgsfield demo generation.
  const canvaTemplate = SOCIAL_ASSET_TEMPLATES.find((t) => t.provider === "canva");
  const higgsTemplate = SOCIAL_ASSET_TEMPLATES.find(
    (t) => t.provider === "higgsfield",
  );
  check("canva template exists", Boolean(canvaTemplate));
  check("higgsfield template exists", Boolean(higgsTemplate));
  if (canvaTemplate) {
    const generated = await generateFromCanvaTemplate({
      template: canvaTemplate,
      candidateName: "Demo Candidate",
    });
    check(
      "canva demo generation",
      generated.provider === "canva" && Boolean(generated.fileUrl),
    );
  }
  if (higgsTemplate) {
    const generated = await generateFromHiggsfieldTemplate({
      template: higgsTemplate,
      candidateName: "Demo Candidate",
    });
    check(
      "higgsfield demo generation",
      generated.provider === "higgsfield" && Boolean(generated.fileUrl),
    );
  }

  console.log(`knowledge storage backend: ${knowledgeStorageBackend()}`);

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nall integration smoke checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
