import type { AssetGenerationOutput } from "@/lib/ai/schemas/asset";
import type { CampaignWorkflowId } from "@/lib/workflows/registry";
import { getCampaignWorkflow } from "@/lib/workflows/registry";
import {
  WORKFLOW_COLLECT_STEPS,
  type WorkflowFieldKey,
  type WorkflowFields,
} from "@/lib/workflows/chat-fields";

export type WorkflowPhase =
  | "collecting"
  | "generating"
  | "previewing"
  | "saving"
  | "complete"
  | "error";

export type WorkflowRunState = {
  workflowId: CampaignWorkflowId;
  stepIndex: number;
  phase: WorkflowPhase;
  fields: WorkflowFields;
  progressLabel: string;
  error?: string;
  artifactLink?: string;
  artifactLabel?: string;
  /** Content-creation draft previews before save. */
  drafts?: AssetGenerationOutput[];
};

export type WorkflowAssistantReply = {
  content: string;
  state: WorkflowRunState | null;
};

function progressLabelForPhase(
  workflowId: CampaignWorkflowId,
  phase: WorkflowPhase,
  stepIndex: number,
): string {
  if (phase === "generating") {
    switch (workflowId) {
      case "event-research":
      case "incumbent-research":
        return "Generating report…";
      case "content-creation":
        return "Generating drafts…";
      case "content-calendar":
        return "Generating content calendar…";
      case "campaign-structure":
        return "Generating timeline…";
    }
  }
  if (phase === "saving") {
    switch (workflowId) {
      case "event-research":
      case "incumbent-research":
        return "Saving to Research…";
      case "content-creation":
        return "Saving to Asset Studio…";
      case "content-calendar":
        return "Saving to Planner…";
      case "campaign-structure":
        return "Saving to Planner and Tasks…";
    }
  }
  if (phase === "previewing") return "Review drafts…";
  if (phase === "complete") return "Workflow complete";
  if (phase === "error") return "Workflow error";

  const steps = WORKFLOW_COLLECT_STEPS[workflowId];
  return steps[stepIndex]?.progressLabel ?? "Collecting details…";
}

export function startWorkflowRun(
  workflowId: CampaignWorkflowId,
  initialMessage: string,
): WorkflowRunState {
  const steps = WORKFLOW_COLLECT_STEPS[workflowId];
  const fields: WorkflowFields = {};

  // Seed intent/district from the triggering message when applicable.
  if (
    workflowId === "event-research" ||
    workflowId === "content-creation" ||
    workflowId === "content-calendar" ||
    workflowId === "incumbent-research"
  ) {
    fields.intent = initialMessage.trim();
  }
  if (workflowId === "campaign-structure") {
    fields.districtSegments = initialMessage.trim();
  }

  let stepIndex = 0;
  while (stepIndex < steps.length && steps[stepIndex].isComplete(fields)) {
    stepIndex += 1;
  }

  return {
    workflowId,
    stepIndex,
    phase: "collecting",
    fields,
    progressLabel: progressLabelForPhase(workflowId, "collecting", stepIndex),
  };
}

export function applyFieldAnswer(
  state: WorkflowRunState,
  userMessage: string,
): WorkflowRunState {
  const steps = WORKFLOW_COLLECT_STEPS[state.workflowId];
  const currentStep = steps[state.stepIndex];
  if (!currentStep) return state;

  const fields: WorkflowFields = {
    ...state.fields,
    [currentStep.field]: userMessage.trim(),
  };

  if (!currentStep.isComplete(fields)) {
    return {
      ...state,
      fields,
      phase: "collecting",
      progressLabel: progressLabelForPhase(
        state.workflowId,
        "collecting",
        state.stepIndex,
      ),
    };
  }

  let stepIndex = state.stepIndex + 1;
  while (stepIndex < steps.length && steps[stepIndex].isComplete(fields)) {
    stepIndex += 1;
  }

  const collecting = stepIndex < steps.length;
  return {
    ...state,
    fields,
    stepIndex,
    phase: collecting ? "collecting" : "generating",
    progressLabel: collecting
      ? progressLabelForPhase(state.workflowId, "collecting", stepIndex)
      : progressLabelForPhase(state.workflowId, "generating", stepIndex),
  };
}

