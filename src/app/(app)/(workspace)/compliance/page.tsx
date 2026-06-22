import { AppHeader } from "@/components/layout/app-header";
import { ComplianceDashboard } from "@/components/compliance/compliance-dashboard";
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

export default async function CompliancePage() {
  const page = modulePages.compliance;
  const result = await getComplianceDataForCampaign();

  if (!result.ok) {
    return (
      <>
        <AppHeader title={page.title} description={page.description} />
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Dashboard unavailable</CardTitle>
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
      <ComplianceDashboard
        records={result.records}
        counts={result.counts}
        canReview={result.canReview}
        campaignState={result.campaignState}
      />
    </>
  );
}
