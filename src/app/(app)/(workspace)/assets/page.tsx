import { AppHeader } from "@/components/layout/app-header";
import { AssetStudio } from "@/components/assets/asset-studio";
import { getAssetsForCampaign } from "@/actions/assets";
import { modulePages } from "@/lib/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AssetsPage() {
  const page = modulePages.assets;
  const result = await getAssetsForCampaign();

  if (!result.ok) {
    return (
      <>
        <AppHeader title={page.title} description={page.description} />
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <Card>
            <CardHeader>
              <CardTitle>Asset Studio unavailable</CardTitle>
              <CardDescription>{result.error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link href="/onboarding" />}>
                Complete onboarding
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title={page.title} description={page.description} />
      <AssetStudio
        assets={result.assets}
        canApprove={result.canApprove}
        openAiConfigured={result.openAiConfigured}
      />
    </>
  );
}
