import { AgentContext, AgentResponse } from "./types";
import { logger } from "@/lib/logger";
import { getClient, withRetry } from "./llm";

export async function reportAgent(input: string, ctx: AgentContext): Promise<AgentResponse> {
  var client = getClient();
  var sp = "You are a senior e-commerce business consultant. Your value is helping merchants find problems and make decisions, not describing data.\n\nFORBIDDEN: Do NOT state obvious facts. Do NOT say data appears normal. Do NOT list distributions without business interpretation.\n\nMUST DO: 1. Extract business insights 2. Provide actionable recommendations at product level 3. Identify data blind spots 4. Every conclusion needs data support.\n\nRespond in user language, Markdown format.";
  var up = "Generate a business analysis report:\n\n" + ctx.dataSummary + "\n\n" + (input || "");
  var res = await withRetry(function() { return client.chat.completions.create({
    model: "deepseek-chat",
    messages: [{ role: "system", content: sp }, { role: "user", content: up }],
    temperature: 0.3, max_tokens: 3000,
  }); }, 2, "report-agent");
  var text = res.choices[0]?.message?.content || "";
  try {
    var cleaned = text.replace(/```json|```/g, "").trim();
    var p = JSON.parse(cleaned);
    var secs = (p.sections || []).map(function(s: any) { return "## " + s.heading + "\n" + s.content + "\n> Key data: " + (s.keyMetric || "N/A"); }).join("\n\n");
    return { type: "report", content: "# " + (p.title || "Business Analysis Report") + "\n\n" + (p.summary || "") + "\n\n" + secs + "\n\n**Action Recommendations**: " + (p.conclusion || ""), followUp: p.followUp || [] };
  } catch(e) { logger.warn("report-agent parse failed, using raw text", { message: e instanceof Error ? e.message : String(e) });
    return { type: "report", content: text, followUp: ["Which products sell best?", "What are the risks?", "Export PDF report"] };
  }
}
