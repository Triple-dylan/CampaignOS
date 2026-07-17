import type { IntegrationProvider } from "@/lib/integrations/types";
import { isIntegrationsDemoMode } from "@/lib/integrations/token-crypto";

export type OAuthProviderConfig = {
  provider: IntegrationProvider;
  label: string;
  authUrl: string;
  tokenUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  scopes: string[];
  redirectPath: string;
};

export const OAUTH_PROVIDER_CONFIGS: Record<
  IntegrationProvider,
  OAuthProviderConfig
> = {
  canva: {
    provider: "canva",
    label: "Canva",
    authUrl: "https://www.canva.com/api/oauth/authorize",
    tokenUrl: "https://api.canva.com/rest/v1/oauth/token",
    clientIdEnv: "CANVA_CLIENT_ID",
    clientSecretEnv: "CANVA_CLIENT_SECRET",
    scopes: ["design:content:read", "design:content:write", "brandtemplate:content:read"],
    redirectPath: "/api/integrations/canva/callback",
  },
  higgsfield: {
    provider: "higgsfield",
    label: "Higgsfield",
    authUrl: "https://auth.higgsfield.ai/oauth/authorize",
    tokenUrl: "https://auth.higgsfield.ai/oauth/token",
    clientIdEnv: "HIGGSFIELD_CLIENT_ID",
    clientSecretEnv: "HIGGSFIELD_CLIENT_SECRET",
    scopes: ["generate:media"],
    redirectPath: "/api/integrations/higgsfield/callback",
  },
  google_calendar: {
    provider: "google_calendar",
    label: "Google Calendar",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientIdEnv: "GOOGLE_CALENDAR_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CALENDAR_CLIENT_SECRET",
    scopes: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
    redirectPath: "/api/integrations/google_calendar/callback",
  },
  gmail: {
    provider: "gmail",
    label: "Gmail",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientIdEnv: "GMAIL_CLIENT_ID",
    clientSecretEnv: "GMAIL_CLIENT_SECRET",
    scopes: ["https://www.googleapis.com/auth/gmail.send"],
    redirectPath: "/api/integrations/gmail/callback",
  },
};

/** True when this provider's client id/secret env vars are set (ignores demo mode). */
export function providerCredentialsPresent(
  provider: IntegrationProvider,
): boolean {
  const config = OAUTH_PROVIDER_CONFIGS[provider];
  return Boolean(
    process.env[config.clientIdEnv]?.trim() &&
      process.env[config.clientSecretEnv]?.trim(),
  );
}

export function integrationOAuthConfigured(provider: IntegrationProvider): boolean {
  if (isIntegrationsDemoMode()) {
    return true;
  }
  return providerCredentialsPresent(provider);
}

export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim()?.replace(/^/, "https://") ||
    "http://localhost:3000"
  );
}

export function oauthRedirectUri(provider: IntegrationProvider): string {
  const config = OAUTH_PROVIDER_CONFIGS[provider];
  return `${appBaseUrl()}${config.redirectPath}`;
}

export function buildOAuthAuthorizeUrl(input: {
  provider: IntegrationProvider;
  state: string;
}): string {
  const config = OAUTH_PROVIDER_CONFIGS[input.provider];
  const clientId = process.env[config.clientIdEnv]?.trim() ?? "demo";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: oauthRedirectUri(input.provider),
    response_type: "code",
    scope: config.scopes.join(" "),
    state: input.state,
    access_type: "offline",
    prompt: "consent",
  });
  return `${config.authUrl}?${params.toString()}`;
}
