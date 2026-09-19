import OpenAI from "openai";
import { getEnv } from "@/lib/env";

export const OPENAI_REQUEST_TIMEOUT_MS = 15_000;

export function createOpenAIClient(): OpenAI | null {
  const env = getEnv();
  if (!env.isOpenAIConfigured) {
    return null;
  }

  return new OpenAI({
    apiKey: env.openaiApiKey,
    timeout: OPENAI_REQUEST_TIMEOUT_MS,
    maxRetries: 0,
  });
}
