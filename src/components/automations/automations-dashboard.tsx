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
import type { DbWorkflowSchedule } from "@/lib/db/schema";
import { useAutomations } from "@/components/automations/automations-provider";
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
  synced: boolean;
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
    schedule.status === "pending_implementation"
      ? "Awaiting runner"
      : schedule.enabled
        ? "Enabled"
        : "Disabled";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide",
        schedule.status === "pending_implementation"
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
  synced,
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
          onCreate={() => openCreateDialog()}
        />
      ) : null}

      {activeTab === "planner" ? <PlannerSummaryTab /> : null}
      {activeTab === "compliance" ? <ComplianceQueueTab /> : null}
      {activeTab === "history" ? <RunHistoryTab /> : null}
    </div>
  );
}

function ScheduledRunsTab({
  schedules,
  onCreate,
}: {
  schedules: DbWorkflowSchedule[];
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
            <StatusBadge schedule={schedule} />
          </CardHeader>
          <CardContent>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {schedule.prompt}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PlannerSummaryTab() {
  const stubItems = [
    { day: "Mon", focus: "Field canvass — Ward 3", status: "draft" },
    { day: "Wed", focus: "Fundraiser prep call block", status: "scheduled" },
    { day: "Fri", focus: "Weekend GOTV asset review", status: "pending" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Read-only snapshot of the weekly plan. Full editing lives in{" "}
        <span className="font-medium text-foreground">Planner</span>.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {stubItems.map((item) => (
          <Card key={item.day} className="border-dashed">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wide">
                {item.day}
              </CardDescription>
              <CardTitle className="text-sm leading-snug">{item.focus}</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="inline-flex rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                {item.status}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Runner integration coming soon — scheduled planner automations will
        populate this view from workflow outputs.
      </p>
    </div>
  );
}

function ComplianceQueueTab() {
  const stubQueue = [
    { title: "Healthcare mailer", type: "Disclosure review", priority: "high" },
    { title: "Weekend social post", type: "AI-generated", priority: "medium" },
    { title: "Fundraising email", type: "Pending review", priority: "medium" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upcoming compliance scans and review items surfaced by automations.
      </p>
      <div className="grid gap-3">
        {stubQueue.map((item) => (
          <Card key={item.title} className="border-dashed">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
              <div>
                <CardTitle className="text-sm">{item.title}</CardTitle>
                <CardDescription>{item.type}</CardDescription>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide",
                  item.priority === "high"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "border-border bg-muted/40 text-muted-foreground",
                )}
              >
                {item.priority}
              </span>
            </CardHeader>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Live queue data will sync from Compliance when the workflow runner is
        enabled.
      </p>
    </div>
  );
}

function RunHistoryTab() {
  const stubRuns = [
    {
      name: "Weekly field plan",
      ranAt: "Mon 6:00 AM",
      status: "success" as const,
    },
    {
      name: "Compliance scan",
      ranAt: "Sun 11:00 PM",
      status: "success" as const,
    },
    {
      name: "Donor outreach drafts",
      ranAt: "Fri 8:00 AM",
      status: "pending" as const,
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Recent workflow executions — read-only until the runner is live.
      </p>
      <div className="grid gap-2">
        {stubRuns.map((run) => (
          <div
            key={run.name}
            className="glass-card flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{run.name}</p>
              <p className="text-xs text-muted-foreground">{run.ranAt}</p>
            </div>
            {run.status === "success" ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" aria-hidden />
                Success
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Queued</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
