import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AfterSignInPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // The workspace home (/dashboard) handles in-app onboarding inline when the
  // campaign is incomplete, so there's no separate onboarding redirect.
  redirect("/dashboard");
}
