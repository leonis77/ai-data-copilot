import { AgentContext, AgentResponse } from "./types";
import { getClient } from "./llm";

export async function interpretAgent(input: string, ctx: AgentContext): Promise<AgentResponse> {
  const ctxStr = "数据集: " + ctx.datasetName + "\n" + ctx.rowCount + " 行 x " + ctx.columns.length + " 列 \n" + ctx.columns.join(", ") + "\n\n" + ctx.dataSummary;
  const prompt = "你是数据解读Agent。深入解读数据背后的故事。\n\n## Data\n" + ctxStr + "\n\n## Question\n" + input + "\n\nOutput JSON: {\"story\":\"...\",\"highlights\":[{\"metric\":\"...\",\"value\":\"...\",\"insight\":\"...\"}],\"anomalies\":[{\"finding\":\"...\",\"severity\":\"high|medium|low\"}],\"opportunities\":[\"...\"],\"followUp\":[\"...\"]}";
  const client = getClient();
  const res = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [{ role: "system", content: "你是数据解读Agent，发现数据中的故事。" }, { role: "user", content: prompt }],
    temperature: 0.6, max_tokens: 1500,
  });
  const text = res.choices[0]?.message?.content || "";
  try {
    const p = JSON.parse(text.replace(/```json|```/g, "").trim());
    const hl = (p.highlights||[]).map((h:any)=> "- **"+h.metric+"**: "+h.value+" - "+h.insight).join("\n");
    const an = (p.anomalies||[]).map((a:any)=> "- ["+a.severity+"] "+a.finding).join("\n");
    const op = (p.opportunities||[]).map((o:string)=> "- "+o).join("\n");
    return { type: "interpret", content: (p.story||"")+"\n\n### Highlights\n"+hl+"\n\n### Anomalies\n"+an+"\n\n### Opportunities\n"+op, followUp: p.followUp||[] };
  } catch {
    return { type: "interpret", content: text, followUp: ["哪个指标值得关注?", "有什么风险?"] };
  }
}
