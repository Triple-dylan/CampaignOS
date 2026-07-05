import { describe, expect, it } from "vitest";
import {
  detectWorkflowFromMessage,
  isWorkflowCancelMessage,
} from "@/lib/workflows/detect";

describe("detectWorkflowFromMessage", () => {
  it("detects event research triggers", () => {
    expect(detectWorkflowFromMessage("Help me with town hall prep")).toBe(
      "event-research",
    );
    expect(detectWorkflowFromMessage("debate prep for next week")).toBe(
      "event-research",
    );
  });

  it("detects content creation triggers", () => {
    expect(detectWorkflowFromMessage("write a social post about housing")).toBe(
      "content-creation",
    );
  });

  it("detects campaign structure triggers", () => {
    expect(detectWorkflowFromMessage("build a campaign timeline")).toBe(
      "campaign-structure",
    );
    expect(detectWorkflowFromMessage("plan voter segments for LD 36")).toBe(
      "campaign-structure",
    );
  });

  it("detects incumbent research triggers", () => {
    expect(detectWorkflowFromMessage("compare candidates in this race")).toBe(
      "incumbent-research",
    );
  });

  it("returns null for unrelated messages", () => {
    expect(detectWorkflowFromMessage("what is the weather")).toBeNull();
  });
});

describe("isWorkflowCancelMessage", () => {
  it("recognizes cancel phrases", () => {
    expect(isWorkflowCancelMessage("cancel")).toBe(true);
    expect(isWorkflowCancelMessage("Cancel workflow please")).toBe(true);
    expect(isWorkflowCancelMessage("never mind")).toBe(true);
  });

  it("does not treat normal messages as cancel", () => {
    expect(isWorkflowCancelMessage("cancel the event on Tuesday")).toBe(false);
  });
});
