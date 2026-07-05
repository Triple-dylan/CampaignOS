import { WorkPageFrame } from "@/components/layout/work-page-frame";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { getOnboardingData } from "@/actions/campaigns";
import { modulePages } from "@/lib/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function OnboardingPage() {
  const page = modulePages.onboarding;
  const data = await getOnboardingData();

  if ("error" in data) {
    return (
      <WorkPageFrame title={page.title} description={page.description}>
        <div className="flex flex-1 flex-col gap-4 p-3 md:p-4">
          <Card className="mx-auto w-full max-w-lg">
            <CardHeader>
              <CardTitle>Organization required</CardTitle>
              <CardDescription>{data.error}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Use the organization switcher in the sidebar to create or select
              your campaign team, then return here to finish setup.
            </CardContent>
          </Card>
        </div>
      </WorkPageFrame>
    );
  }

  return (
    <WorkPageFrame title={page.title} description={page.description}>
      <div className="flex flex-1 flex-col gap-4 p-3 md:p-4">
        <OnboardingWizard initialData={data} />
      </div>
    </WorkPageFrame>
  );
}
