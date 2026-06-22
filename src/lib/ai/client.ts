import OpenAI from "openai";
import { isOpenAiConfigured } from "@/lib/ai/config";

let cachedClient: OpenAI | null | undefined;

export function getOpenAiClient(): OpenAI | null {
  if (!isOpenAiConfigured()) {
    return null;
  }

  if (cachedClient === undefined) {
    cachedClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return cachedClient;
}
