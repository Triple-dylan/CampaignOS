"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { saveFundraisingPlan } from "@/actions/fundraising";
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
import { cn } from "@/lib/utils";
import type { DbFundraisingPlan } from "@/lib/db/schema";
import type { FundraisingTimelineMilestone } from "@/lib/validators/fundraising";
import { FUNDRAISING_GOAL_PRESETS } from "@/lib/validators/onboarding";

type PlanFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: DbFundraisingPlan | null;
  profileGoal: number | null;
  onSuccess?: () => void;
};

function milestonesToText(milestones: FundraisingTimelineMilestone[]): string {
  return milestones
    .map((milestone) => {
      const parts = [
        milestone.title,
        milestone.targetDate,
        milestone.targetAmount != null
          ? `$${milestone.targetAmount.toLocaleString()}`
          : undefined,
        milestone.notes,
      ].filter(Boolean);
      return parts.join(" | ");
    })
    .join("\n");
}

function parseMilestones(value: string): FundraisingTimelineMilestone[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      const title = parts[0] ?? line;
      const targetDate = parts[1];
      const amountPart = parts[2]?.replace(/[$,]/g, "");
      const targetAmount = amountPart ? Number(amountPart) : undefined;
      const notes = parts[3];

      return {
        title,
        targetDate: targetDate || undefined,
        targetAmount:
          targetAmount != null && !Number.isNaN(targetAmount)
            ? targetAmount
            : undefined,
        notes: notes || undefined,
      };
    });
}

function buildInitialFormState(
  plan: DbFundraisingPlan | null,
  profileGoal: number | null,
) {
  return {
    title: plan?.title ?? "Campaign fundraising plan",
    goalAmount:
      plan?.goal_amount != null
        ? String(plan.goal_amount)
        : profileGoal != null
          ? String(profileGoal)
          : "",
    raisedAmount:
      plan?.raised_amount != null ? String(plan.raised_amount) : "0",
    outreachStrategy: plan?.outreach_strategy ?? "",
    planBody: plan?.plan_body ?? "",
    milestonesText: milestonesToText(
      (plan?.timeline_json ?? []).filter(
        (entry): entry is FundraisingTimelineMilestone =>
          Boolean(entry.title?.trim()),
      ),
    ),
  };
}

export function PlanFormDialog({
  open,
  onOpenChange,
  plan,
  profileGoal,
  onSuccess,
}: PlanFormDialogProps) {
  const initial = buildInitialFormState(plan, profileGoal);
  const [title, setTitle] = useState(initial.title);
  const [goalAmount, setGoalAmount] = useState(initial.goalAmount);
  const [raisedAmount, setRaisedAmount] = useState(initial.raisedAmount);
  const [outreachStrategy, setOutreachStrategy] = useState(
    initial.outreachStrategy,
  );
  const [planBody, setPlanBody] = useState(initial.planBody);
  const [milestonesText, setMilestonesText] = useState(initial.milestonesText);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (next) {
      const nextInitial = buildInitialFormState(plan, profileGoal);
      setTitle(nextInitial.title);
      setGoalAmount(nextInitial.goalAmount);
      setRaisedAmount(nextInitial.raisedAmount);
      setOutreachStrategy(nextInitial.outreachStrategy);
      setPlanBody(nextInitial.planBody);
      setMilestonesText(nextInitial.milestonesText);
      setError(null);
    }
    onOpenChange(next);
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const goalValue = goalAmount.trim()
        ? Number(goalAmount.replace(/,/g, ""))
        : null;
      const raisedValue = raisedAmount.trim()
        ? Number(raisedAmount.replace(/,/g, ""))
        : 0;

      const result = await saveFundraisingPlan({
        title: title.trim(),
        goalAmount:
          goalValue != null && !Number.isNaN(goalValue) ? goalValue : null,
        raisedAmount:
          raisedValue != null && !Number.isNaN(raisedValue) ? raisedValue : 0,
        outreachStrategy: outreachStrategy.trim() || null,
        planBody: planBody.trim() || null,
        timeline: parseMilestones(milestonesText),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      onSuccess?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {plan ? "Edit fundraising plan" : "Create fundraising plan"}
          </DialogTitle>
          <DialogDescription>
            Set goals, track raised amounts, and define timeline milestones.
            {profileGoal != null
              ? ` Onboarding goal: $${profileGoal.toLocaleString()}.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label htmlFor="plan-title">Plan title</Label>
            <Input
              id="plan-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan-goal">Goal amount ($)</Label>
              <div className="flex flex-wrap gap-2">
                {FUNDRAISING_GOAL_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setGoalAmount(String(preset.value))}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      goalAmount === String(preset.value)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background/60 hover:bg-muted",
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <Input
                id="plan-goal"
                inputMode="numeric"
                value={goalAmount}
                onChange={(event) => setGoalAmount(event.target.value)}
                placeholder="Custom amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-raised">Raised amount ($)</Label>
              <Input
                id="plan-raised"
                inputMode="numeric"
                value={raisedAmount}
                onChange={(event) => setRaisedAmount(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-strategy">Outreach strategy</Label>
            <textarea
              id="plan-strategy"
              className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={outreachStrategy}
              onChange={(event) => setOutreachStrategy(event.target.value)}
              placeholder="Call time schedule, house party strategy, major donor tiers..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-milestones">Timeline milestones</Label>
            <textarea
              id="plan-milestones"
              className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={milestonesText}
              onChange={(event) => setMilestonesText(event.target.value)}
              placeholder={"Q1 house parties | 2026-03-31 | $25000\nFEC filing deadline | 2026-04-15"}
            />
            <p className="text-xs text-muted-foreground">
              One per line: title | date | target amount | notes
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-notes">Notes</Label>
            <textarea
              id="plan-notes"
              className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={planBody}
              onChange={(event) => setPlanBody(event.target.value)}
            />
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
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !title.trim()}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Save plan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