export function promptForCurrentStep(state: WorkflowRunState): string {
  const steps = WORKFLOW_COLLECT_STEPS[state.workflowId];
  const step = steps[state.stepIndex];
  if (!step) return "";

  const workflow = getCampaignWorkflow(state.workflowId);
  return [
    `**${workflow.name}** — ${step.progressLabel.replace("…", "")}`,
    "",
    step.prompt,
    "",
    "_Reply with the details, or type **cancel** to exit this workflow._",
  ].join("\n");
}

export function markPreviewing(input: {
  state: WorkflowRunState;
  drafts: AssetGenerationOutput[];
}): WorkflowAssistantReply {
  const lines = [
    "**Content drafts ready**",
    "",
    "Review the options below. Reply **save** for draft 1, **save 2** or **save 3** for another, or **cancel** to exit.",
    "",
  ];

  input.drafts.forEach((draft, index) => {
    lines.push(
      `### Draft ${index + 1}: ${draft.title}`,
      draft.content.slice(0, 400) + (draft.content.length > 400 ? "…" : ""),
      "",
    );
  });

  return {
    content: lines.join("\n"),
    state: {
      ...input.state,
      phase: "previewing",
      drafts: input.drafts,
      progressLabel: "Review drafts…",
    },
  };
}

export function parseDraftSelection(message: string): number | null {
  const normalized = message.trim().toLowerCase();
  if (normalized === "save" || normalized === "save 1" || normalized === "save draft 1") {
    return 0;
  }
  const match = normalized.match(/save(?: draft)?\s*(\d)/);
  if (match) {
    const index = Number(match[1]) - 1;
    return index >= 0 ? index : null;
  }
  return null;
}

export function isPreviewConfirmMessage(message: string): boolean {
  return parseDraftSelection(message) !== null;
}

export function readyToExecute(state: WorkflowRunState): boolean {
  return state.phase === "generating";
}

export function readyToPreview(state: WorkflowRunState): boolean {
  return state.phase === "generating" && state.workflowId === "content-creation";
}

export function markSaving(state: WorkflowRunState): WorkflowRunState {
  return {
    ...state,
    phase: "saving",
    progressLabel: progressLabelForPhase(state.workflowId, "saving", state.stepIndex),
  };
}

export function markComplete(input: {
  state: WorkflowRunState;
  artifactLink: string;
  artifactLabel: string;
  summary: string;
}): WorkflowAssistantReply {
  const workflow = getCampaignWorkflow(input.state.workflowId);
  return {
    content: [
      `**${workflow.name} complete**`,
      "",
      input.summary,
      "",
      `Open in ${input.artifactLabel}: ${input.artifactLink}`,
    ].join("\n"),
    state: {
      ...input.state,
      phase: "complete",
      progressLabel: "Workflow complete",
      artifactLink: input.artifactLink,
      artifactLabel: input.artifactLabel,
    },
  };
}

export function markError(
  state: WorkflowRunState,
  error: string,
): WorkflowAssistantReply {
  return {
    content: [
      `**Workflow error**`,
      "",
      error,
      "",
      "You can try again with a new message, or type **cancel** to exit.",
    ].join("\n"),
    state: {
      ...state,
      phase: "error",
      progressLabel: "Workflow error",
      error,
    },
  };
}

export function initialWorkflowReply(state: WorkflowRunState): string {
  const steps = WORKFLOW_COLLECT_STEPS[state.workflowId];
  const workflow = getCampaignWorkflow(state.workflowId);

  if (state.stepIndex >= steps.length) {
    return `Starting **${workflow.name}** — generating now…`;
  }

  const step = steps[state.stepIndex];
  return [
    `Starting **${workflow.name}**.`,
    "",
    step.prompt,
    "",
    "_Reply with the details, or type **cancel** to exit this workflow._",
  ].join("\n");
}

export function nextFieldKey(state: WorkflowRunState): WorkflowFieldKey | null {
  const steps = WORKFLOW_COLLECT_STEPS[state.workflowId];
  return steps[state.stepIndex]?.field ?? null;
}
