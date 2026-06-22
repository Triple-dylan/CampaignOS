import { AppSidebar } from "@/components/layout/app-sidebar";
import { ComplianceDisclaimer } from "@/components/layout/compliance-disclaimer";
import { CampaignProviderServer } from "@/components/campaign/campaign-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ensureOrganizationSynced } from "@/actions/organizations";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await ensureOrganizationSynced();
  } catch (error) {
    console.error("[app layout] organization sync failed", error);
  }

  return (
    <CampaignProviderServer>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex min-h-svh flex-col">
          <div className="flex flex-1 flex-col">{children}</div>
          <ComplianceDisclaimer />
        </SidebarInset>
      </SidebarProvider>
    </CampaignProviderServer>
  );
}
