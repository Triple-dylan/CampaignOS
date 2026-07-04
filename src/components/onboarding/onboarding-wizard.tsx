"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import {
  completeOnboarding,
  saveOnboardingStep,
  type OnboardingData,
} from "@/actions/campaigns";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { ChipMultiSelect } from "@/components/ui/chip-multi-select";
import { Combobox } from "@/components/ui/combobox";
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
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  BRAND_TONE_OPTIONS,
  FUNDRAISING_GOAL_PRESETS,
  OFFICE_DISTRICT_PLACEHOLDERS,
  OFFICE_SOUGHT_OPTIONS,
  ONBOARDING_STEPS,
  PARTY_OPTIONS,
  TOP_ISSUE_PRESETS,
  US_STATES,
  VOTER_SEGMENT_SUGGESTIONS,
  WA_STATE_CODE,
  getDefaultElectionDate,
  onboardingBasicsSchema,
  onboardingBrandSchema,
  onboardingFormSchema,
  onboardingIssuesSchema,
  onboardingVotersSchema,
  suggestJurisdictionForOffice,
  type OnboardingFormInput,
  type OnboardingStep,
} from "@/lib/validators/onboarding";

const STEP_SCHEMAS = {
  basics: onboardingBasicsSchema,
  issues: onboardingIssuesSchema,
  voters: onboardingVotersSchema,
  brand: onboardingBrandSchema,
  review: onboardingFormSchema,
} as const;

const STEP_TITLES: Record<OnboardingStep, { title: string; description: string }> =
  {
    basics: {
      title: "Campaign basics",
      description:
        "Pick your office and race details — Washington defaults are pre-filled.",
    },
    issues: {
      title: "Top issues",
      description: "Tap the priorities this campaign will lead with.",
    },
    voters: {
      title: "Target voter segments",
      description: "One-click select the audiences you need to reach.",
    },
    brand: {
      title: "Brand tone & fundraising",
      description:
        "Choose your voice and optionally set a fundraising target.",
    },
    review: {
      title: "Review & launch",
      description:
        "Confirm your campaign profile before entering the workspace.",
    },
  };

