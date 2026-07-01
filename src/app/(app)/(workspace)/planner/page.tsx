import { WorkPageFrame } from "@/components/layout/work-page-frame";
import { CampaignPlanner } from "@/components/planner/campaign-planner";
import { getPlannerData } from "@/actions/planner";
import { isOpenAiConfigured } from "@/lib/ai/config";
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

export default async function PlannerPage() {
  const page = modulePages.planner;
  const result = await getPlannerData();

  if (!result.ok) {
    return (
      <WorkPageFrame title={page.title} description={page.description}>
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <Card>
            <CardHeader>
              <CardTitle>Planner unavailable</CardTitle>
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
    <WorkPageFrame title={page.title} description={page.description}>
      <CampaignPlanner
        events={result.events}
        approvedAssets={result.approvedAssets}
        openAiConfigured={isOpenAiConfigured()}
      />
    </WorkPageFrame>
  );
}
