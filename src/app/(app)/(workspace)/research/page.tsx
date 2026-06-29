import { WorkPageFrame } from "@/components/layout/work-page-frame";
import { ResearchHub } from "@/components/research/research-hub";
import {
  getResearchBriefsForCampaign,
  getResearchGraphLinks,
} from "@/actions/research";
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

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ briefId?: string }>;
}) {
  const page = modulePages.research;
  const { briefId } = await searchParams;
  const result = await getResearchBriefsForCampaign();
  const graphLinksByBrief = result.ok ? await getResearchGraphLinks() : {};

  if (!result.ok) {
    return (
      <WorkPageFrame title={page.title} description={page.description}>
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
      </WorkPageFrame>
    );
  }

  return (
    <WorkPageFrame title={page.title} description={page.description}>
      <ResearchHub
        key={briefId ?? "default"}
        briefs={result.briefs}
        openAiConfigured={result.openAiConfigured}
        topIssues={result.topIssues}
        graphLinksByBrief={graphLinksByBrief}
        initialBriefId={briefId}
      />
    </WorkPageFrame>
  );
}
