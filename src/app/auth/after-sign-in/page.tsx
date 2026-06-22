import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isOnboardingComplete } from "@/lib/auth/onboarding";

export default async function AfterSignInPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { orgId } = await auth();

  if (await isOnboardingComplete(user, orgId)) {
    redirect("/dashboard");
  }

  redirect("/onboarding");
}
