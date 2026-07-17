import { WorkPageFrame } from "@/components/layout/work-page-frame";
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

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ assetId?: string }>;
}) {
  const page = modulePages.assets;
  const { assetId } = await searchParams;
  const result = await getAssetsForCampaign();

  if (!result.ok) {
    return (
      <WorkPageFrame title={page.title} description={page.description}>
        <div className="flex flex-1 flex-col gap-6 p-3 md:p-4">
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
      </WorkPageFrame>
    );
  }

  return (
    <WorkPageFrame title={page.title} description={page.description} fill>
      <AssetStudio
        assets={result.assets}
        canApprove={result.canApprove}
        openAiConfigured={result.openAiConfigured}
        initialAssetId={assetId}
      />
    </WorkPageFrame>
  );
}
