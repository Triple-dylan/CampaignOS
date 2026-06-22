"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Brain, Loader2 } from "lucide-react";
import {
  generateCampaignBrain,
  type GenerateCampaignBrainResult,
} from "@/actions/ai";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type DashboardActionsProps = {
  isSetupComplete: boolean;
  hasCampaign: boolean;
  openAiConfigured: boolean;
  hasBrain: boolean;
};

export function DashboardActions({
  isSetupComplete,
  hasCampaign,
  openAiConfigured,
  hasBrain,
}: DashboardActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = openAiConfigured && hasCampaign && isSetupComplete;
  const buttonLabel = hasBrain ? "Regenerate Campaign Brain" : "Generate Campaign Brain";

  function handleResult(result: GenerateCampaignBrainResult) {
    if (result.ok) {
      setError(null);
      setConfirmOpen(false);
      router.refresh();
      return;
    }

    setError(result.error);
  }

  function runGeneration() {
    setError(null);
    startTransition(async () => {
      const result = await generateCampaignBrain();
      handleResult(result);
    });
  }

  function onPrimaryClick() {
    if (!canGenerate || isPending) {
      return;
    }

    if (hasBrain) {
      setConfirmOpen(true);
      return;
    }

    runGeneration();
  }

  const disabledReason = !openAiConfigured
    ? "Add OPENAI_API_KEY to enable AI generation"
    : !hasCampaign
      ? "Complete onboarding to create a campaign first"
      : !isSetupComplete
        ? "Finish onboarding before generating a Campaign Brain"
        : null;

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {disabledReason ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="inline-flex">
                  <Button disabled aria-describedby="brain-tooltip">
                    <Brain data-icon="inline-start" />
                    {buttonLabel}
                  </Button>
                </span>
              }
            />
            <TooltipContent id="brain-tooltip">{disabledReason}</TooltipContent>
          </Tooltip>
        ) : (
          <Button onClick={onPrimaryClick} disabled={isPending}>
            {isPending ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Brain data-icon="inline-start" />
            )}
            {isPending ? "Generating…" : buttonLabel}
          </Button>
        )}

        {!isSetupComplete ? (
          <Button variant="outline" render={<Link href="/onboarding" />}>
            Complete setup
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="max-w-md text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerate Campaign Brain?</DialogTitle>
            <DialogDescription>
              This replaces the current AI summary, message framework, and
              issue map. Graph nodes created by Campaign Brain will be refreshed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={runGeneration} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                  Regenerating…
                </>
              ) : (
                "Regenerate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
