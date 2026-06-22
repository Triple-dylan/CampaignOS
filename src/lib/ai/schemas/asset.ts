import { z } from "zod";

export const assetGenerationOutputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1),
  theme: z.string().trim().optional(),
  issue: z.string().trim().optional(),
  channel: z.string().trim().optional(),
});

export type AssetGenerationOutput = z.infer<typeof assetGenerationOutputSchema>;
