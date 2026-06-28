import { requireOnboardingComplete } from "@/lib/auth/guards";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardingComplete();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
  );
}
