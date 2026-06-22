import { auth, currentUser } from "@clerk/nextjs/server";

export type SessionUser = {
  id: string;
  email: string;
  orgId?: string;
  firstName?: string | null;
  lastName?: string | null;
};

export async function getSession(): Promise<SessionUser | null> {
  const { userId, orgId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await currentUser();

  if (!user) {
    return null;
  }

  return {
    id: userId,
    email: user.emailAddresses[0]?.emailAddress ?? "",
    orgId: orgId ?? undefined,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}
