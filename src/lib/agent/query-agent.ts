import { AgentContext, AgentResponse } from "./types";
import { logger } from "@/lib/logger";
import { getClient, withRetry } from "./llm";

export async function queryAgent(input: string, ctx: AgentContext): Promise<AgentResponse> {
  var client = getClient();
  var sp = "You are a senior e-commerce business analyst.\n\nCore rules:\n1. Only answer based on provided data, never fabricate\n2. If data insufficient, clearly state so\n3. Every conclusion needs specific numbers\n4. Skip obvious facts\n5. Focus on insights that drive decisions\n\nData:\n" + ctx.dataSummary;
  var res = await withRetry(function() { return client.chat.completions.create({
    model: "deepseek-chat",
    messages: [{ role: "system", content: sp }, { role: "user", content: input }],
    temperature: 0.2, max_tokens: 2000,
  }); }, 2, "query-agent");
  var text = res.choices[0]?.message?.content || "";
  try {
    var cleaned = text.replace(/```json|```/g, "").trim();
    var p = JSON.parse(cleaned);
    return {
      type: "query",
      content: p.answer || text,
      chart: p.chartType ? { type: p.chartType, data: p.chartData || [], title: p.chartTitle || "" } : undefined,
      followUp: p.followUp || ["Which products perform best?", "Any business risks?", "How to improve?"],
    };
  } catch(e) { logger.warn("query-agent parse failed, using raw text", { message: e instanceof Error ? e.message : String(e) });
    return { type: "query", content: text, followUp: ["Deep dive this data", "Generate report", "Check anomalies"] };
  }
}
