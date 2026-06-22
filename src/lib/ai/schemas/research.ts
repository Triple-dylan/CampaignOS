import { z } from "zod";
import { researchSourceSchema } from "@/lib/validators/research-briefs";

export const researchGenerationOutputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1),
  key_findings: z.array(z.string().trim().min(1)).min(1),
  sources: z.array(researchSourceSchema).optional(),
  related_issues: z.array(z.string().trim().min(1)).optional(),
});

export type ResearchGenerationOutput = z.infer<
  typeof researchGenerationOutputSchema
>;
