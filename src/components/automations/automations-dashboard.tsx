"use client";

import { CalendarClock, Clock, Plus, Sparkles } from "lucide-react";
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
import {
  formatScheduleLabel,
} from "@/lib/workflows/schedule";
import {
  WORKFLOW_AGENT_MODE_LABELS,
  type CreateWorkflowScheduleInput,
} from "@/lib/validators/workflows";
import { cn } from "@/lib/utils";

type AutomationsDashboardProps = {
  schedules: DbWorkflowSchedule[];
  synced: boolean;
};

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

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Recurring agent runs for your campaign — weekly plans, compliance
            checks, donor outreach drafts, and more.
          </p>
          {!synced ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Database not connected — schedules won&apos;t persist until
              Supabase is configured.
            </p>
          ) : null}
        </div>
        <Button onClick={() => openCreateDialog()}>
          <Plus className="size-4" aria-hidden />
          Create automation
        </Button>
      </div>

      {schedules.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-2xl border border-border bg-card shadow-[var(--shadow-panel)]">
              <CalendarClock className="size-6 text-muted-foreground" aria-hidden />
            </div>
            <CardTitle>No scheduled runs yet</CardTitle>
            <CardDescription className="max-w-md">
              Automations run your campaign agents on a schedule — like
              &ldquo;Every Monday, generate the weekly field plan&rdquo; or
              &ldquo;Daily compliance scan on new assets.&rdquo;
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 pb-8">
            <Button onClick={() => openCreateDialog()}>
              <Plus className="size-4" aria-hidden />
              Create automation
            </Button>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              Tip: type{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">
                /schedule
              </code>{" "}
              in chat to save a message as a scheduled run.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {schedules.map((schedule) => (
            <Card
              key={schedule.id}
              className="shadow-[var(--shadow-panel)] transition-shadow hover:shadow-[var(--shadow-pop)]"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="truncate text-base">
                    {schedule.name}
                  </CardTitle>
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
      )}
    </div>
  );
}
