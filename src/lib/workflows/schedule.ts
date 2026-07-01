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

type ScheduleLike = {
  enabled: boolean;
  schedule_type: string;
  schedule_config?: Partial<ScheduleConfig> | Record<string, unknown> | null;
  cron_expression?: string | null;
  last_run_at?: string | null;
  next_run_at?: string | null;
};

function readConfig(
  scheduleConfig?: Partial<ScheduleConfig> | Record<string, unknown> | null,
): ScheduleConfig {
  const raw = scheduleConfig ?? {};
  return {
    hour:
      typeof raw.hour === "number"
        ? raw.hour
        : DEFAULT_CONFIG.hour,
    minute:
      typeof raw.minute === "number"
        ? raw.minute
        : DEFAULT_CONFIG.minute,
    dayOfWeek:
      typeof raw.dayOfWeek === "number"
        ? raw.dayOfWeek
        : DEFAULT_CONFIG.dayOfWeek,
    timezone:
      typeof raw.timezone === "string"
        ? raw.timezone
        : DEFAULT_CONFIG.timezone,
  };
}

/** Next run timestamp (UTC) for daily/weekly schedules. */
export function computeNextRunAt(
  input: {
    scheduleType: CreateWorkflowScheduleInput["scheduleType"];
    cronExpression?: string | null;
    scheduleConfig?: Partial<ScheduleConfig> | Record<string, unknown> | null;
  },
  fromDate: Date = new Date(),
): string | null {
  if (input.scheduleType === "custom_cron") {
    return new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  const config = readConfig(input.scheduleConfig);
  const candidate = new Date(fromDate);
  candidate.setUTCSeconds(0, 0);
  candidate.setUTCHours(config.hour, config.minute, 0, 0);

  if (input.scheduleType === "weekly") {
    const dayDelta = (config.dayOfWeek - candidate.getUTCDay() + 7) % 7;
    candidate.setUTCDate(candidate.getUTCDate() + dayDelta);
    if (candidate.getTime() <= fromDate.getTime()) {
      candidate.setUTCDate(candidate.getUTCDate() + 7);
    }
    return candidate.toISOString();
  }

  if (candidate.getTime() <= fromDate.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }

  return candidate.toISOString();
}

/** True when an enabled schedule should execute now. */
export function isScheduleDue(schedule: ScheduleLike, now: Date = new Date()): boolean {
  if (!schedule.enabled) return false;

  if (schedule.next_run_at) {
    const next = new Date(schedule.next_run_at);
    if (!Number.isNaN(next.getTime()) && next.getTime() <= now.getTime()) {
      return true;
    }
  }

  if (schedule.last_run_at) {
    const last = new Date(schedule.last_run_at);
    if (!Number.isNaN(last.getTime())) {
      const minIntervalMs =
        schedule.schedule_type === "daily"
          ? 23 * 60 * 60 * 1000
          : 6 * 24 * 60 * 60 * 1000;
      if (now.getTime() - last.getTime() < minIntervalMs) {
        return false;
      }
    }
  }

  const config = readConfig(schedule.schedule_config);
  const matchesDay =
    schedule.schedule_type === "daily" ||
    now.getUTCDay() === config.dayOfWeek;
  const matchesHour = now.getUTCHours() > config.hour ||
    (now.getUTCHours() === config.hour && now.getUTCMinutes() >= config.minute);

  return matchesDay && matchesHour;
}

/** Convert schedule type + config into a cron expression (UTC-agnostic). */
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
  const config = readConfig(input.scheduleConfig);

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
