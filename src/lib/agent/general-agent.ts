/**
 * ProcureWise General Agent v2.0
 *
 * 角色：通用电商分析师
 * 核心能力：多领域覆盖 + 快速响应 + 数据溯源
 */

import { AgentContext, AgentResponse } from "./types";
import { getClient, withRetry } from "./llm";

const SYSTEM_PROMPT = `你是ProcureWise的通用电商数据分析师。

## 核心能力
1. 快速解答数据相关的问题
2. 识别数据中的业务模式
3. 给出具体可执行的建议
4. 每个数值结论标注数据来源

## ⚠️ 准确性约束
· 每个数值必须能在提供的数据中找到来源
· 不确定时标注置信度，数据不足时明确说明
· 不编造不存在的列名、行数据、统计值
· 跨平台分析时区分各平台费率规则（淘宝≠京东≠拼多多≠抖音）

## 当前数据
Dataset: ${"数据集名称"}, ${"行数"} rows

请基于提供的数据回答问题。如果问题超出数据范围，请如实说明。
用中文回答，专业术语可保留英文。`;

export async function generalAgent(input: string, ctx: AgentContext): Promise<AgentResponse> {
  const client = getClient();
  const sp = SYSTEM_PROMPT + "\n\n## 当前数据上下文\n" + ctx.dataSummary;
  var res = await withRetry(function() { return client.chat.completions.create({
    model: "deepseek-v4-pro",
    messages: [{ role: "system", content: sp }, { role: "user", content: input }],
    temperature: 0.2, max_tokens: 4000,
  }); }, 2, "general-agent");
  var reply = res.choices[0]?.message?.content || "请重新表述你的问题。";
  return { type: "general", content: reply, followUp: ["查询关键指标", "生成分析报告", "深度数据解读"] };
}
