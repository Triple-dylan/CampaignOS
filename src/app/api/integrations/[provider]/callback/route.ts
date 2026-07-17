import { NextResponse } from "next/server";
import { upsertOrganizationIntegration } from "@/lib/db/integrations";
import {
  oauthRedirectUri,
  OAUTH_PROVIDER_CONFIGS,
} from "@/lib/integrations/oauth-config";
import { decodeOAuthState } from "@/lib/integrations/oauth-state";
import type { IntegrationProvider } from "@/lib/integrations/types";
import { isIntegrationsDemoMode } from "@/lib/integrations/token-crypto";

const VALID_PROVIDERS = new Set<IntegrationProvider>([
  "canva",
  "higgsfield",
  "google_calendar",
  "gmail",
]);

function settingsRedirect(provider: IntegrationProvider, result: "success" | "error") {
  const url = new URL("/settings", oauthRedirectUri(provider));
  url.searchParams.set("tab", "integrations");
  url.searchParams.set("integration", provider);
  url.searchParams.set("result", result);
  return NextResponse.redirect(url);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: rawProvider } = await context.params;
  const provider = VALID_PROVIDERS.has(rawProvider as IntegrationProvider)
    ? (rawProvider as IntegrationProvider)
    : null;

  if (!provider) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  const url = new URL(request.url);
  const stateRaw = url.searchParams.get("state");
  if (!stateRaw) {
    return settingsRedirect(provider, "error");
  }

  const state = decodeOAuthState(stateRaw);
  if (!state || state.provider !== provider) {
    return settingsRedirect(provider, "error");
  }

  const demo =
    url.searchParams.get("demo") === "1" ||
    state.demo ||
    isIntegrationsDemoMode();

  try {
    if (demo) {
      await upsertOrganizationIntegration({
        organizationId: state.organizationId,
        provider,
        status: "connected",
        accessToken: `demo-token-${provider}`,
        refreshToken: null,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        connectedBy: state.userId,
        scopes: OAUTH_PROVIDER_CONFIGS[provider].scopes,
        metadata: { mode: "demo" },
      });
      return settingsRedirect(provider, "success");
    }

    const code = url.searchParams.get("code");
    if (!code) {
      return settingsRedirect(provider, "error");
    }

    const config = OAUTH_PROVIDER_CONFIGS[provider];
    const clientId = process.env[config.clientIdEnv]?.trim();
    const clientSecret = process.env[config.clientSecretEnv]?.trim();
    if (!clientId || !clientSecret) {
      return settingsRedirect(provider, "error");
    }

    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: oauthRedirectUri(provider),
      }),
    });

    if (!tokenResponse.ok) {
      return settingsRedirect(provider, "error");
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    await upsertOrganizationIntegration({
      organizationId: state.organizationId,
      provider,
      status: "connected",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt,
      connectedBy: state.userId,
      scopes: tokens.scope?.split(" ") ?? config.scopes,
      metadata: { mode: "oauth" },
    });

    return settingsRedirect(provider, "success");
  } catch {
    return settingsRedirect(provider, "error");
  }
}