const OFFICE_COMBO_OPTIONS = OFFICE_SOUGHT_OPTIONS.map((office) => ({
  value: office,
  label: office,
}));

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
      state: initialData.formDefaults.state ?? WA_STATE_CODE,
      district: initialData.formDefaults.district ?? "",
      party: initialData.formDefaults.party ?? "",
      electionDate:
        initialData.formDefaults.electionDate ?? getDefaultElectionDate(),
      topIssues: initialData.formDefaults.topIssues ?? [],
      voterSegments:
        initialData.formDefaults.voterSegments?.filter((segment) =>
          segment.name.trim(),
        ) ?? [],
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-24 md:pb-0">
      <OnboardingProgress steps={ONBOARDING_STEPS} currentStep={currentStep} />

      <Card className="glass-card">
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
              {currentStep === "review" ? (
                <ReviewStep values={form.getValues()} />
              ) : null}

              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </CardContent>

            <CardFooter className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t bg-card/95 pb-safe backdrop-blur-sm md:static md:bg-transparent md:pb-0 md:backdrop-blur-none">
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
  const officeSought = form.watch("officeSought");
  const state = form.watch("state");
  const districtPlaceholder =
    OFFICE_DISTRICT_PLACEHOLDERS[officeSought] ?? "District or position";

  function handleOfficeChange(office: string) {
    form.setValue("officeSought", office, { shouldValidate: true });
    const currentJurisdiction = form.getValues("jurisdiction").trim();
    if (!currentJurisdiction) {
      const suggested = suggestJurisdictionForOffice(office, form.getValues("state"));
      if (suggested) {
        form.setValue("jurisdiction", suggested);
      }
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField
        control={form.control}
        name="candidateName"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Candidate name</FormLabel>
            <FormControl>
              <Input placeholder="Jane Doe" autoFocus {...field} />
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
              <Combobox
                value={field.value}
                onChange={handleOfficeChange}
                options={OFFICE_COMBO_OPTIONS}
                placeholder="Select an office…"
                searchPlaceholder="Search offices…"
                customLabel="Other office (custom)"
              />
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
              <Input
                placeholder={
                  suggestJurisdictionForOffice(officeSought, state) ??
                  "e.g. City of Seattle"
                }
                {...field}
              />
            </FormControl>
            <FormDescription>
              City, county, or legislative body — auto-suggested from office.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="district"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              District <span className="font-normal text-muted-foreground">(optional)</span>
            </FormLabel>
            <FormControl>
              <Input placeholder={districtPlaceholder} {...field} />
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
            <FormLabel>
              Party <span className="font-normal text-muted-foreground">(optional)</span>
            </FormLabel>
            <FormControl>
              <Select
                value={field.value ?? ""}
                onChange={(event) => field.onChange(event.target.value)}
              >
                <option value="">Prefer not to say</option>
                {PARTY_OPTIONS.map((party) => (
                  <option key={party} value={party}>
                    {party}
                  </option>
                ))}
              </Select>
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
            <FormDescription>
              Defaults to the next even-year general election.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="state"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>
              State{" "}
              {field.value === WA_STATE_CODE ? (
                <span className="font-normal text-muted-foreground">
                  — Washington (default)
                </span>
              ) : null}
            </FormLabel>
            <FormControl>
              <Select
                value={field.value}
                onChange={(event) => {
                  field.onChange(event.target.value);
                  const office = form.getValues("officeSought");
                  if (!form.getValues("jurisdiction").trim() && office) {
                    const suggested = suggestJurisdictionForOffice(
                      office,
                      event.target.value,
                    );
                    if (suggested) {
                      form.setValue("jurisdiction", suggested);
                    }
                  }
                }}
                className="max-w-xs"
              >
                {US_STATES.map((entry) => (
                  <option key={entry.code} value={entry.code}>
                    {entry.name} ({entry.code})
                  </option>
                ))}
              </Select>
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
            <ChipMultiSelect
              value={field.value}
              onChange={field.onChange}
              options={TOP_ISSUE_PRESETS}
              maxItems={12}
              customPlaceholder="Add a custom issue…"
            />
          </FormControl>
          <FormDescription>
            Tap to toggle — selected chips highlight in blue (up to 12).
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
  const selectedNames = segments.map((segment) => segment.name).filter(Boolean);
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});
  const [customDraft, setCustomDraft] = useState("");

  function setSegmentsFromNames(names: string[]) {
    const next = names.map((name) => {
      const existing = segments.find((segment) => segment.name === name);
      return existing ?? { name, description: "" };
    });
    form.setValue("voterSegments", next, { shouldValidate: true });
  }

  function toggleSuggestion(name: string) {
    if (selectedNames.includes(name)) {
      setSegmentsFromNames(selectedNames.filter((item) => item !== name));
      return;
    }
    setSegmentsFromNames([...selectedNames, name]);
  }

  function addCustomSegment() {
    const trimmed = customDraft.trim();
    if (!trimmed || selectedNames.includes(trimmed)) return;
    setSegmentsFromNames([...selectedNames, trimmed]);
    setCustomDraft("");
  }

  function updateSegmentNotes(index: number, description: string) {
    const next = [...segments];
    next[index] = { ...next[index], description };
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
      <div>
        <FormLabel>Common segments</FormLabel>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Voter segment presets">
          {VOTER_SEGMENT_SUGGESTIONS.map((suggestion) => {
            const selected = selectedNames.includes(suggestion);
            return (
              <button
                key={suggestion}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleSuggestion(suggestion)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background/60 backdrop-blur-sm hover:bg-muted dark:bg-input/30",
                )}
              >
                {suggestion}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          value={customDraft}
          onChange={(event) => setCustomDraft(event.target.value)}
          placeholder="Add a custom segment…"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustomSegment();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCustomSegment}
          disabled={!customDraft.trim()}
        >
          Add
        </Button>
      </div>

      {segments.length > 0 ? (
        <ul className="space-y-2">
          {segments.map((segment, index) => {
            const notesOpen = expandedNotes[index] ?? false;
            return (
              <li
                key={`${segment.name}-${index}`}
                className="rounded-lg border border-border/80 bg-background/40 p-3 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{segment.name}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() =>
                        setExpandedNotes((current) => ({
                          ...current,
                          [index]: !notesOpen,
                        }))
                      }
                    >
                      Notes
                      {notesOpen ? (
                        <ChevronUp className="size-3" />
                      ) : (
                        <ChevronDown className="size-3" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => removeSegment(index)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                {notesOpen ? (
                  <Input
                    className="mt-2"
                    placeholder="Optional notes about this segment…"
                    value={segment.description ?? ""}
                    onChange={(event) =>
                      updateSegmentNotes(index, event.target.value)
                    }
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Select at least one segment above to continue.
        </p>
      )}

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
  const [customGoal, setCustomGoal] = useState(false);

  function toggleTone(tone: string) {
    const next = selectedTones.includes(tone)
      ? selectedTones.filter((item) => item !== tone)
      : [...selectedTones, tone];
    form.setValue("tonePreferences.selectedTones", next, {
      shouldValidate: true,
    });
  }

  function selectGoalPreset(amount: number) {
    form.setValue("fundraisingGoal", amount, { shouldValidate: true });
    setCustomGoal(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <FormLabel>Brand tones</FormLabel>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Brand tone options">
          {BRAND_TONE_OPTIONS.map((tone) => {
            const selected = selectedTones.includes(tone);
            return (
              <button
                key={tone}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleTone(tone)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
                  selected
                    ? "border-primary bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_oklch(1_0_0_/_0.18)]"
                    : "border-border bg-background/60 backdrop-blur-sm hover:bg-muted dark:bg-input/30",
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
            <FormLabel>
              Voice notes{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </FormLabel>
            <FormControl>
              <textarea
                {...field}
                rows={3}
                placeholder="Phrases to use or avoid, local references, etc."
                className="w-full rounded-lg border border-input bg-background/60 px-2.5 py-2 text-sm backdrop-blur-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 dark:bg-input/30"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="fundraisingGoal"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Fundraising goal{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </FormLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {FUNDRAISING_GOAL_PRESETS.map((preset) => {
                const selected = field.value === preset.value && !customGoal;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => selectGoalPreset(preset.value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background/60 backdrop-blur-sm hover:bg-muted dark:bg-input/30",
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
              <button
                type="button"
                aria-pressed={customGoal || (field.value != null && !FUNDRAISING_GOAL_PRESETS.some((p) => p.value === field.value))}
                onClick={() => setCustomGoal(true)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
                  customGoal
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background/60 backdrop-blur-sm hover:bg-muted dark:bg-input/30",
                )}
              >
                Custom
              </button>
              <button
                type="button"
                onClick={() => {
                  form.setValue("fundraisingGoal", null);
                  setCustomGoal(false);
                }}
                className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Skip
              </button>
            </div>
            {customGoal ||
            (field.value != null &&
              !FUNDRAISING_GOAL_PRESETS.some((preset) => preset.value === field.value)) ? (
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  className="mt-3 max-w-xs"
                  placeholder="Enter amount in USD"
                  value={field.value ?? ""}
                  onChange={(event) => {
                    const raw = event.target.value;
                    field.onChange(raw === "" ? null : Number(raw));
                  }}
                />
              </FormControl>
            ) : null}
            <FormDescription>
              Quick-pick a target or skip — you can adjust this later.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
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
      return ["tonePreferences", "fundraisingGoal"];
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
