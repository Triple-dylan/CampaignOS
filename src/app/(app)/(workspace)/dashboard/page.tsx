import { AppHeader } from "@/components/layout/app-header";
import { DashboardActions } from "@/components/dashboard/dashboard-actions";
import {
  CampaignBrainCard,
  CampaignSummaryCard,
  DashboardModuleCards,
  ProfileHighlightsCard,
} from "@/components/dashboard/dashboard-cards";
import { getCampaignBrainAvailability } from "@/actions/ai";
import { getCampaignContext } from "@/lib/campaign/get-campaign-context";
import { countAssets } from "@/lib/db/assets";
import { countUpcomingCalendarEvents } from "@/lib/db/calendar-events";
import { countResearchBriefs } from "@/lib/db/research-briefs";
import { countActiveTasks } from "@/lib/db/tasks";
import { getFundraisingDashboardMetrics } from "@/actions/fundraising";
import { getComplianceDashboardMetrics } from "@/actions/compliance";
import { countGraphNodes } from "@/lib/db/campaigns";
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

export default async function DashboardPage() {
  const page = modulePages.dashboard;
  const [{ campaign, profile, isSetupComplete, orgName }, brainAvailability] =
    await Promise.all([getCampaignContext(), getCampaignBrainAvailability()]);

  const assetCount = campaign ? await countAssets(campaign.id) : 0;
  const taskCount = campaign ? await countActiveTasks(campaign.id) : 0;
  const upcomingEventCount = campaign
    ? await countUpcomingCalendarEvents(campaign.id)
    : 0;
  const researchBriefCount = campaign
    ? await countResearchBriefs(campaign.id)
    : 0;
  const fundraisingMetrics = campaign
    ? await getFundraisingDashboardMetrics()
    : { prospectCount: 0, progressPercent: null };
  const complianceMetrics = campaign
    ? await getComplianceDashboardMetrics()
    : { pendingReview: 0, total: 0 };
  const graphNodeCount = campaign ? await countGraphNodes(campaign.id) : 0;

  return (
    <>
      <AppHeader title={page.title} description={page.description} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {orgName} workspace
            </p>
            <h2 className="text-xl font-semibold tracking-tight">
              Campaign overview
            </h2>
          </div>
          <DashboardActions
            isSetupComplete={isSetupComplete}
            hasCampaign={Boolean(campaign)}
            openAiConfigured={brainAvailability.openAiConfigured}
            hasBrain={brainAvailability.hasBrain}
          />
        </div>

        {campaign ? (
          <>
            <section className="grid gap-4 lg:grid-cols-2">
              <CampaignSummaryCard campaign={campaign} />
              <ProfileHighlightsCard profile={profile} />
            </section>
            <section className="grid gap-4">
              <CampaignBrainCard
                profile={profile}
                graphNodeCount={graphNodeCount}
              />
            </section>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No campaign data yet</CardTitle>
              <CardDescription>
                Finish onboarding to populate your dashboard with live campaign
                details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link href="/onboarding" />}>Complete setup</Button>
            </CardContent>
          </Card>
        )}

        <div>
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">
            Modules
          </h3>
          <DashboardModuleCards
            assetCount={assetCount}
            taskCount={taskCount}
            upcomingEventCount={upcomingEventCount}
            researchBriefCount={researchBriefCount}
            prospectCount={fundraisingMetrics.prospectCount}
            fundraisingProgressPercent={fundraisingMetrics.progressPercent}
            pendingComplianceCount={complianceMetrics.pendingReview}
          />
        </div>
      </div>
    </>
  );
}
