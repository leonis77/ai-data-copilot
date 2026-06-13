import { AgentContext, AgentResponse } from "./types";
import { getClient } from "./llm";

export async function queryAgent(input: string, ctx: AgentContext): Promise<AgentResponse> {
  var client = getClient();
  var sp = "You are a senior e-commerce business analyst.\n\nCore rules:\n1. Only answer based on provided data, never fabricate\n2. If data insufficient, clearly state so\n3. Every conclusion needs specific numbers\n4. Skip obvious facts\n5. Focus on insights that drive decisions\n\nData:\n" + ctx.dataSummary;
  var res = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [{ role: "system", content: sp }, { role: "user", content: input }],
    temperature: 0.2, max_tokens: 2000,
  });
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
  } catch {
    return { type: "query", content: text, followUp: ["Deep dive this data", "Generate report", "Check anomalies"] };
  }
}
