import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import type { DbUser } from "@/lib/db/schema";

export type ClerkUserSyncPayload = {
  clerkId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
};

export async function upsertUserFromClerk(payload: ClerkUserSyncPayload) {
  if (!isSupabaseConfigured()) {
    console.info(
      "[users] Supabase not configured — skipping sync for",
      payload.clerkId,
    );
    return { synced: false as const };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("users").upsert(
    {
      clerk_id: payload.clerkId,
      email: payload.email,
      first_name: payload.firstName,
      last_name: payload.lastName,
      image_url: payload.imageUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "clerk_id" },
  );

  if (error) {
    throw error;
  }

  return { synced: true as const };
}

export async function getUserByClerkId(
  clerkId: string,
): Promise<DbUser | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as DbUser | null;
}

export async function requireUserByClerkId(clerkId: string): Promise<DbUser> {
  const user = await getUserByClerkId(clerkId);

  if (!user) {
    throw new Error(`User not found in Supabase for Clerk id ${clerkId}`);
  }

  return user;
}
