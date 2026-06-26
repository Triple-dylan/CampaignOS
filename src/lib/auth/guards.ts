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
    // Funnel incomplete campaigns to the workspace home, which renders the
    // setup flow inline (no standalone onboarding page redirect).
    redirect("/dashboard");
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
