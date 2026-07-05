import { WorkPageFrame } from "@/components/layout/work-page-frame";
import { AutomationsDashboard } from "@/components/automations/automations-dashboard";
import {
  getScheduledRunsForCampaign,
  getWorkflowRunHistoryForCampaign,
} from "@/actions/workflows";
import { getPlannerData } from "@/actions/planner";
import { getComplianceDataForCampaign } from "@/actions/compliance";
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

export default async function AutomationsPage() {
  const page = modulePages.automations;
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [result, history, planner, compliance] = await Promise.all([
    getScheduledRunsForCampaign(),
    getWorkflowRunHistoryForCampaign(),
    getPlannerData({
      startAfter: now.toISOString(),
      startBefore: weekAhead.toISOString(),
    }),
    getComplianceDataForCampaign({ reviewStatus: "pending" }),
  ]);

  if (!result.ok) {
    return (
      <WorkPageFrame title={page.title} description={page.description}>
        <div className="flex flex-1 flex-col gap-6 p-3 md:p-4">
          <Card>
            <CardHeader>
              <CardTitle>Automations unavailable</CardTitle>
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
      <AutomationsDashboard
        schedules={result.schedules}
        runs={history.ok ? history.runs : []}
        synced={result.synced}
        upcomingEvents={planner.ok ? planner.events.slice(0, 8) : []}
        pendingCompliance={
          compliance.ok ? compliance.records.slice(0, 8) : []
        }
      />
    </WorkPageFrame>
  );
}
