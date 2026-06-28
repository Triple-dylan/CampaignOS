import { z } from "zod";

export const WORKFLOW_SCHEDULE_TYPES = [
  "daily",
  "weekly",
  "custom_cron",
] as const;

export const WORKFLOW_SCHEDULE_STATUSES = [
  "pending_implementation",
  "active",
  "paused",
  "error",
] as const;

export const WORKFLOW_AGENT_MODES = [
  "campaign-manager",
  "content-strategist",
  "researcher",
  "fundraiser",
  "compliance-reviewer",
] as const;

export const WORKFLOW_SCHEDULE_TYPE_LABELS: Record<
  (typeof WORKFLOW_SCHEDULE_TYPES)[number],
  string
> = {
  daily: "Daily",
  weekly: "Weekly",
  custom_cron: "Custom cron",
};

export const WORKFLOW_AGENT_MODE_LABELS: Record<
  (typeof WORKFLOW_AGENT_MODES)[number],
  string
> = {
  "campaign-manager": "Campaign Manager",
  "content-strategist": "Content Strategist",
  researcher: "Researcher",
  fundraiser: "Fundraiser",
  "compliance-reviewer": "Compliance Reviewer",
};

export const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

const scheduleConfigSchema = z.object({
  hour: z.number().int().min(0).max(23).default(9),
  minute: z.number().int().min(0).max(59).default(0),
  dayOfWeek: z.number().int().min(0).max(6).default(1),
  timezone: z.string().default("America/Los_Angeles"),
});

export const createWorkflowScheduleSchema = z.object({
  campaignId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  prompt: z.string().trim().min(1).max(8000),
  agentMode: z.enum(WORKFLOW_AGENT_MODES).default("campaign-manager"),
  scheduleType: z.enum(WORKFLOW_SCHEDULE_TYPES).default("weekly"),
  cronExpression: z.string().trim().max(120).optional(),
  scheduleConfig: scheduleConfigSchema.optional(),
  enabled: z.boolean().default(true),
  createdBy: z.string().uuid().optional().nullable(),
});

export type CreateWorkflowScheduleInput = z.infer<
  typeof createWorkflowScheduleSchema
>;

export const updateWorkflowScheduleSchema = createWorkflowScheduleSchema
  .partial()
  .extend({
    id: z.string().uuid(),
    campaignId: z.string().uuid(),
  });

export type UpdateWorkflowScheduleInput = z.infer<
  typeof updateWorkflowScheduleSchema
>;
