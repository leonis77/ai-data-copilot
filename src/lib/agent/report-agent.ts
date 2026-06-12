import { AgentContext, AgentResponse } from "./types";
import { getClient } from "./llm";

export async function reportAgent(input: string, ctx: AgentContext): Promise<AgentResponse> {
  var ctxStr = "数据集: " + ctx.datasetName + "\n" + ctx.rowCount + " 行 x " + ctx.columns.length + " 列\n" + ctx.columns.join(", ") + "\n\n" + ctx.dataSummary;
  var prompt = "你是数据报告Agent。严格基于数据生成报告。\n\n## 数据\n" + ctxStr + "\n\n## 需求\n" + input + "\n\n输出JSON: {\"title\":\"报告标题\",\"summary\":\"摘要\",\"sections\":[{\"heading\":\"小节\",\"content\":\"内容\",\"keyMetric\":\"数字\"}],\"conclusion\":\"结论\",\"followUp\":[\"追问\"]}";

  var client = getClient();
  var res = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [{ role: "system", content: "你是报告Agent，只基于提供的数据生成报告。" }, { role: "user", content: prompt }],
    temperature: 0.3, max_tokens: 2000,
  });
  var text = res.choices[0]?.message?.content || "";
  try {
    var p = JSON.parse(text.replace(/```json|```/g, "").trim());
    var secs = (p.sections || []).map(function(s: any) { return "● " + s.heading + "\n" + s.content + "\n> Key: " + (s.keyMetric || "N/A"); }).join("\n\n");
    return { type: "report", content: "# " + (p.title || "报告") + "\n\n" + (p.summary || "") + "\n\n" + secs + "\n\n**结论**: " + (p.conclusion || ""), followUp: p.followUp || [] };
  } catch {
    return { type: "report", content: text, followUp: ["展开详情?", "导出PDF?"] };
  }
}
