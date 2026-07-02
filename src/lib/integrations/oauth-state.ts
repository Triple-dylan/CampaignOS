import { createHmac, randomBytes } from "node:crypto";
import type { IntegrationProvider } from "@/lib/integrations/types";

type OAuthStatePayload = {
  organizationId: string;
  provider: IntegrationProvider;
  userId: string | null;
  nonce: string;
  demo?: boolean;
};

function stateSecret(): string {
  return (
    process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY?.trim() ||
    process.env.CLERK_SECRET_KEY?.trim() ||
    "campaignos-integration-state-dev"
  );
}

export function encodeOAuthState(payload: Omit<OAuthStatePayload, "nonce">): string {
  const full: OAuthStatePayload = {
    ...payload,
    nonce: randomBytes(8).toString("hex"),
  };
  const body = Buffer.from(JSON.stringify(full), "utf8").toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function decodeOAuthState(state: string): OAuthStatePayload | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  if (sig !== expected) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OAuthStatePayload;
  } catch {
    return null;
  }
}
