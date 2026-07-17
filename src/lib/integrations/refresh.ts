import {
  getOrganizationIntegration,
  upsertOrganizationIntegration,
} from "@/lib/db/integrations";
import { OAUTH_PROVIDER_CONFIGS } from "@/lib/integrations/oauth-config";
import { isIntegrationsDemoMode } from "@/lib/integrations/token-crypto";
import type {
  IntegrationProvider,
  OrganizationIntegration,
} from "@/lib/integrations/types";

const EXPIRY_SLACK_MS = 60_000;

export function isDemoIntegrationConnection(
  integration: Pick<OrganizationIntegration, "metadata"> & {
    accessToken?: string;
  },
): boolean {
  if (isIntegrationsDemoMode()) {
    return true;
  }
  if (integration.metadata?.mode === "demo") {
    return true;
  }
  return Boolean(integration.accessToken?.startsWith("demo-token-"));
}

/**
 * Returns a usable access token for a connected integration, transparently
 * refreshing expired OAuth tokens (Google access tokens last ~1 hour). In demo
 * mode returns undefined so providers fall back to simulated responses.
 */
export async function getFreshIntegrationAccessToken(input: {
  organizationId: string;
  provider: IntegrationProvider;
}): Promise<string | undefined> {
  if (isIntegrationsDemoMode()) {
    return undefined;
  }

  const integration = await getOrganizationIntegration(input);
  if (!integration || integration.status !== "connected") {
    return undefined;
  }

  // Simulated connections must not be sent to real provider APIs.
  if (isDemoIntegrationConnection(integration)) {
    return undefined;
  }

  const expiresAtMs = integration.expiresAt
    ? new Date(integration.expiresAt).getTime()
    : null;
  const stillValid =
    expiresAtMs === null || expiresAtMs - EXPIRY_SLACK_MS > Date.now();

  if (stillValid && integration.accessToken) {
    return integration.accessToken;
  }

  if (!integration.refreshToken) {
    return integration.accessToken;
  }

  const config = OAUTH_PROVIDER_CONFIGS[input.provider];
  const clientId = process.env[config.clientIdEnv]?.trim();
  const clientSecret = process.env[config.clientSecretEnv]?.trim();
  if (!clientId || !clientSecret) {
    return integration.accessToken;
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: integration.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    await upsertOrganizationIntegration({
      organizationId: input.organizationId,
      provider: input.provider,
      status: "expired",
      accessToken: null,
      refreshToken: integration.refreshToken,
      expiresAt: integration.expiresAt,
      scopes: integration.scopes,
      metadata: integration.metadata,
    });
    return undefined;
  }

  const tokens = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  await upsertOrganizationIntegration({
    organizationId: input.organizationId,
    provider: input.provider,
    status: "connected",
    accessToken: tokens.access_token,
    // Google only returns a new refresh token sometimes; keep the old one.
    refreshToken: tokens.refresh_token ?? integration.refreshToken,
    expiresAt,
    scopes: integration.scopes,
    metadata: integration.metadata,
  });

  return tokens.access_token;
}
