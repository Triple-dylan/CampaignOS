"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { AgentMode } from "@/actions/chat";
import { createScheduledRun } from "@/actions/workflows";
import { useChat } from "@/components/chat/chat-provider";
import { useAutomations } from "@/components/automations/automations-provider";
import type { AutomationDialogPrefill } from "@/components/automations/automations-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  WEEKDAY_OPTIONS,
  WORKFLOW_AGENT_MODE_LABELS,
  WORKFLOW_AGENT_MODES,
  WORKFLOW_SCHEDULE_TYPE_LABELS,
  WORKFLOW_SCHEDULE_TYPES,
  WORKFLOW_SCHEDULE_TEMPLATES,
  type CreateWorkflowScheduleInput,
} from "@/lib/validators/workflows";

type CreateAutomationFormProps = {
  prefill: AutomationDialogPrefill;
  defaultAgentMode: AgentMode;
  onClose: () => void;
};

function CreateAutomationForm({
  prefill,
  defaultAgentMode,
  onClose,
}: CreateAutomationFormProps) {
  const router = useRouter();

  const [name, setName] = React.useState(prefill.name ?? "");
  const [prompt, setPrompt] = React.useState(prefill.prompt ?? "");
  const [selectedAgent, setSelectedAgent] =
    React.useState<CreateWorkflowScheduleInput["agentMode"]>(
      prefill.agentMode ?? defaultAgentMode,
    );
  const [scheduleType, setScheduleType] =
    React.useState<CreateWorkflowScheduleInput["scheduleType"]>("weekly");
  const [dayOfWeek, setDayOfWeek] = React.useState(1);
  const [hour, setHour] = React.useState(9);
  const [cronExpression, setCronExpression] = React.useState("0 9 * * 1");
  const [enabled, setEnabled] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const result = await createScheduledRun({
      name,
      prompt,
      agentMode: selectedAgent,
      scheduleType,
      cronExpression:
        scheduleType === "custom_cron" ? cronExpression : undefined,
      scheduleConfig: {
        hour,
        minute: 0,
        dayOfWeek,
        timezone: "America/Los_Angeles",
      },
      enabled,
    });

    setIsSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onClose();
    router.push("/automations");
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)}>
      <DialogHeader>
        <DialogTitle>Create scheduled run</DialogTitle>
        <DialogDescription>
          Run an agent on a recurring schedule — like Cursor Automations. Saved
          schedules can be executed manually with Run now.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label>Workflow template</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {WORKFLOW_SCHEDULE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  setName(template.name);
                  setPrompt(template.prompt);
                  setSelectedAgent(template.agentMode);
                  setScheduleType(template.scheduleType);
                  if ("cronExpression" in template && template.cronExpression) {
                    setCronExpression(template.cronExpression);
                  }
                }}
                className="rounded-lg border border-border bg-card/60 px-3 py-2 text-left text-sm transition-colors hover:border-ring hover:bg-card"
              >
                <span className="font-medium">{template.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground line-clamp-2">
                  {template.prompt}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="automation-name">Name</Label>
          <Input
            id="automation-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Weekly campaign plan"
            required
            maxLength={120}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="automation-prompt">Instruction</Label>
          <textarea
            id="automation-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Review last week's tasks and draft priorities for the field team…"
            required
            rows={4}
            className="w-full resize-none rounded-lg border border-input bg-background/60 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="automation-agent">Agent</Label>
            <Select
              id="automation-agent"
              value={selectedAgent}
              onChange={(event) =>
                setSelectedAgent(
                  event.target.value as CreateWorkflowScheduleInput["agentMode"],
                )
              }
            >
              {WORKFLOW_AGENT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {WORKFLOW_AGENT_MODE_LABELS[mode]}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="automation-schedule">Schedule</Label>
            <Select
              id="automation-schedule"
              value={scheduleType}
              onChange={(event) =>
                setScheduleType(
                  event.target
                    .value as CreateWorkflowScheduleInput["scheduleType"],
                )
              }
            >
              {WORKFLOW_SCHEDULE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {WORKFLOW_SCHEDULE_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {scheduleType === "weekly" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="automation-day">Day</Label>
              <Select
                id="automation-day"
                value={String(dayOfWeek)}
                onChange={(event) => setDayOfWeek(Number(event.target.value))}
              >
                {WEEKDAY_OPTIONS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="automation-hour">Hour (24h)</Label>
              <Input
                id="automation-hour"
                type="number"
                min={0}
                max={23}
                value={hour}
                onChange={(event) => setHour(Number(event.target.value))}
              />
            </div>
          </div>
        ) : null}

        {scheduleType === "daily" ? (
          <div className="space-y-2">
            <Label htmlFor="automation-hour-daily">Hour (24h)</Label>
            <Input
              id="automation-hour-daily"
              type="number"
              min={0}
              max={23}
              value={hour}
              onChange={(event) => setHour(Number(event.target.value))}
            />
          </div>
        ) : null}

        {scheduleType === "custom_cron" ? (
          <div className="space-y-2">
            <Label htmlFor="automation-cron">Cron expression</Label>
            <Input
              id="automation-cron"
              value={cronExpression}
              onChange={(event) => setCronExpression(event.target.value)}
              placeholder="0 9 * * 1"
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Standard 5-field cron (minute hour day month weekday).
            </p>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <input
            id="automation-enabled"
            type="checkbox"
            className="size-4 rounded border-input"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          <Label htmlFor="automation-enabled" className="cursor-pointer">
            Enabled when runner is live
          </Label>
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving || !name.trim() || !prompt.trim()}>
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            "Save schedule"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CreateAutomationDialog() {
  const { agentMode } = useChat();
  const { isCreateOpen, prefill, closeCreateDialog } = useAutomations();

  const formKey = [
    prefill.name ?? "",
    prefill.prompt ?? "",
    prefill.agentMode ?? "",
  ].join("|");

  return (
    <Dialog open={isCreateOpen} onOpenChange={(open) => !open && closeCreateDialog()}>
      <DialogContent className="sm:max-w-lg">
        {isCreateOpen ? (
          <CreateAutomationForm
            key={formKey}
            prefill={prefill}
            defaultAgentMode={agentMode}
            onClose={closeCreateDialog}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
