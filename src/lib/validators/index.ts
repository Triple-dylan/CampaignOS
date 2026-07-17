import { z } from "zod";

export * from "@/lib/validators/enums";
export * from "@/lib/validators/organizations";
export * from "@/lib/validators/campaigns";
export * from "@/lib/validators/onboarding";
export * from "@/lib/validators/assets";
export * from "@/lib/validators/calendar-events";
export * from "@/lib/validators/tasks";
export * from "@/lib/validators/team";

export const emailSchema = z.object({
  email: z.email("Enter a valid email address"),
});

export type EmailInput = z.infer<typeof emailSchema>;
