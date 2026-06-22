import { auth, clerkClient } from "@clerk/nextjs/server";
import { AppHeader } from "@/components/layout/app-header";
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
  const { orgId } = await auth();

  let orgName: string | null = null;
  if (orgId) {
    try {
      const client = await clerkClient();
      const org = await client.organizations.getOrganization({
        organizationId: orgId,
      });
      orgName = org.name;
    } catch {
      orgName = null;
    }
  }

  if ("error" in data) {
    return (
      <>
        <AppHeader title={page.title} description={page.description} />
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
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
      </>
    );
  }

  return (
    <>
      <AppHeader
        title={page.title}
        description={
          orgName
            ? `Setting up ${orgName} — ${page.description}`
            : page.description
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <OnboardingWizard initialData={data} />
      </div>
    </>
  );
}
