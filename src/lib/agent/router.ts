import { AgentContext, AgentResponse } from "./types";
import { queryAgent } from "./query-agent";
import { reportAgent } from "./report-agent";
import { interpretAgent } from "./interpret-agent";
import { generalAgent } from "./general-agent";

function detectIntent(input: string): string {
  const q = input.toLowerCase();
  if (/report|summary|export|generate|analyze/i.test(q)) return "report";
  if (/query|find|top\s*\d|count|sum|avg|max|min|which|how many|how much|what/i.test(q)) return "query";
  if (/interpret|insight|trend|story|why|deep|analyze|anomaly/i.test(q)) return "interpret";
  return "general";
}

export async function routeAgent(input: string, ctx: AgentContext): Promise<AgentResponse> {
  const intent = detectIntent(input);
  switch (intent) {
    case "query": return queryAgent(input, ctx);
    case "report": return reportAgent(input, ctx);
    case "interpret": return interpretAgent(input, ctx);
    default: return generalAgent(input, ctx);
  }
}
