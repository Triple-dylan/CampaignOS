import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Calendar,
  FolderOpen,
  Lightbulb,
  PiggyBank,
  ShieldCheck,
  SquareCheckBig,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DbCampaign, DbCampaignProfile } from "@/lib/db/schema";
import {
  campaignDisplayName,
} from "@/lib/db/schema";
import {
  daysUntilElection,
  formatElectionCountdown,
  formatElectionDate,
  formatFundraisingGoal,
  getToneSummary,
} from "@/lib/campaign/utils";

function formatBrainGeneratedAt(value: string | null | undefined): string {
  if (!value?.trim()) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type CampaignSummaryCardProps = {
  campaign: DbCampaign;
};

export function CampaignSummaryCard({ campaign }: CampaignSummaryCardProps) {
  const days = daysUntilElection(campaign.election_date);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign summary</CardTitle>
        <CardDescription>
          Core details from your onboarding setup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-2xl font-semibold tracking-tight">
            {campaignDisplayName(campaign)}
          </p>
          <p className="text-sm text-muted-foreground">
            {campaign.office_sought?.trim() || "Office not set"}
            {campaign.jurisdiction?.trim()
              ? ` · ${campaign.jurisdiction}`
              : ""}
          </p>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <SummaryItem label="Jurisdiction" value={campaign.jurisdiction} />
          <SummaryItem label="State" value={campaign.state ?? "WA"} />
          <SummaryItem label="District" value={campaign.district} />
          <SummaryItem label="Party" value={campaign.party} />
          <SummaryItem
            label="Election date"
            value={formatElectionDate(campaign.election_date)}
          />
          <SummaryItem
            label="Countdown"
            value={formatElectionCountdown(days)}
          />
        </dl>
      </CardContent>
    </Card>
  );
}

type ProfileHighlightsCardProps = {
  profile: DbCampaignProfile | null;
};

export function ProfileHighlightsCard({ profile }: ProfileHighlightsCardProps) {
  const messageFramework = profile?.message_framework;
  const keyMessages = messageFramework?.keyMessages?.filter(Boolean) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign profile</CardTitle>
        <CardDescription>
          Strategy highlights captured during onboarding
          {profile?.brain_generated_at ? " and Campaign Brain." : "."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <HighlightItem
          label="Top issues"
          value={
            profile?.top_issues?.length
              ? profile.top_issues.join(", ")
              : "—"
          }
        />
        <HighlightItem
          label="Brand tone"
          value={getToneSummary(profile?.tone_preferences ?? null)}
        />
        <HighlightItem
          label="Fundraising goal"
          value={formatFundraisingGoal(profile?.fundraising_goal ?? null)}
        />
        {messageFramework?.valueProposition ? (
          <HighlightItem
            label="Value proposition"
            value={messageFramework.valueProposition}
          />
        ) : null}
        {keyMessages.length > 0 ? (
          <HighlightItem label="Key messages" value={keyMessages.join(" · ")} />
        ) : null}
      </CardContent>
    </Card>
  );
}

type CampaignBrainCardProps = {
  profile: DbCampaignProfile | null;
  graphNodeCount?: number;
};

