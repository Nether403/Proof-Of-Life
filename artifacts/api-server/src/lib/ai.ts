import Anthropic from "@anthropic-ai/sdk";

let cachedClient: Anthropic | null = null;

export function getAnthropic(): Anthropic | null {
  if (
    !process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL ||
    !process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY
  ) {
    return null;
  }
  if (!cachedClient) {
    cachedClient = new Anthropic({
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
    });
  }
  return cachedClient;
}

export const AI_MODEL = "claude-sonnet-4-6";
