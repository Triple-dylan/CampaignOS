"use server";

import { auth } from "@clerk/nextjs/server";
import { ensureOrganizationSynced } from "@/actions/organizations";
import {
  getCampaignByOrganizationId,
  getCampaignProfile,
} from "@/lib/db/campaigns";
import type { DbCampaignProfile } from "@/lib/db/schema";
import { getMemberRoleForUser } from "@/lib/db/members";
import { getUserByClerkId } from "@/lib/db/users";
import {
  canAccessModule,
  canWriteModule,
  type AppModule,
} from "@/lib/auth/permissions";
import type { OrganizationRole } from "@/lib/validators/enums";

export type CampaignActionCode =
  | "missing_org"
  | "missing_campaign"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation";

export type CampaignContext =
  | {
      ok: false;
      error: string;
      code: CampaignActionCode;
    }
  | {
      ok: true;
      campaign: NonNullable<
        Awaited<ReturnType<typeof getCampaignByOrganizationId>>
      >;
      profile: DbCampaignProfile | null;
      userId: string;
      dbUserId: string | null;
      role: OrganizationRole | null;
    };

export async function requireCampaignContext(): Promise<CampaignContext> {
  const { userId, orgId } = await auth();

  if (!userId) {
    return { ok: false, error: "Sign in required", code: "unauthorized" };
  }

  if (!orgId) {
    return {
      ok: false,
      error: "Select or create a campaign organization to continue.",
      code: "missing_org",
    };
  }

  const sync = await ensureOrganizationSynced();
  if (!sync.ok || !sync.organizationId) {
    return {
      ok: false,
      error: "Could not sync your organization. Try again in a moment.",
      code: "missing_org",
    };
  }

  const campaign = await getCampaignByOrganizationId(sync.organizationId);
  if (!campaign) {
    return {
      ok: false,
      error: "Complete onboarding before using this module.",
      code: "missing_campaign",
    };
  }

  const profile = await getCampaignProfile(campaign.id);
  const dbUser = await getUserByClerkId(userId);
  const role = dbUser
    ? await getMemberRoleForUser(sync.organizationId, dbUser.id)
    : null;

  return {
    ok: true,
    campaign,
    profile,
    userId,
    dbUserId: dbUser?.id ?? null,
    role,
  };
}

export type ModuleActionResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error: string;
      code?: CampaignActionCode;
    };

export type CampaignContextOk = Extract<CampaignContext, { ok: true }>;

/**
 * Ensures the caller has at least read (or write) access to a module.
 * Use after requireCampaignContext() succeeds.
 */
export function assertModuleAccess(
  context: CampaignContextOk,
  module: AppModule,
  mode: "read" | "write" = "read",
): { ok: true } | { ok: false; error: string; code: "forbidden" } {
  if (!context.role) {
    return {
      ok: false,
      error: "You are not a member of this organization.",
      code: "forbidden",
    };
  }

  const allowed =
    mode === "write"
      ? canWriteModule(context.role, module)
      : canAccessModule(context.role, module);

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
