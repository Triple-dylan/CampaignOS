import { AppHeader } from "@/components/layout/app-header";
import { ResearchHub } from "@/components/research/research-hub";
import { getResearchBriefsForCampaign } from "@/actions/research";
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

export default async function ResearchPage() {
  const page = modulePages.research;
  const result = await getResearchBriefsForCampaign();

  if (!result.ok) {
    return (
      <>
        <AppHeader title={page.title} description={page.description} />
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <Card>
            <CardHeader>
              <CardTitle>Research Hub unavailable</CardTitle>
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
      <ResearchHub
        briefs={result.briefs}
        openAiConfigured={result.openAiConfigured}
        topIssues={result.topIssues}
      />
    </>
  );
}
