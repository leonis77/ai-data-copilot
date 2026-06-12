import OpenAI from "openai";
let client: OpenAI | null = null;
export function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || "",
      baseURL: (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com") + "/v1",
    });
  }
  return client;
}
