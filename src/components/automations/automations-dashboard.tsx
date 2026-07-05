"use client";

import { useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  History,
  Plus,
  ShieldCheck,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import type { DbComplianceRecordWithAsset, DbWorkflowRun, DbWorkflowSchedule } from "@/lib/db/schema";
import type { DbCalendarEvent } from "@/lib/db/schema";
import { useAutomations } from "@/components/automations/automations-provider";
import { RunNowButton } from "@/components/automations/run-now-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatScheduleLabel } from "@/lib/workflows/schedule";
import {
  WORKFLOW_AGENT_MODE_LABELS,
  type CreateWorkflowScheduleInput,
} from "@/lib/validators/workflows";
import { cn } from "@/lib/utils";

type AutomationsDashboardProps = {
  schedules: DbWorkflowSchedule[];
  runs: DbWorkflowRun[];
  synced: boolean;
  upcomingEvents?: DbCalendarEvent[];
  pendingCompliance?: DbComplianceRecordWithAsset[];
};

type CommandTab = "scheduled" | "planner" | "compliance" | "history";

const TABS: Array<{
  id: CommandTab;
  label: string;
  icon: typeof CalendarClock;
}> = [
  { id: "scheduled", label: "Scheduled runs", icon: CalendarClock },
  { id: "planner", label: "Planner summary", icon: ClipboardList },
  { id: "compliance", label: "Compliance queue", icon: ShieldCheck },
  { id: "history", label: "Run history", icon: History },
];

function StatusBadge({ schedule }: { schedule: DbWorkflowSchedule }) {
  const label =
    schedule.status === "error"
      ? "Last run failed"
      : schedule.status === "pending_implementation"
        ? "Ready to run"
        : schedule.enabled
          ? "Enabled"
          : "Disabled";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide",
        schedule.status === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : schedule.status === "pending_implementation"
            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            : schedule.enabled
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-border bg-muted/50 text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

export function AutomationsDashboard({
  schedules,
  runs,
  synced,
  upcomingEvents = [],
  pendingCompliance = [],
}: AutomationsDashboardProps) {
  const { openCreateDialog } = useAutomations();
  const [activeTab, setActiveTab] = useState<CommandTab>("scheduled");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-3 md:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 flex overflow-x-auto px-1 pb-1 snap-x snap-mandatory md:inline-flex md:overflow-visible md:pb-0">
          <div className="inline-flex shrink-0 snap-start rounded-lg border border-border bg-card/60 p-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {tab.label}
              </button>
            );
          })}
          </div>
        </div>

        {activeTab === "scheduled" ? (
          <Button size="sm" onClick={() => openCreateDialog()}>
            <Plus className="size-4" aria-hidden />
            Create automation
          </Button>
        ) : null}
      </div>

      {!synced ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Database not connected — schedules won&apos;t persist until Supabase is
          configured.
        </p>
      ) : null}

      {activeTab === "scheduled" ? (
        <ScheduledRunsTab
          schedules={schedules}
          synced={synced}
          onCreate={() => openCreateDialog()}
        />
      ) : null}

      {activeTab === "planner" ? (
        <PlannerSummaryTab events={upcomingEvents} />
      ) : null}
      {activeTab === "compliance" ? (
        <ComplianceQueueTab records={pendingCompliance} />
      ) : null}
      {activeTab === "history" ? (
        <RunHistoryTab runs={runs} schedules={schedules} synced={synced} />
      ) : null}
    </div>
  );
}

