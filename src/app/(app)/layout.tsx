import { CampaignProviderServer } from "@/components/campaign/campaign-provider";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { ChatProvider } from "@/components/chat/chat-provider";
import { ensureOrganizationSynced } from "@/actions/organizations";
import { isOpenAiConfigured } from "@/lib/ai/config";

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
      <ChatProvider initialAiConfigured={isOpenAiConfigured()}>
        <WorkspaceShell>{children}</WorkspaceShell>
      </ChatProvider>
    </CampaignProviderServer>
  );
}
