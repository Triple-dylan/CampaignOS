import { requireOnboardingIncomplete } from "@/lib/auth/guards";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardingIncomplete();

  return (
    <div className="flex h-full min-h-0 gap-2.5 md:gap-3">
      <section className="glass-floating relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </section>
    </div>
  );
}
