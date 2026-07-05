import { describe, expect, it } from "vitest";
import {
  computeNextRunAt,
  formatScheduleLabel,
  isScheduleDue,
  toCronExpression,
} from "@/lib/workflows/schedule";

describe("toCronExpression", () => {
  it("builds daily and weekly cron strings", () => {
    expect(
      toCronExpression({
        scheduleType: "daily",
        scheduleConfig: { hour: 9, minute: 30, dayOfWeek: 1, timezone: "UTC" },
      }),
    ).toBe("30 9 * * *");

    expect(
      toCronExpression({
        scheduleType: "weekly",
        scheduleConfig: { hour: 8, minute: 0, dayOfWeek: 3, timezone: "UTC" },
      }),
    ).toBe("0 8 * * 3");
  });
});

describe("formatScheduleLabel", () => {
  it("formats weekly schedules", () => {
    expect(
      formatScheduleLabel({
        scheduleType: "weekly",
        scheduleConfig: { hour: 9, minute: 0, dayOfWeek: 1 },
      }),
    ).toBe("Every Monday at 09:00");
  });
});

describe("computeNextRunAt", () => {
  it("returns a future ISO timestamp for weekly schedules", () => {
    const now = new Date("2026-07-01T12:00:00.000Z");
    const next = computeNextRunAt(
      {
        scheduleType: "weekly",
        scheduleConfig: { hour: 9, minute: 0, dayOfWeek: 3, timezone: "UTC" },
      },
      now,
    );

    expect(next).not.toBeNull();
    expect(new Date(next!).getTime()).toBeGreaterThan(now.getTime());
  });
});

describe("isScheduleDue", () => {
  it("marks schedules due when next_run_at is in the past", () => {
    const now = new Date("2026-07-01T12:00:00.000Z");
    expect(
      isScheduleDue(
        {
          enabled: true,
          schedule_type: "weekly",
          schedule_config: { hour: 9, minute: 0, dayOfWeek: 1 },
          cron_expression: "0 9 * * 1",
          last_run_at: null,
          next_run_at: "2026-07-01T11:00:00.000Z",
        },
        now,
      ),
    ).toBe(true);
  });

  it("does not run disabled schedules", () => {
    expect(
      isScheduleDue(
        {
          enabled: false,
          schedule_type: "daily",
          schedule_config: { hour: 9, minute: 0, dayOfWeek: 1 },
          cron_expression: "0 9 * * *",
          last_run_at: null,
          next_run_at: "2026-07-01T11:00:00.000Z",
        },
        new Date("2026-07-01T12:00:00.000Z"),
      ),
    ).toBe(false);
  });
});