export function CampaignBrainCard({
  profile,
  graphNodeCount = 0,
}: CampaignBrainCardProps) {
  const hasBrain = Boolean(profile?.brain_generated_at && profile.summary);
  const messageFramework = profile?.message_framework;
  const issueMap = profile?.issue_map ?? [];

  if (!hasBrain) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="size-4 text-muted-foreground" />
            <CardTitle>Campaign Brain</CardTitle>
          </div>
          <CardDescription>
            Generate an AI strategy summary, message framework, and issue map
            from your onboarding data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            No Campaign Brain yet. Use the button above when OpenAI is configured.
          </p>
          {graphNodeCount > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
              <p className="text-sm text-muted-foreground">
                {graphNodeCount} graph node{graphNodeCount === 1 ? "" : "s"}{" "}
                from onboarding and modules.
              </p>
              <Button variant="outline" size="sm" render={<Link href="/brain" />}>
                View graph
                <ArrowRight data-icon="inline-end" className="size-3.5" />
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Brain className="size-4 text-muted-foreground" />
              <CardTitle>Campaign Brain</CardTitle>
            </div>
            <CardDescription>
              AI-generated strategy from your campaign profile.
            </CardDescription>
          </div>
          <p className="text-xs text-muted-foreground">
            Generated {formatBrainGeneratedAt(profile?.brain_generated_at)}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Summary
          </p>
          <p className="mt-2 whitespace-pre-line leading-relaxed">
            {profile?.summary}
          </p>
        </div>

        {messageFramework ? (
          <div className="grid gap-4 md:grid-cols-2">
            {messageFramework.toneGuidance ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tone guidance
                </p>
                <p className="mt-2">{messageFramework.toneGuidance}</p>
              </div>
            ) : null}
            {messageFramework.taglines?.length ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Taglines
                </p>
                <p className="mt-2">{messageFramework.taglines.join(" · ")}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {issueMap.length > 0 ? (
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Issue map
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {issueMap.map((entry) => (
                <div
                  key={entry.issue ?? entry.strategicNotes}
                  className="rounded-lg border bg-muted/30 p-3"
                >
                  <p className="font-medium">{entry.issue ?? "Issue"}</p>
                  {entry.strategicNotes ? (
                    <p className="mt-1 text-muted-foreground">
                      {entry.strategicNotes}
                    </p>
                  ) : null}
                  {entry.talkingPoints?.length ? (
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                      {entry.talkingPoints.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {graphNodeCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
            <p className="text-sm text-muted-foreground">
              {graphNodeCount} knowledge graph node
              {graphNodeCount === 1 ? "" : "s"} across your campaign modules.
            </p>
            <Button variant="outline" size="sm" render={<Link href="/brain" />}>
              View Campaign Brain
              <ArrowRight data-icon="inline-end" className="size-3.5" />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

const emptyStates = [
  {
    title: "Tasks",
    description: "Team tasks and milestone checklists will appear here.",
    href: "/tasks",
    phase: 4,
    icon: SquareCheckBig,
  },
  {
    title: "Calendar & events",
    description: "Field events and voter contact schedules land in Planner.",
    href: "/planner",
    phase: 4,
    icon: Calendar,
  },
  {
    title: "Assets",
    description: "Creative files, brand kits, and media libraries.",
    href: "/assets",
    phase: 3,
    icon: FolderOpen,
  },
  {
    title: "Research briefs",
    description: "District intel and opposition research summaries.",
    href: "/research",
    phase: 5,
    icon: Lightbulb,
  },
  {
    title: "Fundraising",
    description: "Donor pipelines, call time, and goal tracking.",
    href: "/fundraising",
    phase: 6,
    icon: PiggyBank,
  },
  {
    title: "Compliance items",
    description: "Filing reminders, disclaimers, and review queues.",
    href: "/compliance",
    phase: 7,
    icon: ShieldCheck,
  },
] as const;

export function DashboardModuleCards({
  assetCount = 0,
  taskCount = 0,
  upcomingEventCount = 0,
  researchBriefCount = 0,
  prospectCount = 0,
  fundraisingProgressPercent = null as number | null,
  pendingComplianceCount = 0,
}: {
  assetCount?: number;
  taskCount?: number;
  upcomingEventCount?: number;
  researchBriefCount?: number;
  prospectCount?: number;
  fundraisingProgressPercent?: number | null;
  pendingComplianceCount?: number;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {emptyStates.map((item) => {
        const isAssets = item.title === "Assets";
        const isTasks = item.title === "Tasks";
        const isCalendar = item.title === "Calendar & events";
        const isResearch = item.title === "Research briefs";
        const isFundraising = item.title === "Fundraising";
        const isCompliance = item.title === "Compliance items";

        const hasAssets = isAssets && assetCount > 0;
        const hasTasks = isTasks && taskCount > 0;
        const hasEvents = isCalendar && upcomingEventCount > 0;
        const hasResearch = isResearch && researchBriefCount > 0;
        const hasFundraising = isFundraising && prospectCount > 0;
        const hasCompliance = isCompliance && pendingComplianceCount > 0;
        const needsComplianceReview = isCompliance && pendingComplianceCount > 0;

        let statusMessage = `No ${item.title.toLowerCase()} yet.`;
        if (hasAssets) {
          statusMessage = `${assetCount} asset${assetCount === 1 ? "" : "s"} in Asset Studio.`;
        } else if (hasTasks) {
          statusMessage = `${taskCount} open task${taskCount === 1 ? "" : "s"} on your board.`;
        } else if (hasEvents) {
          statusMessage = `${upcomingEventCount} event${upcomingEventCount === 1 ? "" : "s"} in the next 7 days.`;
        } else if (hasResearch) {
          statusMessage = `${researchBriefCount} research brief${researchBriefCount === 1 ? "" : "s"} in Research Hub.`;
        } else if (hasFundraising) {
          const progressSuffix =
            fundraisingProgressPercent != null
              ? ` · ${fundraisingProgressPercent}% toward goal`
              : "";
          statusMessage = `${prospectCount} prospect${prospectCount === 1 ? "" : "s"} in Fundraising Planner${progressSuffix}.`;
        } else if (hasCompliance) {
          statusMessage = `${pendingComplianceCount} item${pendingComplianceCount === 1 ? "" : "s"} pending compliance review.`;
        } else if (isCompliance && pendingComplianceCount === 0) {
          statusMessage = "Compliance queue is clear — create assets to add records.";
        }

        let ctaLabel = `Go to ${item.title.split(" ")[0]}`;
        if (hasAssets) ctaLabel = "Open Asset Studio";
        else if (hasTasks) ctaLabel = "Open Tasks";
        else if (hasEvents) ctaLabel = "Open Planner";
        else if (hasResearch) ctaLabel = "Open Research Hub";
        else if (isFundraising) ctaLabel = "Open Fundraising Planner";
        else if (isCompliance) ctaLabel = "Open Compliance Dashboard";

        return (
          <Card
            key={item.title}
            className={
              needsComplianceReview
                ? "glass-hover border-amber-300/70 dark:border-amber-700/60"
                : "glass-hover"
            }
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                    <item.icon className="size-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  Phase {item.phase}
                </span>
              </div>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                {statusMessage}
              </p>
              <Button variant="outline" size="sm" render={<Link href={item.href} />}>
                {ctaLabel}
                <ArrowRight data-icon="inline-end" className="size-3.5" />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

/** @deprecated Use DashboardModuleCards */
export function DashboardEmptyStates(props: {
  assetCount?: number;
  taskCount?: number;
  upcomingEventCount?: number;
}) {
  return <DashboardModuleCards {...props} />;
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
      <dd className="mt-1">{value?.toString().trim() ? value : "—"}</dd>
    </div>
  );
}

function HighlightItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1">{value}</p>
    </div>
  );
}
