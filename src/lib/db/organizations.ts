import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import type { DbOrganization } from "@/lib/db/schema";
import { requireUserByClerkId } from "@/lib/db/users";
import {
  upsertOrganizationSchema,
  type UpsertOrganizationInput,
} from "@/lib/validators/organizations";

export type ClerkOrganizationSyncPayload = {
  clerkOrgId: string;
  name: string;
  slug?: string | null;
  ownerClerkId?: string | null;
};

function mapOrganizationRow(row: DbOrganization): DbOrganization {
  return row;
}

export async function upsertOrganizationFromClerk(
  payload: ClerkOrganizationSyncPayload,
) {
  const input = upsertOrganizationSchema.parse(payload);

  if (!isSupabaseConfigured()) {
    console.info(
      "[organizations] Supabase not configured — skipping sync for",
      input.clerkOrgId,
    );
    return { synced: false as const, organization: null };
  }

  let ownerUserId: string | null = null;

  if (input.ownerClerkId) {
    const owner = await requireUserByClerkId(input.ownerClerkId);
    ownerUserId = owner.id;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("organizations")
    .upsert(
      {
        clerk_org_id: input.clerkOrgId,
        name: input.name,
        slug: input.slug ?? null,
        owner_user_id: ownerUserId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "clerk_org_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    organization: mapOrganizationRow(data as DbOrganization),
  };
}

export async function getOrganizationByClerkOrgId(
  clerkOrgId: string,
): Promise<DbOrganization | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("clerk_org_id", clerkOrgId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as DbOrganization | null) ?? null;
}

export async function getOrganizationById(
  organizationId: string,
): Promise<DbOrganization | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as DbOrganization | null) ?? null;
}

export async function updateOrganization(
  organizationId: string,
  updates: Pick<UpsertOrganizationInput, "name" | "slug">,
) {
  if (!isSupabaseConfigured()) {
    return { synced: false as const, organization: null };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("organizations")
    .update({
      name: updates.name,
      slug: updates.slug ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    organization: mapOrganizationRow(data as DbOrganization),
  };
}

export async function deleteOrganizationByClerkOrgId(clerkOrgId: string) {
  if (!isSupabaseConfigured()) {
    return { synced: false as const };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("clerk_org_id", clerkOrgId);

  if (error) {
    throw error;
  }

  return { synced: true as const };
}
