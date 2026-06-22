"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import {
  completeOnboarding,
  saveOnboardingStep,
  type OnboardingData,
} from "@/actions/campaigns";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { TagInput } from "@/components/onboarding/tag-input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BRAND_TONE_OPTIONS,
  ONBOARDING_STEPS,
  TOP_ISSUE_PRESETS,
  US_STATES,
  VOTER_SEGMENT_SUGGESTIONS,
  onboardingBasicsSchema,
  onboardingBrandSchema,
  onboardingFormSchema,
  onboardingFundraisingSchema,
  onboardingIssuesSchema,
  onboardingVotersSchema,
  type OnboardingFormInput,
  type OnboardingStep,
} from "@/lib/validators/onboarding";

const STEP_SCHEMAS = {
  basics: onboardingBasicsSchema,
  issues: onboardingIssuesSchema,
  voters: onboardingVotersSchema,
  brand: onboardingBrandSchema,
  fundraising: onboardingFundraisingSchema,
  review: onboardingFormSchema,
} as const;

const STEP_TITLES: Record<OnboardingStep, { title: string; description: string }> =
  {
    basics: {
      title: "Campaign basics",
      description:
        "Tell us about the candidate and the race. Washington defaults are pre-filled where helpful.",
    },
    issues: {
      title: "Top issues",
      description:
        "Select the policy priorities this campaign will lead with.",
    },
    voters: {
      title: "Target voter segments",
      description:
        "Define the audiences you need to persuade or turn out.",
    },
    brand: {
      title: "Brand tone",
      description:
        "Choose how the campaign should sound in messaging and content.",
    },
    fundraising: {
      title: "Fundraising goal",
      description:
        "Optional — set a target to track later in the fundraising module.",
    },
    review: {
      title: "Review & launch",
      description:
        "Confirm your campaign profile before entering the workspace.",
    },
  };

type OnboardingWizardProps = {
  initialData: OnboardingData;
};

export function OnboardingWizard({ initialData }: OnboardingWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentStep = ONBOARDING_STEPS[stepIndex];

  const defaultValues = useMemo<OnboardingFormInput>(
    () => ({
      candidateName: initialData.formDefaults.candidateName ?? "",
      officeSought: initialData.formDefaults.officeSought ?? "",
      jurisdiction: initialData.formDefaults.jurisdiction ?? "",
      state: initialData.formDefaults.state ?? "WA",
      district: initialData.formDefaults.district ?? "",
      party: initialData.formDefaults.party ?? "",
      electionDate: initialData.formDefaults.electionDate ?? "",
      topIssues: initialData.formDefaults.topIssues ?? [],
      voterSegments:
        initialData.formDefaults.voterSegments?.length &&
        initialData.formDefaults.voterSegments.length > 0
          ? initialData.formDefaults.voterSegments
          : [{ name: "", description: "" }],
      tonePreferences: {
        selectedTones: initialData.formDefaults.tonePreferences?.selectedTones ?? [],
        notes: initialData.formDefaults.tonePreferences?.notes ?? "",
      },
      fundraisingGoal: initialData.formDefaults.fundraisingGoal ?? null,
    }),
    [initialData.formDefaults],
  );

  const form = useForm<OnboardingFormInput>({
    defaultValues,
    mode: "onBlur",
  });

  async function validateCurrentStep() {
    const schema = STEP_SCHEMAS[currentStep];
    const values = form.getValues();
    const stepFields = getStepFields(currentStep);
    const stepData = stepFields.reduce(
      (acc, field) => {
        acc[field] = values[field as keyof OnboardingFormInput];
        return acc;
      },
      {} as Record<string, unknown>,
    );

    const parsed = schema.safeParse(stepData);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".") as keyof OnboardingFormInput | "tonePreferences.selectedTones";
        form.setError(path as keyof OnboardingFormInput, {
          message: issue.message,
        });
      }
      return false;
    }

    return true;
  }

  function goNext() {
    startTransition(async () => {
      setError(null);
      const valid = await validateCurrentStep();
      if (!valid) {
        return;
      }

      if (currentStep !== "review") {
        const result = await saveOnboardingStep(
          currentStep,
          getStepPayload(currentStep, form.getValues()),
        );

        if (!result.ok) {
          setError(result.error);
          return;
        }
      }

      setStepIndex((index) => Math.min(index + 1, ONBOARDING_STEPS.length - 1));
    });
  }

  function goBack() {
    setError(null);
    setStepIndex((index) => Math.max(index - 1, 0));
  }

  function handleSubmit() {
    startTransition(async () => {
      setError(null);
      const valid = await form.trigger();
      if (!valid) {
        return;
      }

      const result = await completeOnboarding(form.getValues());
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <OnboardingProgress steps={ONBOARDING_STEPS} currentStep={currentStep} />

      <Card>
        <CardHeader>
          <CardTitle>{STEP_TITLES[currentStep].title}</CardTitle>
          <CardDescription>{STEP_TITLES[currentStep].description}</CardDescription>
        </CardHeader>

        <Form {...form}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (currentStep === "review") {
                handleSubmit();
              } else {
                goNext();
              }
            }}
          >
            <CardContent className="space-y-4">
              {currentStep === "basics" ? <BasicsStep form={form} /> : null}
              {currentStep === "issues" ? <IssuesStep form={form} /> : null}
              {currentStep === "voters" ? <VotersStep form={form} /> : null}
              {currentStep === "brand" ? <BrandStep form={form} /> : null}
              {currentStep === "fundraising" ? <FundraisingStep form={form} /> : null}
              {currentStep === "review" ? (
                <ReviewStep values={form.getValues()} />
              ) : null}

              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </CardContent>

            <CardFooter className="flex items-center justify-between gap-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                disabled={stepIndex === 0 || isPending}
              >
                Back
              </Button>

              {currentStep === "review" ? (
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Launching…
                    </>
                  ) : (
                    "Complete onboarding"
                  )}
                </Button>
              ) : (
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}

