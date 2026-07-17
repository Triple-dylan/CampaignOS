import { WorkPageFrame } from "@/components/layout/work-page-frame";
import { BrainPageClient } from "@/components/brain/brain-page-client";
import { getCampaignGraph } from "@/actions/brain";
import { getFundraisingDashboardMetrics } from "@/actions/fundraising";
import { getCampaignContext } from "@/lib/campaign/get-campaign-context";
import { countAssets } from "@/lib/db/assets";
import { countUpcomingCalendarEvents } from "@/lib/db/calendar-events";
import { countResearchBriefs } from "@/lib/db/research-briefs";
import { countActiveTasks } from "@/lib/db/tasks";
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

export default async function BrainPage() {
  const page = modulePages.brain;
  const result = await getCampaignGraph();

  if (!result.ok) {
    return (
      <WorkPageFrame title={page.title} description={page.description}>
        <div className="flex flex-1 flex-col gap-6 p-3 md:p-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Brain unavailable</CardTitle>
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

  const { campaign } = await getCampaignContext();
  const [
    assetCount,
    taskCount,
    upcomingEventCount,
    researchBriefCount,
    fundraisingMetrics,
  ] = campaign
    ? await Promise.all([
        countAssets(campaign.id),
        countActiveTasks(campaign.id),
        countUpcomingCalendarEvents(campaign.id),
        countResearchBriefs(campaign.id),
        getFundraisingDashboardMetrics(),
      ])
    : [0, 0, 0, 0, { prospectCount: 0 }];

  return (
    <WorkPageFrame title={page.title} description={page.description}>
      <BrainPageClient
        graph={result.graph}
        edgeCount={result.edgeCount}
        metrics={{
          graphNodeCount: result.graph.totalNodeCount,
          assetCount,
          taskCount,
          upcomingEventCount,
          researchBriefCount,
          prospectCount: fundraisingMetrics.prospectCount,
        }}
      />
    </WorkPageFrame>
  );
}
