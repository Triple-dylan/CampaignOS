import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import type { DbOrganizationMember } from "@/lib/db/schema";
import { getOrganizationByClerkOrgId } from "@/lib/db/organizations";
import { requireUserByClerkId } from "@/lib/db/users";
import { clerkRoleToOrganizationRole } from "@/lib/auth/permissions";
import type { OrganizationRole } from "@/lib/validators/enums";
import {
  deleteOrganizationMemberSchema,
  upsertOrganizationMemberSchema,
  type DeleteOrganizationMemberInput,
  type UpsertOrganizationMemberInput,
} from "@/lib/validators/organizations";

export type ClerkMembershipSyncPayload = {
  clerkOrgId: string;
  clerkUserId: string;
  clerkMembershipId?: string | null;
  clerkRole?: string;
  role?: OrganizationRole;
  isOwner?: boolean;
};

export async function upsertOrganizationMemberFromClerk(
  payload: ClerkMembershipSyncPayload,
) {
  const parsed: UpsertOrganizationMemberInput = upsertOrganizationMemberSchema.parse({
    clerkOrgId: payload.clerkOrgId,
    clerkUserId: payload.clerkUserId,
    clerkMembershipId: payload.clerkMembershipId ?? null,
    role:
      payload.role ??
      clerkRoleToOrganizationRole(payload.clerkRole, {
        isOwner: payload.isOwner,
      }),
  });

  if (!isSupabaseConfigured()) {
    console.info(
      "[members] Supabase not configured — skipping sync for",
      parsed.clerkUserId,
    );
    return { synced: false as const, member: null };
  }

  const organization = await getOrganizationByClerkOrgId(parsed.clerkOrgId);

  if (!organization) {
    throw new Error(
      `Organization not found for Clerk org ${parsed.clerkOrgId}. Sync organization first.`,
    );
  }

  const user = await requireUserByClerkId(parsed.clerkUserId);
  const role =
    organization.owner_user_id === user.id ? "owner" : parsed.role;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("organization_members")
    .upsert(
      {
        organization_id: organization.id,
        user_id: user.id,
        clerk_membership_id: parsed.clerkMembershipId,
        role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,user_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    member: data as DbOrganizationMember,
  };
}

export async function deleteOrganizationMemberFromClerk(
  payload: DeleteOrganizationMemberInput,
) {
  const parsed = deleteOrganizationMemberSchema.parse(payload);

  if (!isSupabaseConfigured()) {
    return { synced: false as const };
  }

  const organization = await getOrganizationByClerkOrgId(parsed.clerkOrgId);
  const user = await getUserByClerkIdSafe(parsed.clerkUserId);

  if (!organization || !user) {
    return { synced: true as const };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", organization.id)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  return { synced: true as const };
}

async function getUserByClerkIdSafe(clerkId: string) {
  try {
    return await requireUserByClerkId(clerkId);
  } catch {
    return null;
  }
}

export async function getOrganizationMembers(
  organizationId: string,
): Promise<DbOrganizationMember[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as DbOrganizationMember[];
}

export async function getMemberRoleForUser(
  organizationId: string,
  userId: string,
): Promise<OrganizationRole | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data?.role as OrganizationRole | undefined) ?? null;
}
