import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isOnboardingComplete } from "@/lib/auth/onboarding";

export async function requireOnboardingComplete() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const { orgId } = await auth();
  const complete = await isOnboardingComplete(user, orgId);

  if (!complete) {
    redirect("/onboarding");
  }
}

export async function requireOnboardingIncomplete() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const { orgId } = await auth();
  const complete = await isOnboardingComplete(user, orgId);

  if (complete) {
    redirect("/dashboard");
  }
}
