import OpenAI from "openai";
import { logger } from "@/lib/logger";

let client: OpenAI | null = null;

export function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || "",
      baseURL: (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com") + "/v1",
      timeout: 30000,
      maxRetries: 2,
    });
  }
  return client;
}

export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, label = "LLM"): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      if (i < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, i), 8000);
        logger.warn(label + " retry " + (i + 1) + "/" + maxRetries + " after " + delay + "ms", { message: e.message });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  logger.error(label + " all retries exhausted", { message: lastError?.message });
  throw lastError || new Error(label + " failed after " + maxRetries + " retries");
}
