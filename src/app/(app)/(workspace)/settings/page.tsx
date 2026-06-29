import { auth, clerkClient } from "@clerk/nextjs/server";
import { WorkPageFrame } from "@/components/layout/work-page-frame";
import {
  getCampaignByOrganizationId,
  getCampaignProfile,
} from "@/lib/db/campaigns";
import { getOrganizationByClerkOrgId } from "@/lib/db/organizations";
import { campaignDisplayName } from "@/lib/db/schema";
import { modulePages } from "@/lib/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default async function SettingsPage() {
  const page = modulePages.settings;
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

  const voterSegments = (profile?.voter_segments ?? []) as Array<{
    name?: string;
    description?: string;
  }>;

  return (
    <WorkPageFrame title={page.title} description={page.description}>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
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
            <CardTitle>Asset generation integrations</CardTitle>
            <CardDescription>
              Connect a design provider before CampaignOS can render social
              templates or export finished creative.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <IntegrationSetupCard
              title="Canva Connect"
              description="Best for reusable brand templates, campaign-safe layouts, and exportable social graphics."
              cta="Connect Canva"
              steps={[
                "Create a Canva developer app and configure OAuth with PKCE.",
                "Publish Canva brand templates for each social format and store their template IDs.",
                "Map CampaignOS fields to each template dataset, then run Autofill and Export jobs.",
              ]}
            />
            <IntegrationSetupCard
              title="Higgsfield MCP"
              description="Best for AI-generated image or short-video variations when a rendered design template is not required."
              cta="Connect Higgsfield"
              steps={[
                "Add the Higgsfield MCP server to Cursor or the CampaignOS runtime when supported.",
                "Authenticate through Higgsfield OAuth instead of storing API keys in the app.",
                "Map template metadata to MCP generation prompts and save returned media URLs.",
              ]}
            />
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
            <p>Integrations (email, CRM, compliance)</p>
            <p>Billing & subscription</p>
            <p>Notification preferences</p>
          </CardContent>
        </Card>
      </div>
    </WorkPageFrame>
  );
}

function IntegrationSetupCard({
  title,
  description,
  cta,
  steps,
}: {
  title: string;
  description: string;
  cta: string;
  steps: string[];
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button type="button" variant="outline" disabled>
          {cta}
        </Button>
      </div>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
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
