"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { loadTrinhHaTestCampaign } from "@/actions/test-candidate";
import type { IntegrationSummary } from "@/actions/integrations";
import { IntegrationsPanel } from "@/components/settings/integrations-panel";
import { TeamPanel } from "@/components/settings/team-panel";
import type { TeamMemberSummary } from "@/actions/team";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";
import { campaignDisplayName } from "@/lib/db/schema";

type SettingsTab =
  | "campaign"
  | "team"
  | "integrations"
  | "knowledge"
  | "testing";

const TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: "campaign", label: "Campaign" },
  { id: "team", label: "Team" },
  { id: "integrations", label: "Integrations" },
  { id: "knowledge", label: "Knowledge" },
  { id: "testing", label: "Testing" },
];

type SettingsPageClientProps = {
  orgName: string;
  campaign: DbCampaign | null;
  profile: DbCampaignProfile | null;
  integrations: IntegrationSummary[];
  demoMode: boolean;
  flashMessage: string | null;
  initialTab: SettingsTab;
  pageTitle: string;
  pageDescription: string;
  knowledgeStorageLabel: string;
  teamMembers: TeamMemberSummary[];
  canManageTeam: boolean;
};

export function SettingsPageClient({
  orgName,
  campaign,
  profile,
  integrations,
  demoMode,
  flashMessage,
  initialTab,
  pageTitle,
  pageDescription,
  knowledgeStorageLabel,
  teamMembers,
  canManageTeam,
}: SettingsPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);
  const [flashBanner, setFlashBanner] = React.useState<string | null>(
    flashMessage,
  );
  const [seenFlash, setSeenFlash] = React.useState<string | null>(flashMessage);

  // Adjust local banner when a new OAuth flash arrives (render-time sync).
  if (flashMessage && flashMessage !== seenFlash) {
    setSeenFlash(flashMessage);
    setFlashBanner(flashMessage);
  }

  const message = actionMessage ?? flashBanner;

  const tabFromUrl = searchParams.get("tab");
  const tab: SettingsTab =
    tabFromUrl && TABS.some((item) => item.id === tabFromUrl)
      ? (tabFromUrl as SettingsTab)
      : initialTab;

  // Drop OAuth flash query params after they have been shown so refresh is clean.
  React.useEffect(() => {
    if (
      !searchParams.get("integration") &&
      !searchParams.get("result") &&
      !searchParams.get("reason")
    ) {
      return;
    }
    const next = new URLSearchParams(searchParams.toString());
    next.delete("integration");
    next.delete("result");
    next.delete("reason");
    if (!next.get("tab")) {
      next.set("tab", "integrations");
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const tonePrefs = profile?.tone_preferences as
    | { selectedTones?: string[]; notes?: string }
    | null
    | undefined;

  const voterSegments = (profile?.voter_segments ?? []) as Array<{
    name?: string;
    description?: string;
  }>;

  const selectTab = (next: SettingsTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    params.delete("integration");
    params.delete("result");
    params.delete("reason");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleLoadTrinhHa = async () => {
    setPending(true);
    setActionMessage(null);
    setFlashBanner(null);
    try {
      const result = await loadTrinhHaTestCampaign();
      if (result.ok) {
        setActionMessage(result.message);
        router.refresh();
      } else {
        setActionMessage(result.error);
      }
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "Failed to load the test campaign.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="border-b px-3 py-3 md:px-4">
        <h1 className="text-lg font-semibold tracking-tight">{pageTitle}</h1>
        <p className="text-sm text-muted-foreground">{pageDescription}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectTab(item.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                tab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-3 md:p-4">
        {message ? (
          <p className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
            {message}
          </p>
        ) : null}

        {tab === "campaign" ? (
          <>
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
                  <p className="text-xs text-muted-foreground">
                    Invite teammates and manage org membership from the
                    organization switcher in the app rail.
                  </p>
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
                      No campaign profile yet. Use the Testing tab to load the
                      Trinh Ha test candidate, or finish setup on the dashboard.
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
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck
                    className="size-4 text-muted-foreground"
                    aria-hidden
                  />
                  Compliance
                </CardTitle>
                <CardDescription>
                  Content review queue, flags, and compliance recordkeeping.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  Review flagged assets, track disclosure requirements, and keep
                  a compliance audit trail for your campaign.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href="/compliance" />}
                >
                  Open compliance queue
                </Button>
              </CardContent>
            </Card>
          </>
        ) : null}

        {tab === "team" ? (
          <TeamPanel
            initialMembers={teamMembers}
            canManage={canManageTeam}
          />
        ) : null}

        {tab === "integrations" ? (
          <Card>
            <CardHeader>
              <CardTitle>Asset generation integrations</CardTitle>
              <CardDescription>
                Connect design providers and Google Calendar for template export
                and planner sync.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!campaign ? (
                <p className="mb-4 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  Connect integrations anytime. Calendar export/import needs a
                  campaign — load the test candidate from the Testing tab or
                  finish dashboard setup first.
                </p>
              ) : null}
              <IntegrationsPanel
                integrations={integrations}
                demoMode={demoMode}
                calendarActionsEnabled={Boolean(campaign)}
              />
            </CardContent>
          </Card>
        ) : null}

        {tab === "knowledge" ? (
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
                  {knowledgeStorageLabel}
                </span>
                . Download the whole tree anytime to keep a local copy.
              </p>
              {campaign ? (
                <Button
                  variant="outline"
                  size="sm"
                  render={<a href="/api/knowledge/export" />}
                >
                  Download knowledge folder (.zip)
                </Button>
              ) : (
                <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-muted-foreground">
                  No campaign knowledge to export yet. Complete setup or load the
                  Trinh Ha test campaign first.
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}

        {tab === "testing" ? (
          <Card>
            <CardHeader>
              <CardTitle>Trinh Ha test candidate</CardTitle>
              <CardDescription>
                Load the WA-08 test campaign with prefilled profile, research
                briefs, knowledge folders, and graph seed data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                Use this to populate your live organization with Trinh Ha for
                Congress — U.S. House, WA-08, Republican, 2026. Research briefs
                cover the district, incumbent opponent, public safety, and voter
                segments.
              </p>
              <Button
                type="button"
                disabled={pending}
                onClick={handleLoadTrinhHa}
              >
                {pending ? "Loading…" : "Load Trinh Ha test campaign"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Requires Supabase. After loading, open{" "}
                <Link href="/dashboard" className="underline">
                  Dashboard
                </Link>
                ,{" "}
                <Link href="/research" className="underline">
                  Research
                </Link>
                , and{" "}
                <Link href="/brain" className="underline">
                  Brain
                </Link>{" "}
                to verify.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
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
