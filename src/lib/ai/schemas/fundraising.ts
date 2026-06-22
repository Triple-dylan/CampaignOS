import { z } from "zod";

export const prospectOutreachOutputSchema = z.object({
  subject: z.string().trim().optional(),
  opening: z.string().trim().min(1),
  talking_points: z.array(z.string().trim().min(1)).min(1),
  ask: z.string().trim().min(1),
  follow_up: z.string().trim().min(1),
  script: z.string().trim().min(1),
});

export type ProspectOutreachOutput = z.infer<typeof prospectOutreachOutputSchema>;
