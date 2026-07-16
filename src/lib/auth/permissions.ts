import type { OrganizationRole } from "@/lib/validators/enums";

/** @deprecated Use OrganizationRole from validators/enums */
export type CampaignRole = OrganizationRole;

/**
 * Clerk organization role keys → CampaignOS roles.
 * Supports default Clerk roles plus custom org roles configured in Clerk
 * (org:manager, org:reviewer, org:viewer) and bare role names from our APIs.
 */
const CLERK_ROLE_MAP: Record<string, OrganizationRole> = {
  "org:owner": "owner",
  "org:admin": "admin",
  "org:manager": "manager",
  "org:member": "member",
  "org:reviewer": "reviewer",
  "org:viewer": "viewer",
  owner: "owner",
  admin: "admin",
  manager: "manager",
  member: "member",
  reviewer: "reviewer",
  viewer: "viewer",
};

/** Roles that can be assigned to non-owner members via Team settings. */
export const ASSIGNABLE_ORGANIZATION_ROLES: OrganizationRole[] = [
  "admin",
  "manager",
  "member",
  "reviewer",
  "viewer",
];

export const ORGANIZATION_ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  member: "Member",
  reviewer: "Reviewer",
  viewer: "Viewer",
};

export type AppModule =
  | "dashboard"
  | "assets"
  | "planner"
  | "tasks"
  | "research"
  | "fundraising"
  | "compliance"
  | "brain"
  | "automations"
  | "agents"
  | "settings"
  | "team"
  | "knowledge";

export type ModuleAccess = "none" | "read" | "write";

/** Roles that may mutate data in each module. */
const MODULE_WRITE_ROLES: Record<AppModule, OrganizationRole[]> = {
  dashboard: ["owner", "admin", "manager", "member", "reviewer"],
  assets: ["owner", "admin", "manager", "member"],
  planner: ["owner", "admin", "manager", "member"],
  tasks: ["owner", "admin", "manager", "member"],
  research: ["owner", "admin", "manager", "member"],
  fundraising: ["owner", "admin", "manager", "member"],
  compliance: ["owner", "admin", "manager", "reviewer"],
  brain: ["owner", "admin", "manager", "member"],
  automations: ["owner", "admin", "manager"],
  agents: ["owner", "admin", "manager", "member", "reviewer"],
  settings: ["owner", "admin"],
  team: ["owner", "admin"],
  knowledge: ["owner", "admin", "manager", "member"],
};

/** Additional roles that may view (but not mutate) each module. */
const MODULE_READ_EXTRA: Partial<Record<AppModule, OrganizationRole[]>> = {
  dashboard: ["viewer"],
  assets: ["reviewer", "viewer"],
  planner: ["reviewer", "viewer"],
  tasks: ["reviewer", "viewer"],
  research: ["reviewer", "viewer"],
  fundraising: ["reviewer", "viewer"],
  compliance: ["member", "viewer"],
  brain: ["reviewer", "viewer"],
  automations: ["member", "reviewer", "viewer"],
  agents: ["viewer"],
  settings: ["manager", "member", "reviewer", "viewer"],
  team: ["manager", "member", "reviewer", "viewer"],
  knowledge: ["reviewer", "viewer"],
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

  const normalized = orgRole.trim().toLowerCase();
  return CLERK_ROLE_MAP[normalized] ?? CLERK_ROLE_MAP[orgRole] ?? "member";
}

/** @deprecated Use clerkRoleToOrganizationRole */
export function clerkRoleToCampaignRole(
  orgRole: string | undefined,
): OrganizationRole {
  return clerkRoleToOrganizationRole(orgRole);
}

/** Map CampaignOS role → Clerk custom role key for invitations / updates. */
export function organizationRoleToClerkRole(role: OrganizationRole): string {
  if (role === "owner") {
    return "org:admin";
  }
  return `org:${role}`;
}

export function canManageOrgSettings(role: OrganizationRole): boolean {
  return role === "owner" || role === "admin";
}

export function canManageTeam(role: OrganizationRole): boolean {
  return canManageOrgSettings(role);
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

export function canEditSharedContent(role: OrganizationRole): boolean {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "manager" ||
    role === "member"
  );
}

export function canComment(role: OrganizationRole): boolean {
  return role !== "viewer";
}

export function getModuleAccess(
  role: OrganizationRole,
  module: AppModule,
): ModuleAccess {
  if (MODULE_WRITE_ROLES[module].includes(role)) {
    return "write";
  }
  if (MODULE_READ_EXTRA[module]?.includes(role)) {
    return "read";
  }
  return "none";
}

export function canAccessModule(role: OrganizationRole, module: string): boolean {
  const access = getModuleAccess(role, module as AppModule);
  return access !== "none";
}

export function canWriteModule(role: OrganizationRole, module: string): boolean {
  return getModuleAccess(role, module as AppModule) === "write";
}

export function roleAtLeast(
  role: OrganizationRole,
  minimum: OrganizationRole,
): boolean {
  const order: OrganizationRole[] = [
    "viewer",
    "reviewer",
    "member",
    "manager",
    "admin",
    "owner",
  ];
  return order.indexOf(role) >= order.indexOf(minimum);
}

/**
 * Ensures the caller has at least read (or write) access to a module.
 * Keep this out of `"use server"` modules — Next requires exported server
 * actions to be async.
 */
export function assertModuleAccess(
  role: OrganizationRole | null | undefined,
  module: AppModule,
  mode: "read" | "write" = "read",
): { ok: true } | { ok: false; error: string; code: "forbidden" } {
  if (!role) {
    return {
      ok: false,
      error: "You are not a member of this organization.",
      code: "forbidden",
    };
  }

  const allowed =
    mode === "write" ? canWriteModule(role, module) : canAccessModule(role, module);

  if (!allowed) {
    return {
      ok: false,
      error:
        mode === "write"
          ? "You do not have permission to make changes in this module."
          : "You do not have permission to access this module.",
      code: "forbidden",
    };
  }

  return { ok: true };
}
