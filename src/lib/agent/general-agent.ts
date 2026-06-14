import { AgentContext, AgentResponse } from "./types";
import { logger } from "@/lib/logger";
import { getClient, withRetry } from "./llm";

export async function generalAgent(input: string, ctx: AgentContext): Promise<AgentResponse> {
  const client = getClient();
  const ds = "Dataset: " + ctx.datasetName + ", " + ctx.rowCount + " rows";
  const sp = "You are an e-commerce data analyst. Only answer based on provided data. Skip obvious facts. Give actionable insights. " + ds;
  var res = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [{ role: "system", content: sp }, { role: "user", content: input }],
    temperature: 0.2, max_tokens: 2000,
  });
  var reply = res.choices[0]?.message?.content || "Please rephrase.";
  return { type: "general", content: reply, followUp: ["Query metrics", "Generate report", "Deep analysis"] };
}