import { requireOnboardingComplete } from "@/lib/auth/guards";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardingComplete();

  return children;
}
