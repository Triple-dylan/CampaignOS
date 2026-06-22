import { AppHeader } from "@/components/layout/app-header";
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

export default async function FundraisingPage() {
  const page = modulePages.fundraising;
  const result = await getFundraisingDataForCampaign();

  if (!result.ok) {
    return (
      <>
        <AppHeader title={page.title} description={page.description} />
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
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
      </>
    );
  }

  return (
    <>
      <AppHeader title={page.title} description={page.description} />
      <FundraisingPlanner
        plan={result.plan}
        prospects={result.prospects}
        taskCounts={result.taskCounts}
        profileGoal={result.profileGoal}
        progress={result.progress}
        openAiConfigured={result.openAiConfigured}
        topIssues={result.topIssues}
      />
    </>
  );
}