function BasicsStep({
  form,
}: {
  form: ReturnType<typeof useForm<OnboardingFormInput>>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField
        control={form.control}
        name="candidateName"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Candidate name</FormLabel>
            <FormControl>
              <Input placeholder="Jane Doe" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="officeSought"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Office sought</FormLabel>
            <FormControl>
              <Input placeholder="State Senate" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="jurisdiction"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Jurisdiction</FormLabel>
            <FormControl>
              <Input placeholder="Washington State Legislature" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="state"
        render={({ field }) => (
          <FormItem>
            <FormLabel>State</FormLabel>
            <FormControl>
              <select
                {...field}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name} ({state.code})
                  </option>
                ))}
              </select>
            </FormControl>
            <FormDescription>Defaults to Washington (WA).</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="district"
        render={({ field }) => (
          <FormItem>
            <FormLabel>District</FormLabel>
            <FormControl>
              <Input placeholder="LD 34" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="party"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Party</FormLabel>
            <FormControl>
              <Input placeholder="Democratic" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="electionDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Election date</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function IssuesStep({
  form,
}: {
  form: ReturnType<typeof useForm<OnboardingFormInput>>;
}) {
  return (
    <FormField
      control={form.control}
      name="topIssues"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Top issues</FormLabel>
          <FormControl>
            <TagInput
              value={field.value}
              onChange={field.onChange}
              suggestions={TOP_ISSUE_PRESETS}
              placeholder="Type an issue and press Enter"
            />
          </FormControl>
          <FormDescription>
            Choose presets or add custom issues (up to 12).
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function VotersStep({
  form,
}: {
  form: ReturnType<typeof useForm<OnboardingFormInput>>;
}) {
  const segments = form.watch("voterSegments");

  function addSegment(name?: string) {
    form.setValue("voterSegments", [
      ...segments,
      { name: name ?? "", description: "" },
    ]);
  }

  function updateSegment(
    index: number,
    key: "name" | "description",
    value: string,
  ) {
    const next = [...segments];
    next[index] = { ...next[index], [key]: value };
    form.setValue("voterSegments", next, { shouldValidate: true });
  }

  function removeSegment(index: number) {
    form.setValue(
      "voterSegments",
      segments.filter((_, i) => i !== index),
      { shouldValidate: true },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {VOTER_SEGMENT_SUGGESTIONS.filter(
          (suggestion) => !segments.some((segment) => segment.name === suggestion),
        ).map((suggestion) => (
          <Button
            key={suggestion}
            type="button"
            variant="outline"
            size="xs"
            onClick={() => addSegment(suggestion)}
          >
            {suggestion}
          </Button>
        ))}
      </div>

      {segments.map((segment, index) => (
        <div
          key={`segment-${index}`}
          className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_1fr_auto]"
        >
          <Input
            placeholder="Segment name"
            value={segment.name}
            onChange={(event) => updateSegment(index, "name", event.target.value)}
          />
          <Input
            placeholder="Notes (optional)"
            value={segment.description ?? ""}
            onChange={(event) =>
              updateSegment(index, "description", event.target.value)
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeSegment(index)}
            disabled={segments.length <= 1}
          >
            Remove
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={() => addSegment()}>
        Add segment
      </Button>

      {form.formState.errors.voterSegments ? (
        <p className="text-sm text-destructive">
          {form.formState.errors.voterSegments.message ??
            form.formState.errors.voterSegments.root?.message}
        </p>
      ) : null}
    </div>
  );
}

function BrandStep({
  form,
}: {
  form: ReturnType<typeof useForm<OnboardingFormInput>>;
}) {
  const selectedTones = form.watch("tonePreferences.selectedTones");

  function toggleTone(tone: string) {
    const next = selectedTones.includes(tone)
      ? selectedTones.filter((item) => item !== tone)
      : [...selectedTones, tone];
    form.setValue("tonePreferences.selectedTones", next, {
      shouldValidate: true,
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <FormLabel>Brand tones</FormLabel>
        <div className="mt-2 flex flex-wrap gap-2">
          {BRAND_TONE_OPTIONS.map((tone) => {
            const selected = selectedTones.includes(tone);
            return (
              <button
                key={tone}
                type="button"
                onClick={() => toggleTone(tone)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted",
                )}
              >
                {tone}
              </button>
            );
          })}
        </div>
        {form.formState.errors.tonePreferences?.selectedTones ? (
          <p className="mt-2 text-sm text-destructive">
            {form.formState.errors.tonePreferences.selectedTones.message}
          </p>
        ) : null}
      </div>

      <FormField
        control={form.control}
        name="tonePreferences.notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Voice notes (optional)</FormLabel>
            <FormControl>
              <textarea
                {...field}
                rows={3}
                placeholder="Any phrases to use or avoid, local references, etc."
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function FundraisingStep({
  form,
}: {
  form: ReturnType<typeof useForm<OnboardingFormInput>>;
}) {
  return (
    <FormField
      control={form.control}
      name="fundraisingGoal"
      render={({ field }) => (
        <FormItem className="max-w-sm">
          <FormLabel>Fundraising goal (USD)</FormLabel>
          <FormControl>
            <Input
              type="number"
              min={0}
              step={1000}
              placeholder="250000"
              value={field.value ?? ""}
              onChange={(event) => {
                const raw = event.target.value;
                field.onChange(raw === "" ? null : Number(raw));
              }}
            />
          </FormControl>
          <FormDescription>Leave blank if not ready to set a target.</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function ReviewStep({ values }: { values: OnboardingFormInput }) {
  return (
    <dl className="grid gap-4 text-sm md:grid-cols-2">
      <ReviewItem label="Candidate" value={values.candidateName} />
      <ReviewItem label="Office" value={values.officeSought} />
      <ReviewItem label="Jurisdiction" value={values.jurisdiction} />
      <ReviewItem
        label="District / state"
        value={[values.district, values.state].filter(Boolean).join(", ")}
      />
      <ReviewItem label="Party" value={values.party || "—"} />
      <ReviewItem label="Election date" value={values.electionDate} />
      <ReviewItem label="Top issues" value={values.topIssues.join(", ")} className="md:col-span-2" />
      <ReviewItem
        label="Voter segments"
        value={values.voterSegments.map((s) => s.name).join(", ")}
        className="md:col-span-2"
      />
      <ReviewItem
        label="Brand tones"
        value={values.tonePreferences.selectedTones.join(", ")}
        className="md:col-span-2"
      />
      <ReviewItem
        label="Fundraising goal"
        value={
          values.fundraisingGoal != null
            ? `$${values.fundraisingGoal.toLocaleString()}`
            : "Not set"
        }
      />
    </dl>
  );
}

function ReviewItem({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

function getStepFields(step: OnboardingStep): string[] {
  switch (step) {
    case "basics":
      return [
        "candidateName",
        "officeSought",
        "jurisdiction",
        "state",
        "district",
        "party",
        "electionDate",
      ];
    case "issues":
      return ["topIssues"];
    case "voters":
      return ["voterSegments"];
    case "brand":
      return ["tonePreferences"];
    case "fundraising":
      return ["fundraisingGoal"];
    case "review":
      return [];
    default:
      return [];
  }
}

function getStepPayload(step: OnboardingStep, values: OnboardingFormInput) {
  const fields = getStepFields(step);
  return fields.reduce(
    (acc, field) => {
      acc[field] = values[field as keyof OnboardingFormInput];
      return acc;
    },
    {} as Record<string, unknown>,
  );
}
