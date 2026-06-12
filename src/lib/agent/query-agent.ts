import { AgentContext, AgentResponse } from "./types";
import { getClient } from "./llm";

export async function queryAgent(input: string, ctx: AgentContext): Promise<AgentResponse> {
  const ctxStr = "数据集: " + ctx.datasetName + "\n" + ctx.rowCount + " 行 x " + ctx.columns.length + " 列 \n" + ctx.columns.join(", ") + "\n\n" + ctx.dataSummary;
  const prompt = "你是数据查询助手，根据用户问题，从数据中提取答案。\n\n## Data\n" + ctxStr + "\n\n## Question\n" + input + "\n\nOutput JSON: {\"answer\":\"...\",\"chartType\":\"bar|pie|line|null\",\"chartTitle\":\"...\",\"chartData\":[{\"name\":\"x\",\"value\":0}],\"tableData\":{\"columns\":[],\"rows\":[]},\"followUp\":[\"...\"]}";
  const client = getClient();
  const res = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [{ role: "system", content: "你是数据查询Agent，精确回答数据问题。" }, { role: "user", content: prompt }],
    temperature: 0.3, max_tokens: 1500,
  });
  const text = res.choices[0]?.message?.content || "";
  try {
    const p = JSON.parse(text.replace(/```json|```/g, "").trim());
    return { type: "query", content: p.answer || "Query done", chart: p.chartType ? { type: p.chartType, data: p.chartData || [], title: p.chartTitle || "" } : undefined, table: p.tableData?.columns ? p.tableData : undefined, followUp: p.followUp || [] };
  } catch {
    return { type: "query", content: text, followUp: ["换个角度?", "看详细数据?"] };
  }
}
