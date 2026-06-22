import type { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { isSupabaseConfigured } from "@/lib/db/client";
import {
  deleteOrganizationMemberFromClerk,
  upsertOrganizationMemberFromClerk,
} from "@/lib/db/members";
import { upsertOrganizationFromClerk } from "@/lib/db/organizations";
import { upsertUserFromClerk } from "@/lib/db/users";

function getPrimaryEmail(
  emailAddresses: Array<{ email_address: string }> | undefined,
): string | null {
  return emailAddresses?.[0]?.email_address ?? null;
}

async function handleUserEvent(event: WebhookEvent) {
  if (event.type !== "user.created" && event.type !== "user.updated") {
    return;
  }

  const { id, email_addresses, first_name, last_name, image_url } = event.data;

  await upsertUserFromClerk({
    clerkId: id,
    email: getPrimaryEmail(email_addresses),
    firstName: first_name ?? null,
    lastName: last_name ?? null,
    imageUrl: image_url ?? null,
  });
}

async function handleOrganizationEvent(event: WebhookEvent) {
  if (
    event.type !== "organization.created" &&
    event.type !== "organization.updated"
  ) {
    return;
  }

  const { id, name, slug, created_by } = event.data;

  await upsertOrganizationFromClerk({
    clerkOrgId: id,
    name,
    slug: slug ?? null,
    ownerClerkId: created_by ?? null,
  });

  if (created_by) {
    await upsertOrganizationMemberFromClerk({
      clerkOrgId: id,
      clerkUserId: created_by,
      role: "owner",
    });
  }
}

async function handleOrganizationMembershipEvent(event: WebhookEvent) {
  if (event.type === "organizationMembership.deleted") {
    const organizationId = event.data.organization?.id;
    const clerkUserId = event.data.public_user_data?.user_id;

    if (organizationId && clerkUserId) {
      await deleteOrganizationMemberFromClerk({
        clerkOrgId: organizationId,
        clerkUserId,
      });
    }

    return;
  }

  if (
    event.type !== "organizationMembership.created" &&
    event.type !== "organizationMembership.updated"
  ) {
    return;
  }

  const organizationId = event.data.organization?.id;
  const clerkUserId = event.data.public_user_data?.user_id;
  const clerkMembershipId = event.data.id;
  const clerkRole = event.data.role;

  if (!organizationId || !clerkUserId) {
    console.warn(
      "[clerk webhook] Membership event missing organization or user id",
    );
    return;
  }

  await upsertOrganizationMemberFromClerk({
    clerkOrgId: organizationId,
    clerkUserId,
    clerkMembershipId,
    clerkRole,
  });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[clerk webhook] CLERK_WEBHOOK_SECRET is not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  const payload = await request.json();
  const body = JSON.stringify(payload);
  const webhook = new Webhook(webhookSecret);

  let event: WebhookEvent;

  try {
    event = webhook.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (error) {
    console.error("[clerk webhook] Signature verification failed", error);
    return new Response("Invalid signature", { status: 400 });
  }

  console.info("[clerk webhook] Received event:", event.type);

  try {
    switch (event.type) {
      case "user.created":
      case "user.updated":
        await handleUserEvent(event);
        break;
      case "organization.created":
      case "organization.updated":
        await handleOrganizationEvent(event);
        break;
      case "organizationMembership.created":
      case "organizationMembership.updated":
      case "organizationMembership.deleted":
        await handleOrganizationMembershipEvent(event);
        break;
      default:
        console.info("[clerk webhook] Unhandled event type:", event.type);
    }
  } catch (error) {
    console.error("[clerk webhook] Handler failed:", error);

    if (isSupabaseConfigured()) {
      return new Response("Webhook handler failed", { status: 500 });
    }
  }

  return new Response("OK", { status: 200 });
}
