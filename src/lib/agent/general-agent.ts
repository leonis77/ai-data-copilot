import { AgentContext, AgentResponse } from "./types";
import { getClient } from "./llm";

export async function generalAgent(input: string, ctx: AgentContext): Promise<AgentResponse> {
  const client = getClient();
  const ctxStr = "数据集: " + ctx.datasetName + ", " + ctx.rowCount + "行, " + ctx.columns.length + "列(" + ctx.columns.join(",") + ")";
  const res = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: "你是AI数据分析师，" + ctxStr + "。说用中文回答。" },
      { role: "user", content: input },
    ],
    temperature: 0.5, max_tokens: 1000,
  });
  const reply = res.choices[0]?.message?.content || "请重新描述。";
  return { type: "general", content: reply, followUp: ["生成报告", "查询数据", "深度解读"] };
}
