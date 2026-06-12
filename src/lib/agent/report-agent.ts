import { AgentContext, AgentResponse } from "./types";
import { getClient } from "./llm";

export async function reportAgent(input: string, ctx: AgentContext): Promise<AgentResponse> {
  const ctxStr = "数据集: " + ctx.datasetName + "\n" + ctx.rowCount + " 行 x " + ctx.columns.length + " 列 \n" + ctx.columns.join(", ") + "\n\n" + ctx.dataSummary;
  const prompt = "你是数据报呺Agent。基于数据生成专触数据分析报告。\n\n## Data\n" + ctxStr + "\n\n## Request\n" + input + "\n\nOutput JSON: {\"title\":\"...\",\"summary\":\"...\",\"sections\":[{\"heading\":\"...\",\"content\":\"...\",\"keyMetric\":\"...\"}],\"conclusion\":\"...\",\"followUp\":[\"...\"]}";
  const client = getClient();
  const res = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [{ role: "system", content: "你是数据分析报呺Agent，生成专触报告。" }, { role: "user", content: prompt }],
    temperature: 0.4, max_tokens: 2000,
  });
  const text = res.choices[0]?.message?.content || "";
  try {
    const p = JSON.parse(text.replace(/```json|```/g, "").trim());
    const secs = (p.sections||[]).map((s:any)=> "### "+s.heading+"\n"+s.content+"\n> Key: "+(s.keyMetric||"N/A")).join("\n\n");
    return { type: "report", content: "# "+(p.title||"Report")+"\n\n"+(p.summary||"")+"\n\n"+secs+"\n\n**Conclusion**: "+(p.conclusion||""), followUp: p.followUp||[] };
  } catch {
    return { type: "report", content: text, followUp: ["Show details?", "Export PDF?"] };
  }
}