function ScheduledRunsTab({
  schedules,
  synced,
  onCreate,
}: {
  schedules: DbWorkflowSchedule[];
  synced: boolean;
  onCreate: () => void;
}) {
  if (schedules.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="glass-card w-full max-w-2xl rounded-2xl border border-border p-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-border bg-card/70">
            <CalendarClock className="size-6 text-muted-foreground" aria-hidden />
          </div>
          <h2 className="font-heading text-lg font-semibold">
            No scheduled runs yet
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Automations run your campaign agents on a schedule — weekly field
            plans, compliance scans, and outreach drafts.
          </p>
          <Button className="mt-6" onClick={onCreate}>
            <Plus className="size-4" aria-hidden />
            Create automation
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Tip: type{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono">
              /schedule
            </code>{" "}
            in chat to save a message as a scheduled run.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {schedules.map((schedule) => (
        <Card
          key={schedule.id}
          className="transition-shadow hover:shadow-[var(--glass-shadow-pop)]"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
            <div className="min-w-0 space-y-1">
              <CardTitle className="truncate text-base">{schedule.name}</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" aria-hidden />
                  {formatScheduleLabel({
                    scheduleType:
                      schedule.schedule_type as CreateWorkflowScheduleInput["scheduleType"],
                    cronExpression: schedule.cron_expression,
                    scheduleConfig: schedule.schedule_config,
                  })}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="size-3.5" aria-hidden />
                  {WORKFLOW_AGENT_MODE_LABELS[
                    schedule.agent_mode as CreateWorkflowScheduleInput["agentMode"]
                  ] ?? schedule.agent_mode}
                </span>
              </CardDescription>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <StatusBadge schedule={schedule} />
              {synced ? <RunNowButton scheduleId={schedule.id} /> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {schedule.prompt}
            </p>
            {schedule.last_run_at ? (
              <p className="text-xs text-muted-foreground">
                Last run {formatRunTimestamp(schedule.last_run_at)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PlannerSummaryTab({ events }: { events: DbCalendarEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          No upcoming planner events in the next 7 days. Generate a timeline in{" "}
          <span className="font-medium text-foreground">Planner</span> or create
          events manually.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upcoming events from Planner (next 7 days). Full editing lives in{" "}
        <span className="font-medium text-foreground">Planner</span>.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <Card key={event.id}>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wide">
                {new Date(event.start_time).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </CardDescription>
              <CardTitle className="text-sm leading-snug">{event.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="inline-flex rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                {event.event_type.replace(/_/g, " ")}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ComplianceQueueTab({
  records,
}: {
  records: DbComplianceRecordWithAsset[];
}) {
  if (records.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          No pending compliance reviews. New assets from Asset Studio and workflow
          runs will appear here when review is required.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pending compliance reviews for this campaign.
      </p>
      <div className="grid gap-3">
        {records.map((record) => (
          <Card key={record.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
              <div>
                <CardTitle className="text-sm">
                  {record.asset?.title ?? "Campaign asset"}
                </CardTitle>
                <CardDescription>
                  {(record.content_type ?? "campaign_asset").replace(/_/g, " ")}
                  {record.ai_generated ? " · AI-generated" : ""}
                </CardDescription>
              </div>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
                {record.review_status}
              </span>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RunHistoryTab({
  runs,
  schedules,
  synced,
}: {
  runs: DbWorkflowRun[];
  schedules: DbWorkflowSchedule[];
  synced: boolean;
}) {
  const scheduleNames = new Map(
    schedules.map((schedule) => [schedule.id, schedule.name]),
  );

  if (!synced) {
    return (
      <p className="text-sm text-muted-foreground">
        Run history requires Supabase. Configure the database to see workflow
        executions.
      </p>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          No workflow runs yet. Use <strong>Run now</strong> on a scheduled
          automation to execute it manually.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Recent workflow executions for this campaign.
      </p>
      <div className="grid gap-2">
        {runs.map((run) => {
          const scheduleName =
            scheduleNames.get(run.schedule_id) ?? "Scheduled workflow";
          const isSuccess = run.status === "completed";
          const isFailed = run.status === "failed";
          const isRunning = run.status === "running";

          return (
            <div
              key={run.id}
              className="glass-card flex items-start justify-between gap-3 rounded-xl border border-border px-4 py-3"
            >
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-medium">{scheduleName}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {run.output_text?.trim() ||
                    run.error_message?.trim() ||
                    run.prompt_snapshot?.trim() ||
                    "No output recorded"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatRunTimestamp(
                    run.completed_at ?? run.started_at ?? run.created_at,
                  )}
                </p>
              </div>
              {isSuccess ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" aria-hidden />
                  Success
                </span>
              ) : isFailed ? (
                <span className="shrink-0 text-xs text-destructive">Failed</span>
              ) : isRunning ? (
                <span className="shrink-0 text-xs text-muted-foreground">
                  Running
                </span>
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {run.status.replace(/_/g, " ")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatRunTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
