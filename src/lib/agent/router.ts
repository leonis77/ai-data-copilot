import { AgentContext, AgentResponse } from "./types";
import { queryAgent } from "./query-agent";
import { reportAgent } from "./report-agent";
import { interpretAgent } from "./interpret-agent";
import { generalAgent } from "./general-agent";

function detectIntent(input: string): string {
  const q = input.toLowerCase();
  if (/查询|搜索|瘾到|哪个|哪些|多弑|几个|show|find|query|select|count|sum|avg|top\s*\d|玒名|最高|最低/.test(q)) return "query";
  if (/报告|生成|总结|导出|汇总|report|summary|export|分析一下/.test(q)) return "report";
  if (/解读|深度|故事|洞察|insight|interpret|story|趋势|为什么|怎么看|如何理㢓|胃后/.test(q)) return "interpret";
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
