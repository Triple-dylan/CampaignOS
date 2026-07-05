import { requireAuthenticatedOrg } from "@/lib/auth/guards";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuthenticatedOrg();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}
