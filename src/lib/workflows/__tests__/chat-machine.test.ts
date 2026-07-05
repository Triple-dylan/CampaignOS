import { describe, expect, it } from "vitest";
import {
  applyFieldAnswer,
  readyToExecute,
  startWorkflowRun,
} from "@/lib/workflows/chat-machine";

describe("startWorkflowRun", () => {
  it("seeds intent from the triggering message for event research", () => {
    const state = startWorkflowRun(
      "event-research",
      "Prepare for a town hall on housing",
    );
    expect(state.workflowId).toBe("event-research");
    expect(state.phase).toBe("collecting");
    expect(state.fields.intent).toBe("Prepare for a town hall on housing");
    expect(state.stepIndex).toBe(1);
  });

  it("seeds district segments for campaign structure", () => {
    const state = startWorkflowRun(
      "campaign-structure",
      "LD 36 renters and young families",
    );
    expect(state.fields.districtSegments).toBe(
      "LD 36 renters and young families",
    );
    expect(state.stepIndex).toBe(1);
  });
});

describe("applyFieldAnswer", () => {
  it("advances to generating when all fields are collected", () => {
    let state = startWorkflowRun("content-creation", "Draft a flyer");
    state = applyFieldAnswer(state, "Housing affordability for renters on Instagram");
    expect(state.phase).toBe("generating");
    expect(readyToExecute(state)).toBe(true);
  });

  it("stays in collecting until required detail length is met", () => {
    let state = startWorkflowRun("event-research", "Town hall");
    state = applyFieldAnswer(state, "May 4");
    expect(state.phase).toBe("collecting");
    expect(readyToExecute(state)).toBe(false);
  });
});
