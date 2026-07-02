"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { OnboardingStep } from "@/lib/validators/onboarding";

const STEP_LABELS: Record<OnboardingStep, string> = {
  basics: "Basics",
  issues: "Issues",
  voters: "Voters",
  brand: "Brand & goals",
  review: "Review",
};

type OnboardingProgressProps = {
  steps: readonly OnboardingStep[];
  currentStep: OnboardingStep;
};

export function OnboardingProgress({
  steps,
  currentStep,
}: OnboardingProgressProps) {
  const currentIndex = steps.indexOf(currentStep);

  return (
    <nav aria-label="Onboarding progress" className="w-full space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Step {currentIndex + 1} of {steps.length}
      </p>
      <ol className="flex flex-wrap items-center gap-2 md:gap-0">
        {steps.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = step === currentStep;

          return (
            <li key={step} className="flex items-center">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium transition-colors md:px-3",
                  isCurrent && "bg-primary text-primary-foreground",
                  isComplete && "text-foreground",
                  !isCurrent && !isComplete && "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border text-[10px]",
                    isCurrent && "border-primary-foreground/30 bg-primary-foreground/10",
                    isComplete && "border-primary bg-primary text-primary-foreground",
                    !isCurrent && !isComplete && "border-border",
                  )}
                >
                  {isComplete ? <Check className="size-3" /> : index + 1}
                </span>
                <span className="hidden sm:inline">{STEP_LABELS[step]}</span>
              </div>
              {index < steps.length - 1 ? (
                <div
                  className={cn(
                    "mx-1 hidden h-px w-6 md:block lg:w-10",
                    index < currentIndex ? "bg-primary" : "bg-border",
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
