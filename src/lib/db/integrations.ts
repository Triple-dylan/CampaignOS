import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import {
  decryptIntegrationToken,
  encryptIntegrationToken,
} from "@/lib/integrations/token-crypto";
import type {
  ExternalMapping,
  IntegrationProvider,
  IntegrationStatus,
  OrganizationIntegration,
} from "@/lib/integrations/types";
import { z } from "zod";

const integrationProviderSchema = z.enum([
  "canva",
  "higgsfield",
  "google_calendar",
  "gmail",
]);

const integrationStatusSchema = z.enum([
  "disconnected",
  "connected",
  "error",
  "expired",
]);

function mapIntegration(row: Record<string, unknown>): OrganizationIntegration {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    provider: row.provider as IntegrationProvider,
    status: row.status as IntegrationStatus,
    scopes: (row.scopes as string[]) ?? [],
    expiresAt: (row.expires_at as string | null) ?? null,
    connectedBy: (row.connected_by as string | null) ?? null,
    metadata: (row.metadata_json as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapExternalMapping(row: Record<string, unknown>): ExternalMapping {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    provider: row.provider as IntegrationProvider,
    localObjectType: row.local_object_type as string,
    localObjectId: row.local_object_id as string,
    externalId: row.external_id as string,
    externalUrl: (row.external_url as string | null) ?? null,
    metadata: (row.metadata_json as Record<string, unknown>) ?? {},
  };
}

export async function listOrganizationIntegrations(
  organizationId: string,
): Promise<OrganizationIntegration[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("organization_integrations")
    .select("*")
    .eq("organization_id", organizationId)
    .order("provider");

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapIntegration(row));
}

export async function getOrganizationIntegration(input: {
  organizationId: string;
  provider: IntegrationProvider;
}): Promise<
  (OrganizationIntegration & { accessToken?: string; refreshToken?: string }) | null
> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("organization_integrations")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("provider", input.provider)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const integration = mapIntegration(data);
  const accessTokenEncrypted = data.access_token_encrypted as string | null;
  const refreshTokenEncrypted = data.refresh_token_encrypted as string | null;
  return {
    ...integration,
    accessToken: accessTokenEncrypted
      ? decryptIntegrationToken(accessTokenEncrypted)
      : undefined,
    refreshToken: refreshTokenEncrypted
      ? decryptIntegrationToken(refreshTokenEncrypted)
      : undefined,
  };
}

export async function upsertOrganizationIntegration(input: {
  organizationId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  scopes?: string[];
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: string | null;
  connectedBy?: string | null;
  metadata?: Record<string, unknown>;
}) {
  integrationProviderSchema.parse(input.provider);
  integrationStatusSchema.parse(input.status);

  if (!isSupabaseConfigured()) {
    return { synced: false as const, integration: null };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("organization_integrations")
    .upsert(
      {
        organization_id: input.organizationId,
        provider: input.provider,
        status: input.status,
        scopes: input.scopes ?? [],
        access_token_encrypted: input.accessToken
          ? encryptIntegrationToken(input.accessToken)
          : null,
        refresh_token_encrypted: input.refreshToken
          ? encryptIntegrationToken(input.refreshToken)
          : null,
        expires_at: input.expiresAt ?? null,
        connected_by: input.connectedBy ?? null,
        metadata_json: input.metadata ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,provider" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    integration: mapIntegration(data),
  };
}

export async function disconnectOrganizationIntegration(input: {
  organizationId: string;
  provider: IntegrationProvider;
}) {
  return upsertOrganizationIntegration({
    organizationId: input.organizationId,
    provider: input.provider,
    status: "disconnected",
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    scopes: [],
    metadata: {},
  });
}

export async function upsertExternalMapping(input: {
  organizationId: string;
  provider: IntegrationProvider;
  localObjectType: string;
  localObjectId: string;
  externalId: string;
  externalUrl?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (!isSupabaseConfigured()) {
    return { synced: false as const, mapping: null };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("integration_external_mappings")
    .upsert(
      {
        organization_id: input.organizationId,
        provider: input.provider,
        local_object_type: input.localObjectType,
        local_object_id: input.localObjectId,
        external_id: input.externalId,
        external_url: input.externalUrl ?? null,
        metadata_json: input.metadata ?? {},
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "organization_id,provider,local_object_type,local_object_id",
      },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    mapping: mapExternalMapping(data),
  };
}

export async function listExternalMappings(input: {
  organizationId: string;
  provider: IntegrationProvider;
  localObjectType?: string;
}): Promise<ExternalMapping[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("integration_external_mappings")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("provider", input.provider);

  if (input.localObjectType) {
    query = query.eq("local_object_type", input.localObjectType);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapExternalMapping(row));
}
