import type { SocialAssetTemplate } from "@/lib/assets/social-templates";
import { isIntegrationsDemoMode } from "@/lib/integrations/token-crypto";

export type TemplateGenerationResult = {
  fileUrl: string;
  externalId: string;
  externalUrl: string;
  provider: "canva" | "higgsfield";
};

export async function generateFromCanvaTemplate(input: {
  accessToken?: string;
  template: SocialAssetTemplate;
  theme?: string;
  issue?: string;
  candidateName: string;
}): Promise<TemplateGenerationResult> {
  if (isIntegrationsDemoMode() || !input.accessToken) {
    const slug = input.template.id;
    return {
      provider: "canva",
      externalId: `demo-canva-${slug}`,
      externalUrl: `https://www.canva.com/design/demo-${slug}`,
      fileUrl: `https://placehold.co/${input.template.dimensions.replace(/\s+/g, "")}/png?text=${encodeURIComponent(input.candidateName)}`,
    };
  }

  // Production: Canva Autofill + Export API
  throw new Error(
    "Canva OAuth is connected but server-side autofill is not configured for this environment.",
  );
}

export async function generateFromHiggsfieldTemplate(input: {
  accessToken?: string;
  template: SocialAssetTemplate;
  theme?: string;
  issue?: string;
  candidateName: string;
}): Promise<TemplateGenerationResult> {
  if (isIntegrationsDemoMode() || !input.accessToken) {
    const slug = input.template.id;
    const prompt = [input.theme, input.issue, input.candidateName]
      .filter(Boolean)
      .join(" — ");
    return {
      provider: "higgsfield",
      externalId: `demo-higgsfield-${slug}`,
      externalUrl: `https://higgsfield.ai/generations/demo-${slug}`,
      fileUrl: `https://placehold.co/${input.template.dimensions.replace(/\s+/g, "")}/jpg?text=${encodeURIComponent(prompt.slice(0, 40))}`,
    };
  }

  throw new Error(
    "Higgsfield OAuth is connected but MCP generation is not configured for this environment.",
  );
}
