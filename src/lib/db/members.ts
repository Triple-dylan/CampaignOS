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

export type OrganizationMemberWithUser = DbOrganizationMember & {
  user: Pick<
    import("@/lib/db/schema").DbUser,
    "id" | "clerk_id" | "email" | "first_name" | "last_name" | "image_url"
  > | null;
};

export async function getOrganizationMembersWithUsers(
  organizationId: string,
): Promise<OrganizationMemberWithUser[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const members = await getOrganizationMembers(organizationId);
  if (members.length === 0) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const userIds = members.map((member) => member.user_id);
  const { data: users, error } = await supabase
    .from("users")
    .select("id, clerk_id, email, first_name, last_name, image_url")
    .in("id", userIds);

  if (error) {
    throw error;
  }

  const byId = new Map((users ?? []).map((user) => [user.id, user] as const));
  return members.map((member) => ({
    ...member,
    user: byId.get(member.user_id) ?? null,
  }));
}

export async function getOrganizationMemberById(
  memberId: string,
): Promise<DbOrganizationMember | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("id", memberId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as DbOrganizationMember | null;
}

export async function updateOrganizationMemberRole(
  memberId: string,
  role: OrganizationRole,
): Promise<DbOrganizationMember> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("organization_members")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", memberId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as DbOrganizationMember;
}

export async function deleteOrganizationMemberById(
  memberId: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId);

  if (error) {
    throw error;
  }
}
