import { getCampaignContext } from "@/lib/campaign/get-campaign-context";
import { CampaignProvider } from "@/components/campaign/campaign-context";

export async function CampaignProviderServer({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = await getCampaignContext();

  return <CampaignProvider value={value}>{children}</CampaignProvider>;
}
