import { WorkspaceHome } from "@/components/workspace/workspace-home";
import { getCampaignGraph } from "@/actions/brain";
import { getOnboardingData, type OnboardingData } from "@/actions/campaigns";
import { getCampaignContext } from "@/lib/campaign/get-campaign-context";
import { countAssets } from "@/lib/db/assets";
import { countUpcomingCalendarEvents } from "@/lib/db/calendar-events";
import { countResearchBriefs } from "@/lib/db/research-briefs";
import { countActiveTasks } from "@/lib/db/tasks";
import { countGraphNodes } from "@/lib/db/campaigns";
import { getFundraisingDashboardMetrics } from "@/actions/fundraising";
import type { CampaignGraphFlow } from "@/lib/graph/to-react-flow";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const { campaign, profile, isSetupComplete } = await getCampaignContext();

  if (!isSetupComplete || !campaign) {
    const onboarding = await getOnboardingData();
    const onboardingData: OnboardingData | null =
      onboarding && "error" in onboarding ? null : (onboarding as OnboardingData);

    return (
      <WorkspaceHome
        isSetupComplete={false}
        campaign={campaign}
        profile={profile}
        graph={null}
        edgeCount={0}
        metrics={{
          graphNodeCount: 0,
          assetCount: 0,
          taskCount: 0,
          upcomingEventCount: 0,
          researchBriefCount: 0,
          prospectCount: 0,
        }}
        onboardingData={onboardingData}
      />
    );
  }

  const [
    graphResult,
    assetCount,
    taskCount,
    upcomingEventCount,
    researchBriefCount,
    fundraisingMetrics,
    graphNodeCount,
  ] = await Promise.all([
    getCampaignGraph(),
    countAssets(campaign.id),
    countActiveTasks(campaign.id),
    countUpcomingCalendarEvents(campaign.id),
    countResearchBriefs(campaign.id),
    getFundraisingDashboardMetrics(),
    countGraphNodes(campaign.id),
  ]);

  const graph: CampaignGraphFlow | null = graphResult.ok
    ? graphResult.graph
    : null;
  const edgeCount = graphResult.ok ? graphResult.edgeCount : 0;

  return (
    <WorkspaceHome
      isSetupComplete
      campaign={campaign}
      profile={profile}
      graph={graph}
      edgeCount={edgeCount}
      metrics={{
        graphNodeCount,
        assetCount,
        taskCount,
        upcomingEventCount,
        researchBriefCount,
        prospectCount: fundraisingMetrics.prospectCount,
      }}
      onboardingData={null}
    />
  );
}
