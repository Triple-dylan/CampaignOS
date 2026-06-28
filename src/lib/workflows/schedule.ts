import type { CreateWorkflowScheduleInput } from "@/lib/validators/workflows";

type ScheduleConfig = {
  hour: number;
  minute: number;
  dayOfWeek: number;
  timezone: string;
};

const DEFAULT_CONFIG: ScheduleConfig = {
  hour: 9,
  minute: 0,
  dayOfWeek: 1,
  timezone: "America/Los_Angeles",
};

/** Convert schedule type + config into a cron expression (UTC-agnostic stub). */
export function toCronExpression(input: {
  scheduleType: CreateWorkflowScheduleInput["scheduleType"];
  cronExpression?: string;
  scheduleConfig?: Partial<ScheduleConfig>;
}): string | null {
  if (input.scheduleType === "custom_cron") {
    return input.cronExpression?.trim() || null;
  }

  const config = { ...DEFAULT_CONFIG, ...input.scheduleConfig };

  if (input.scheduleType === "daily") {
    return `${config.minute} ${config.hour} * * *`;
  }

  return `${config.minute} ${config.hour} * * ${config.dayOfWeek}`;
}

/** Human-readable schedule label for list UI. */
export function formatScheduleLabel(input: {
  scheduleType: CreateWorkflowScheduleInput["scheduleType"];
  cronExpression?: string | null;
  scheduleConfig?: Partial<ScheduleConfig> | Record<string, unknown> | null;
}): string {
  const config = {
    ...DEFAULT_CONFIG,
    ...(input.scheduleConfig as Partial<ScheduleConfig> | undefined),
  };

  const time = `${String(config.hour).padStart(2, "0")}:${String(config.minute).padStart(2, "0")}`;
  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  switch (input.scheduleType) {
    case "daily":
      return `Daily at ${time}`;
    case "weekly":
      return `Every ${weekdays[config.dayOfWeek] ?? "Monday"} at ${time}`;
    case "custom_cron":
      return input.cronExpression?.trim() || "Custom schedule";
    default:
      return "Scheduled";
  }
}
