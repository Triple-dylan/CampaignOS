import type { OrganizationRole } from "@/lib/validators/enums";

/** @deprecated Use OrganizationRole from validators/enums */
export type CampaignRole = OrganizationRole;

const CLERK_ROLE_MAP: Record<string, OrganizationRole> = {
  "org:admin": "admin",
  "org:member": "member",
};

export function clerkRoleToOrganizationRole(
  orgRole: string | undefined,
  options?: { isOwner?: boolean },
): OrganizationRole {
  if (options?.isOwner) {
    return "owner";
  }

  if (!orgRole) {
    return "member";
  }

  return CLERK_ROLE_MAP[orgRole] ?? "member";
}

/** @deprecated Use clerkRoleToOrganizationRole */
export function clerkRoleToCampaignRole(
  orgRole: string | undefined,
): OrganizationRole {
  return clerkRoleToOrganizationRole(orgRole);
}

export function canManageOrgSettings(role: OrganizationRole): boolean {
  return role === "owner" || role === "admin";
}

export function canApproveAssets(role: OrganizationRole): boolean {
  return role === "owner" || role === "admin" || role === "manager";
}

export function canReviewCompliance(role: OrganizationRole): boolean {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "manager" ||
    role === "reviewer"
  );
}

export function canAccessModule(_role: OrganizationRole, _module: string): boolean {
  void _role;
  void _module;
  return true;
}
