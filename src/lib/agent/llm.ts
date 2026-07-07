/**
 * DeepSeek V4 LLM Client (migrated from deepseek-chat, July 2026)
 *
 * deepseek-chat was deprecated — deadline: 2026-07-24.
 * Now using deepseek-v4-pro (primary reasoning) and deepseek-v4-flash (fast/cheap).
 *
 * V4 key capabilities:
 *   - 1M token context window (up from 32K)
 *   - reasoning_effort: low | medium | high | max
 *   - Prompt caching: ¥0.02/M tokens cache-hit vs ¥1/M miss (120x price gap)
 *   - 384K max output tokens
 *
 * Strategy: Use fixed system prompts for cache hit; dynamic user content for cache miss.
 */

import OpenAI from "openai";
import { logger } from "@/lib/logger";

export type V4Model = "deepseek-v4-pro" | "deepseek-v4-flash";
export type ReasoningEffort = "low" | "medium" | "high" | "max";

let client: OpenAI | null = null;

export function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || "",
      baseURL: (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com") + "/v1",
      timeout: 120000, // Increased for 1M context + reasoning mode
      maxRetries: 2,
    });
  }
  return client;
}

/**
 * Get the appropriate V4 model based on task complexity.
 * - deepseek-v4-pro: Complex reasoning (Agent pipeline, analysis, diagnosis)
 * - deepseek-v4-flash: Fast/cheap tasks (parsing, quick-scan, simple queries)
 */
export function getModel(task: "reasoning" | "fast" = "reasoning"): V4Model {
  return task === "fast" ? "deepseek-v4-flash" : "deepseek-v4-pro";
}

/**
 * Get reasoning effort for tasks that benefit from deep thinking.
 * - max: Agent pipeline stages (Analyzer, Diagnoser, Forecaster)
 * - high: Advisor Agent, complex analysis
 * - medium: Report generation, interpretation
 * - low: Quick-scan, simple parsing
 * Omit for fast tasks (uses non-thinking mode).
 */
export function getReasoningEffort(task: "pipeline" | "advisor" | "report" | "scan"): ReasoningEffort | undefined {
  switch (task) {
    case "pipeline": return "max";
    case "advisor": return "high";
    case "report": return "medium";
    case "scan": return undefined; // fast mode, no thinking needed
  }
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
