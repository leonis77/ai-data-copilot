import { AgentContext, AgentResponse } from "./types";
import { getClient } from "./llm";

export async function queryAgent(input: string, ctx: AgentContext): Promise<AgentResponse> {
  var ctxStr = "数据集: " + ctx.datasetName + "\n" + ctx.rowCount + " 行 x " + ctx.columns.length + " 列\n" + ctx.columns.join(", ") + "\n\n" + ctx.dataSummary;
  var prompt = "你是数据查询助手。严格基于下面的数据回答。不要编造不存在的数据。如果数据中没有答案，就说没有。\n\n## 数据\n" + ctxStr + "\n\n## 问题\n" + input + "\n\n输出JSON: {\"answer\":\"基于数据的回答\",\"chartType\":\"bar|pie|line|null\",\"chartTitle\":\"图表标题\",\"chartData\":[{\"name\":\"x\",\"value\":0}],\"followUp\":[\"追问\"]}";

  var client = getClient();
  var res = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: "你是数据查询Agent。只基于提供的数据回答，绝不编造。不确定时直说不确定。" },
      { role: "user", content: prompt },
    ],
    temperature: 0.1, max_tokens: 1500,
  });

  var text = res.choices[0]?.message?.content || "";
  try {
    var p = JSON.parse(text.replace(/```json|```/g, "").trim());
    return { type: "query", content: p.answer || "查询完成", chart: p.chartType ? { type: p.chartType, data: p.chartData || [], title: p.chartTitle || "" } : undefined, table: p.tableData?.columns ? p.tableData : undefined, followUp: p.followUp || [] };
  } catch {
    return { type: "query", content: text, followUp: ["换个角度?", "看详细数据?"] };
  }
}
