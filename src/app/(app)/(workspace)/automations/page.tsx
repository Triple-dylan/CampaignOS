import { AppHeader } from "@/components/layout/app-header";
import { AutomationsDashboard } from "@/components/automations/automations-dashboard";
import { getScheduledRunsForCampaign } from "@/actions/workflows";
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
  const result = await getScheduledRunsForCampaign();

  if (!result.ok) {
    return (
      <>
        <AppHeader title={page.title} description={page.description} />
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
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
      </>
    );
  }

  return (
    <>
      <AppHeader title={page.title} description={page.description} />
      <AutomationsDashboard
        schedules={result.schedules}
        synced={result.synced}
      />
    </>
  );
}
