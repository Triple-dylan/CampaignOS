import { Suspense } from "react";
import { auth, clerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getIntegrationSummaries } from "@/actions/integrations";
import { IntegrationsPanel } from "@/components/settings/integrations-panel";
import { WorkPageFrame } from "@/components/layout/work-page-frame";
import {
  getCampaignByOrganizationId,
  getCampaignProfile,
} from "@/lib/db/campaigns";
import { getOrganizationByClerkOrgId } from "@/lib/db/organizations";
import { campaignDisplayName } from "@/lib/db/schema";
import { knowledgeStorageBackend } from "@/lib/campaign-knowledge/storage";
import { modulePages } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ integration?: string; result?: string }>;
}) {
  const page = modulePages.settings;
  const params = await searchParams;
  const { orgId } = await auth();

  let orgName = "—";
  let campaign = null;
  let profile = null;

  if (orgId) {
    try {
      const client = await clerkClient();
      const org = await client.organizations.getOrganization({
        organizationId: orgId,
      });
      orgName = org.name;
    } catch {
      orgName = "—";
    }

    const organization = await getOrganizationByClerkOrgId(orgId);
    if (organization) {
      campaign = await getCampaignByOrganizationId(organization.id);
      if (campaign) {
        profile = await getCampaignProfile(campaign.id);
      }
    }
  }

  const tonePrefs = profile?.tone_preferences as
    | { selectedTones?: string[]; notes?: string }
    | null
    | undefined;

  const integrationData = orgId
    ? await getIntegrationSummaries()
    : { ok: false, integrations: [], demoMode: false };

  const flashMessage = (() => {
    const provider = params.integration;
    const result = params.result;
    if (!provider || provider === "org_error") {
      return result === "error" ? "Could not connect integration." : null;
    }
    if (result === "success") {
      return `${provider.replace("_", " ")} connected.`;
    }
    if (result === "error") {
      return `Could not connect ${provider.replace("_", " ")}.`;
    }
    return null;
  })();

  const voterSegments = (profile?.voter_segments ?? []) as Array<{
    name?: string;
    description?: string;
  }>;

  return (
    <WorkPageFrame title={page.title} description={page.description}>
      <div className="flex flex-1 flex-col gap-6 p-3 md:p-4">
        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>
                Clerk organization linked to this campaign workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Name
                </p>
                <p className="mt-1">{orgName}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campaign summary</CardTitle>
              <CardDescription>
                Read-only view of onboarding data saved to Supabase.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaign ? (
                <dl className="grid gap-3 text-sm md:grid-cols-2">
                  <SummaryItem
                    label="Candidate"
                    value={campaignDisplayName(campaign)}
                  />
                  <SummaryItem label="Office" value={campaign.office_sought} />
                  <SummaryItem
                    label="Jurisdiction"
                    value={campaign.jurisdiction}
                  />
                  <SummaryItem
                    label="District"
                    value={campaign.district ?? "—"}
                  />
                  <SummaryItem label="State" value={campaign.state ?? "WA"} />
                  <SummaryItem label="Party" value={campaign.party ?? "—"} />
                  <SummaryItem
                    label="Election date"
                    value={campaign.election_date ?? "—"}
                  />
                  <SummaryItem
                    label="Status"
                    value={campaign.campaign_status}
                  />
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No campaign profile yet. Complete onboarding to populate this
                  section.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {campaign && profile ? (
          <Card>
            <CardHeader>
              <CardTitle>Strategy profile</CardTitle>
              <CardDescription>
                Issues, audiences, and brand tone from onboarding.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Top issues
                </p>
                <p className="mt-1">
                  {profile.top_issues?.length
                    ? profile.top_issues.join(", ")
                    : "—"}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Target voter segments
                </p>
                <ul className="mt-2 space-y-1">
                  {voterSegments.length > 0 ? (
                    voterSegments.map((segment) => (
                      <li key={segment.name}>
                        <span className="font-medium">{segment.name}</span>
                        {segment.description ? (
                          <span className="text-muted-foreground">
                            {" "}
                            — {segment.description}
                          </span>
                        ) : null}
                      </li>
                    ))
                  ) : (
                    <li>—</li>
                  )}
                </ul>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Brand tone
                </p>
                <p className="mt-1">
                  {tonePrefs?.selectedTones?.length
                    ? tonePrefs.selectedTones.join(", ")
                    : "—"}
                </p>
                {tonePrefs?.notes ? (
                  <p className="mt-1 text-muted-foreground">
                    {tonePrefs.notes}
                  </p>
                ) : null}
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Fundraising goal
                </p>
                <p className="mt-1">
                  {profile.fundraising_goal != null
                    ? `$${Number(profile.fundraising_goal).toLocaleString()}`
                    : "Not set"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
              Compliance
            </CardTitle>
            <CardDescription>
              Content review queue, flags, and compliance recordkeeping.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Review flagged assets, track disclosure requirements, and keep a
              compliance audit trail for your campaign.
            </p>
            <Button variant="outline" size="sm" render={<Link href="/compliance" />}>
              Open compliance queue
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asset generation integrations</CardTitle>
            <CardDescription>
              Connect design providers and Google Calendar for template export
              and planner sync.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense
              fallback={
                <p className="text-sm text-muted-foreground">
                  Loading integrations…
                </p>
              }
            >
              <IntegrationsPanel
                integrations={integrationData.integrations}
                demoMode={integrationData.demoMode}
                flashMessage={flashMessage}
              />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaign knowledge</CardTitle>
            <CardDescription>
              The file/folder base behind your context graph — markdown pages
              organized into campaign folders.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Stored in{" "}
              <span className="font-medium text-foreground">
                {knowledgeStorageBackend() === "supabase"
                  ? "cloud storage (Supabase)"
                  : "local files on this server"}
              </span>
              . Download the whole tree anytime to keep a local copy or seed a
              cloud folder of your own; Google Drive sync is planned next.
            </p>
            <Button variant="outline" size="sm" render={<a href="/api/knowledge/export" />}>
              Download knowledge folder (.zip)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coming soon</CardTitle>
            <CardDescription>
              Additional settings will ship in later milestones.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            <p>Team roles & invitations</p>
            <p>Additional CRM and compliance integrations</p>
            <p>Billing & subscription</p>
            <p>Notification preferences</p>
          </CardContent>
        </Card>
      </div>
    </WorkPageFrame>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}
