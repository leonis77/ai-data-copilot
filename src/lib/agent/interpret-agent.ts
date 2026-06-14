import { AgentContext, AgentResponse } from "./types";
import { logger } from "@/lib/logger";
import { getClient, withRetry } from "./llm";

export async function interpretAgent(input: string, ctx: AgentContext): Promise<AgentResponse> {
  var client = getClient();
  var sp = "You are an e-commerce data interpretation expert. Find business patterns, anomalies, and opportunities.\n\nFramework: 1. Trends 2. Structure 3. Anomalies 4. Correlations 5. Opportunities\n\nData:\n" + ctx.dataSummary + "\n\nEvery conclusion needs data support. Tell stories with data. Give actionable next steps. Respond in user language.";
  var res = await withRetry(function() { return client.chat.completions.create({
    model: "deepseek-chat",
    messages: [{ role: "system", content: sp }, { role: "user", content: "Deeply interpret: " + input }],
    temperature: 0.4, max_tokens: 2000,
  }); }, 2, "interpret-agent");
  var text = res.choices[0]?.message?.content || "";
  try {
    var cleaned = text.replace(/```json|```/g, "").trim();
    var p = JSON.parse(cleaned);
    var hl = (p.highlights || []).map(function(h: any) { return "- **" + h.metric + "**: " + h.value + " " + String.fromCharCode(0x2014) + " " + h.insight; }).join("\n");
    var an = (p.anomalies || []).map(function(a: any) { return "- [" + a.severity + "] " + a.finding; }).join("\n");
    var op = (p.opportunities || []).map(function(o: any) { return "- " + o; }).join("\n");
    return { type: "interpret", content: (p.story || "") + "\n\n**Key Findings**\n" + hl + "\n\n**Anomaly Alerts**\n" + an + "\n\n**Business Opportunities**\n" + op, followUp: p.followUp || [] };
  } catch(e) { logger.warn("interpret-agent parse failed, using raw text", { message: e instanceof Error ? e.message : String(e) });
    return { type: "interpret", content: text, followUp: ["Which metric matters most?", "Any business risks?", "How to improve?"] };
  }
}
