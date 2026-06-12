import { AgentContext, AgentResponse } from "./types";
import { getClient } from "./llm";

export async function interpretAgent(input: string, ctx: AgentContext): Promise<AgentResponse> {
  var ctxStr = "数据集: " + ctx.datasetName + "\n" + ctx.rowCount + " 行 x " + ctx.columns.length + " 列\n" + ctx.columns.join(", ") + "\n\n" + ctx.dataSummary;
  var prompt = "你是数据解读Agent。严格基于数据解读。\n\n## 数据\n" + ctxStr + "\n\n## 问题\n" + input + "\n\n输出JSON: {\"story\":\"解读故事\",\"highlights\":[{\"metric\":\"指标\",\"value\":\"值\",\"insight\":\"洞察\"}],\"anomalies\":[{\"finding\":\"发现\",\"severity\":\"high|medium|low\"}],\"opportunities\":[\"机会1\"],\"followUp\":[\"追问\"]}";
  var client = getClient();
  var res = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [{ role: "system", content: "你是解读Agent，只基于提供的数据解读。" }, { role: "user", content: prompt }],
    temperature: 0.4, max_tokens: 1500,
  });
  var text = res.choices[0]?.message?.content || "";
  try {
    var p = JSON.parse(text.replace(/```json|```/g, "").trim());
    var hl = (p.highlights || []).map(function(h: any) { return "- **" + h.metric + "**: " + h.value + " - " + h.insight; }).join("\n");
    var an = (p.anomalies || []).map(function(a: any) { return "- [" + a.severity + "] " + a.finding; }).join("\n");
    var op = (p.opportunities || []).map(function(o: string) { return "- " + o; }).join("\n");
    return { type: "interpret", content: (p.story || "") + "\n\n● Highlights\n" + hl + "\n\n● Anomalies\n" + an + "\n\n● Opportunities\n" + op, followUp: p.followUp || [] };
  } catch {
    return { type: "interpret", content: text, followUp: ["哪个指标值得关注?", "有什么风险?"] };
  }
}
