"use server";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { isSupabaseConfigured } from "@/lib/db/client";
import { upsertOrganizationMemberFromClerk } from "@/lib/db/members";
import {
  getOrganizationByClerkOrgId,
  upsertOrganizationFromClerk,
} from "@/lib/db/organizations";
import { upsertUserFromClerk } from "@/lib/db/users";

export type EnsureOrganizationResult =
  | { ok: true; organizationId: string | null }
  | {
      ok: false;
      reason:
        | "missing_org"
        | "missing_user"
        | "supabase_not_configured"
        | "sync_failed";
    };

export async function ensureOrganizationSynced(): Promise<EnsureOrganizationResult> {
  const { orgId, userId } = await auth();

  if (!userId) {
    return { ok: false, reason: "missing_user" };
  }

  if (!orgId) {
    return { ok: false, reason: "missing_org" };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "supabase_not_configured" };
  }

  try {
    const clerkUser = await currentUser();

    if (clerkUser) {
      await upsertUserFromClerk({
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? null,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
      });
    }

    const client = await clerkClient();
    const clerkOrg = await client.organizations.getOrganization({
      organizationId: orgId,
    });

    let organization = await getOrganizationByClerkOrgId(orgId);

    if (!organization) {
      const result = await upsertOrganizationFromClerk({
        clerkOrgId: clerkOrg.id,
        name: clerkOrg.name,
        slug: clerkOrg.slug,
        ownerClerkId: clerkOrg.createdBy ?? userId,
      });

      organization = result.organization;
    }

    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    });

    const membership = memberships.data.find(
      (entry) => entry.publicUserData?.userId === userId,
    );

    await upsertOrganizationMemberFromClerk({
      clerkOrgId: orgId,
      clerkUserId: userId,
      clerkMembershipId: membership?.id ?? null,
      clerkRole: membership?.role,
      isOwner: clerkOrg.createdBy === userId,
    });

    return { ok: true, organizationId: organization?.id ?? null };
  } catch (error) {
    console.error("[ensureOrganizationSynced] failed", error);
    return { ok: false, reason: "sync_failed" };
  }
}
