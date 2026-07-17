"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  canManageTeam,
  organizationRoleToClerkRole,
} from "@/lib/auth/permissions";
import { requireCampaignContext } from "@/lib/auth/require-campaign-context";
import {
  deleteOrganizationMemberById,
  getMemberRoleForUser,
  getOrganizationMemberById,
  getOrganizationMembersWithUsers,
  updateOrganizationMemberRole,
  type OrganizationMemberWithUser,
} from "@/lib/db/members";
import { getOrganizationByClerkOrgId } from "@/lib/db/organizations";
import { getUserByClerkId } from "@/lib/db/users";
import { isSupabaseConfigured } from "@/lib/db/client";
import type { OrganizationRole } from "@/lib/validators/enums";
import {
  inviteTeamMemberSchema,
  removeTeamMemberSchema,
  updateTeamMemberRoleSchema,
} from "@/lib/validators/team";

export type TeamMemberSummary = {
  id: string;
  userId: string;
  clerkUserId: string | null;
  role: OrganizationRole;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  displayName: string;
  isCurrentUser: boolean;
};

function toTeamMemberSummary(
  member: OrganizationMemberWithUser,
  currentDbUserId: string | null,
): TeamMemberSummary {
  const firstName = member.user?.first_name ?? null;
  const lastName = member.user?.last_name ?? null;
  const email = member.user?.email ?? null;
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    email ||
    "Team member";

  return {
    id: member.id,
    userId: member.user_id,
    clerkUserId: member.user?.clerk_id ?? null,
    role: member.role,
    email,
    firstName,
    lastName,
    imageUrl: member.user?.image_url ?? null,
    displayName,
    isCurrentUser: Boolean(currentDbUserId && member.user_id === currentDbUserId),
  };
}

export async function listTeamMembers(): Promise<{
  ok: boolean;
  members: TeamMemberSummary[];
  canManage: boolean;
  error?: string;
}> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return {
      ok: false,
      members: [],
      canManage: false,
      error: "Select an organization to manage the team.",
    };
  }

  if (!isSupabaseConfigured()) {
    return { ok: true, members: [], canManage: false };
  }

  const organization = await getOrganizationByClerkOrgId(orgId);
  if (!organization) {
    return {
      ok: false,
      members: [],
      canManage: false,
      error: "Organization not synced yet.",
    };
  }

  const dbUser = await getUserByClerkId(userId);
  const role = dbUser
    ? (
        await getOrganizationMembersWithUsers(organization.id)
      ).find((member) => member.user_id === dbUser.id)?.role
    : null;

  const members = await getOrganizationMembersWithUsers(organization.id);
  return {
    ok: true,
    members: members.map((member) =>
      toTeamMemberSummary(member, dbUser?.id ?? null),
    ),
    canManage: role ? canManageTeam(role) : false,
  };
}

export async function inviteTeamMember(input: unknown): Promise<{
  ok: boolean;
  error?: string;
  message?: string;
}> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { ok: false, error: "Select an organization to invite teammates." };
  }

  if (!isSupabaseConfigured()) {
    // Still allow Clerk invites without Supabase.
  } else {
    const organization = await getOrganizationByClerkOrgId(orgId);
    const dbUser = await getUserByClerkId(userId);
    if (!organization || !dbUser) {
      return { ok: false, error: "Organization not synced yet." };
    }
    const role = await getMemberRoleForUser(organization.id, dbUser.id);
    if (!role || !canManageTeam(role)) {
      return { ok: false, error: "Only owners and admins can invite teammates." };
    }
  }

  const parsed = inviteTeamMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email and role." };
  }

  try {
    const client = await clerkClient();
    await client.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress: parsed.data.email,
      role: organizationRoleToClerkRole(parsed.data.role),
      inviterUserId: userId,
    });
    return {
      ok: true,
      message: `Invitation sent to ${parsed.data.email}.`,
    };
  } catch (error) {
    console.error("[team] invite failed", error);
    const message =
      error instanceof Error ? error.message : "Could not send invitation.";
    return { ok: false, error: message };
  }
}

export async function updateTeamMemberRole(input: unknown): Promise<{
  ok: boolean;
  error?: string;
  message?: string;
}> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error };
  }
  if (!context.role || !canManageTeam(context.role)) {
    return { ok: false, error: "Only owners and admins can change roles." };
  }

  const parsed = updateTeamMemberRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid role update." };
  }

  const member = await getOrganizationMemberById(parsed.data.memberId);
  if (!member || member.organization_id !== context.campaign.organization_id) {
    return { ok: false, error: "Member not found." };
  }
  if (member.role === "owner") {
    return { ok: false, error: "The organization owner role cannot be changed." };
  }
  if (context.dbUserId && member.user_id === context.dbUserId) {
    return { ok: false, error: "You cannot change your own role here." };
  }

  const { orgId } = await auth();
  if (!orgId) {
    return { ok: false, error: "Organization required." };
  }

  const users = await getOrganizationMembersWithUsers(member.organization_id);
  const target = users.find((item) => item.id === member.id);
  const clerkUserId = target?.user?.clerk_id;
  if (!clerkUserId) {
    return { ok: false, error: "Could not resolve Clerk user for this member." };
  }

  try {
    const client = await clerkClient();
    await client.organizations.updateOrganizationMembership({
      organizationId: orgId,
      userId: clerkUserId,
      role: organizationRoleToClerkRole(parsed.data.role),
    });
    await updateOrganizationMemberRole(member.id, parsed.data.role);
    return { ok: true, message: "Role updated." };
  } catch (error) {
    console.error("[team] role update failed", error);
    // Still update local role if Clerk custom role is not configured yet.
    try {
      await updateOrganizationMemberRole(member.id, parsed.data.role);
      return {
        ok: true,
        message:
          "Role updated in CampaignOS. Configure matching Clerk custom org roles for invite/sync parity.",
      };
    } catch (localError) {
      console.error("[team] local role update failed", localError);
      return { ok: false, error: "Could not update role." };
    }
  }
}

export async function removeTeamMember(input: unknown): Promise<{
  ok: boolean;
  error?: string;
  message?: string;
}> {
  const context = await requireCampaignContext();
  if (!context.ok) {
    return { ok: false, error: context.error };
  }
  if (!context.role || !canManageTeam(context.role)) {
    return { ok: false, error: "Only owners and admins can remove teammates." };
  }

  const parsed = removeTeamMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid member." };
  }

  const member = await getOrganizationMemberById(parsed.data.memberId);
  if (!member || member.organization_id !== context.campaign.organization_id) {
    return { ok: false, error: "Member not found." };
  }
  if (member.role === "owner") {
    return { ok: false, error: "The organization owner cannot be removed." };
  }
  if (context.dbUserId && member.user_id === context.dbUserId) {
    return { ok: false, error: "You cannot remove yourself." };
  }

  const { orgId } = await auth();
  if (!orgId) {
    return { ok: false, error: "Organization required." };
  }

  const users = await getOrganizationMembersWithUsers(member.organization_id);
  const target = users.find((item) => item.id === member.id);
  const clerkUserId = target?.user?.clerk_id;

  try {
    if (clerkUserId) {
      const client = await clerkClient();
      await client.organizations.deleteOrganizationMembership({
        organizationId: orgId,
        userId: clerkUserId,
      });
    }
    await deleteOrganizationMemberById(member.id);
    return { ok: true, message: "Member removed." };
  } catch (error) {
    console.error("[team] remove failed", error);
    return { ok: false, error: "Could not remove member." };
  }
}
