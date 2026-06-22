import { requireOnboardingIncomplete } from "@/lib/auth/guards";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardingIncomplete();

  return children;
}
