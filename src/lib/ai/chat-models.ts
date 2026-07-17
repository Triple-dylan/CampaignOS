/**
 * Composer-facing model + effort choices for workspace chat.
 * Kept client-safe (no secrets) so the chat bar can render selectors before
 * the OpenAI key is configured; the server action resolves the final request.
 */

export const CHAT_MODELS = [
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    description: "Fast default for everyday campaign work",
    supportsReasoningEffort: false,
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    description: "Stronger drafting and multi-step answers",
    supportsReasoningEffort: false,
  },
  {
    id: "o4-mini",
    label: "o4-mini",
    description: "Reasoning model — effort controls thinking depth",
    supportsReasoningEffort: true,
  },
  {
    id: "o3-mini",
    label: "o3-mini",
    description: "Deeper reasoning for research and strategy",
    supportsReasoningEffort: true,
  },
] as const;

export type ChatModelId = (typeof CHAT_MODELS)[number]["id"];

export const CHAT_EFFORTS = [
  {
    id: "low",
    label: "Low",
    description: "Quick answers, less deliberation",
  },
  {
    id: "medium",
    label: "Medium",
    description: "Balanced depth for most asks",
  },
  {
    id: "high",
    label: "High",
    description: "More thorough reasoning when it matters",
  },
] as const;

export type ChatEffortId = (typeof CHAT_EFFORTS)[number]["id"];

export const DEFAULT_CHAT_MODEL: ChatModelId = "gpt-4o-mini";
export const DEFAULT_CHAT_EFFORT: ChatEffortId = "medium";

export function isChatModelId(value: string): value is ChatModelId {
  return CHAT_MODELS.some((model) => model.id === value);
}

export function isChatEffortId(value: string): value is ChatEffortId {
  return CHAT_EFFORTS.some((effort) => effort.id === value);
}

export function getChatModel(id: ChatModelId) {
  return CHAT_MODELS.find((model) => model.id === id) ?? CHAT_MODELS[0];
}

export function getChatEffort(id: ChatEffortId) {
  return CHAT_EFFORTS.find((effort) => effort.id === id) ?? CHAT_EFFORTS[1];
}

/** Temperature fallback for non-reasoning chat models. */
export function temperatureForEffort(effort: ChatEffortId): number {
  switch (effort) {
    case "low":
      return 0.4;
    case "high":
      return 0.75;
    default:
      return 0.6;
  }
}
