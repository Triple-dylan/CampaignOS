import { WorkPageFrame } from "@/components/layout/work-page-frame";
import { FundraisingPlanner } from "@/components/fundraising/fundraising-planner";
import { getFundraisingDataForCampaign } from "@/actions/fundraising";
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

export default async function FundraisingPage({
  searchParams,
}: {
  searchParams: Promise<{ prospectId?: string }>;
}) {
  const page = modulePages.fundraising;
  const { prospectId } = await searchParams;
  const result = await getFundraisingDataForCampaign();

  if (!result.ok) {
    return (
      <WorkPageFrame title={page.title} description={page.description}>
        <div className="flex flex-1 flex-col gap-6 p-3 md:p-4">
          <Card>
            <CardHeader>
              <CardTitle>Fundraising Planner unavailable</CardTitle>
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
      <FundraisingPlanner
        key={prospectId ?? "default"}
        plan={result.plan}
        prospects={result.prospects}
        taskCounts={result.taskCounts}
        profileGoal={result.profileGoal}
        progress={result.progress}
        openAiConfigured={result.openAiConfigured}
        topIssues={result.topIssues}
        initialProspectId={prospectId}
      />
    </WorkPageFrame>
  );
}
