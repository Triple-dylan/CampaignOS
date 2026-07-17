import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureOrganizationSynced } from "@/actions/organizations";
import {
  appBaseUrl,
  buildOAuthAuthorizeUrl,
  oauthRedirectUri,
  providerCredentialsPresent,
} from "@/lib/integrations/oauth-config";
import { encodeOAuthState } from "@/lib/integrations/oauth-state";
import type { IntegrationProvider } from "@/lib/integrations/types";
import { isIntegrationsDemoMode } from "@/lib/integrations/token-crypto";
import { getUserByClerkId } from "@/lib/db/users";

const VALID_PROVIDERS = new Set<IntegrationProvider>([
  "canva",
  "higgsfield",
  "google_calendar",
  "gmail",
]);

function parseProvider(value: string): IntegrationProvider | null {
  return VALID_PROVIDERS.has(value as IntegrationProvider)
    ? (value as IntegrationProvider)
    : null;
}

function settingsIntegrationsRedirect(
  params: Record<string, string>,
): NextResponse {
  const url = new URL("/settings", appBaseUrl());
  url.searchParams.set("tab", "integrations");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: rawProvider } = await context.params;
  const provider = parseProvider(rawProvider);
  if (!provider) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", appBaseUrl()));
  }

  const sync = await ensureOrganizationSynced();
  if (!sync.ok || !sync.organizationId) {
    return settingsIntegrationsRedirect({
      integration: "org_error",
      result: "error",
    });
  }

  const demoMode = isIntegrationsDemoMode();
  const hasCredentials = providerCredentialsPresent(provider);

  if (!demoMode && !hasCredentials) {
    return settingsIntegrationsRedirect({
      integration: provider,
      result: "error",
      reason: "not_configured",
    });
  }

  const dbUser = await getUserByClerkId(userId);
  const state = encodeOAuthState({
    organizationId: sync.organizationId,
    provider,
    userId: dbUser?.id ?? null,
    demo: demoMode || !hasCredentials,
  });

  if (demoMode || !hasCredentials) {
    const callback = new URL(oauthRedirectUri(provider));
    callback.searchParams.set("state", state);
    callback.searchParams.set("demo", "1");
    return NextResponse.redirect(callback);
  }

  const authorizeUrl = buildOAuthAuthorizeUrl({ provider, state });
  return NextResponse.redirect(authorizeUrl);
}
