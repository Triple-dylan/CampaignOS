export type IntegrationProvider =
  | "canva"
  | "higgsfield"
  | "google_calendar"
  | "gmail";

export type IntegrationStatus =
  | "disconnected"
  | "connected"
  | "error"
  | "expired";

export type OrganizationIntegration = {
  id: string;
  organizationId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  scopes: string[];
  expiresAt: string | null;
  connectedBy: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ExternalMapping = {
  id: string;
  organizationId: string;
  provider: IntegrationProvider;
  localObjectType: string;
  localObjectId: string;
  externalId: string;
  externalUrl: string | null;
  metadata: Record<string, unknown>;
};
