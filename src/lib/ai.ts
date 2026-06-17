/**
 * AI 分析引擎 — 角色感知 + 业务概念感知 + 分层分析管道
 * @module ai
 */

import OpenAI from "openai";
import type { TableClass } from "@/lib/classifier";
import type { TableBusinessProfile } from "@/lib/business-concepts";

var API_KEY = process.env.DEEPSEEK_API_KEY || "";
var BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
var client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: API_KEY, baseURL: BASE_URL + "/v1" });
  return client;
}

export interface AnalysisResult {
  summary: string;
  insights: string[];
  risks: string[];
  suggestions: string[];
}

export interface AnalysisContext {
  tableClass: TableClass;
  tableConfidence: number;
  profile: { rowCount: number; columnCount: number; timeRange?: string };
  roles: { role: string; columns: { name: string; concept: string; confidence: number }[] }[];
  metrics: {
    topEntities?: { name: string; revenue?: number; share?: number }[];
    trend?: { direction: string; description: string };
    concentration?: { topCount: number; share: number };
  };
  crossTable?: {
    entityMatchRate: number;
    priceIssues?: { entity: string; diff: number; description: string }[];
    quantityGaps?: { entity: string; gap: number }[];
    unmatchedCount: number;
  };
  diagnosis?: { critical: string[]; warnings: string[]; opportunities: string[] };
}

// ============================================================================
// System Prompt Builder
// ============================================================================

function buildSystemPrompt(tableClass: TableClass): string {
  var base = "你是一个资深商业数据分析师。分析数据时请遵循以下原则：\n";
  base += "1. 先理解数据的业务含义（字段已标注语义角色和业务概念）\n";
  base += "2. 只基于提供的数据进行分析，绝不编造\n";
  base += "3. 发现数据中的业务逻辑问题（如定价异常、库存风险、集中度风险）\n";
  base += "4. 给出具体、可执行、有数字支撑的建议\n";
  base += "5. 用中文回答，输出有效的JSON格式\n";

  switch (tableClass) {
    case "order":
      base += "\n当前数据是**订单表**。你是电商经营分析专家。请从以下维度深度分析：\n";
      base += "- GMV趋势：是否有增长/下跌？客单价是否健康？\n";
      base += "- 商品结构：哪些是爆款（贡献>15%GMV）？哪些是长尾（贡献<2%）？是否存在爆款依赖风险？\n";
      base += "- 复购与客户：复购率如何？新老客占比？\n";
      base += "- 地域分布：哪些地区贡献最大？是否有物流成本过高的地区？\n";
      base += "- 定价诊断：是否有定价过低（薄利多销但无利润）或过高（销量低）的商品？\n";
      break;
    case "supply":
      base += "\n当前数据是**供货表**。你是生鲜/零售供应链分析专家。请从以下维度深度分析：\n";
      base += "- 价格带分布：供货价集中在什么区间？高中低端占比？\n";
      base += "- 产地集中度：是否过度依赖单一产地？（如某产地>50%有断供风险）\n";
      base += "- 季节性分析：哪些商品是季节性商品？供货周期是否合理？\n";
      base += "- SKU结构：品类覆盖是否完整？是否存在品类空白？\n";
      base += "- 物流成本：不同发货地的物流规则差异对成本的影响\n";
      base += "- 供应商议价：同品类不同供应商价格对比，是否存在议价空间\n";
      break;
    case "marketing":
      base += "\n当前数据是**推广报表**。你是电商广告投放专家。请从以下维度深度分析：\n";
      base += "- ROI排行：哪些计划赚钱（ROI>3）？哪些亏钱（ROI<1）？\n";
      base += "- 点击效率：CTR是否正常（行业均值2-5%）？CPC是否合理？\n";
      base += "- 预算分配：高ROI计划是否预算不足？低ROI计划是否在浪费预算？\n";
      base += "- 转化漏斗：展现→点击→成交各环节的流失点\n";
      break;
    case "inventory":
      base += "\n当前数据是**库存表**。你是供应链库存管理专家。请从以下维度深度分析：\n";
      base += "- 周转率：哪些商品周转快（畅销）？哪些周转慢（滞销积压）？\n";
      base += "- 缺货预警：库存天数<3天的商品，建议立即补货\n";
      base += "- 库龄结构：库龄>90天的商品占比，是否存在过期/贬值风险\n";
      break;
    case "aftersales":
      base += "\n当前数据是**售后表**。你是电商售后质量管理专家。请从以下维度深度分析：\n";
      base += "- 退款率：整体退款率是否在健康范围（<5%）？哪些商品退款率异常高？\n";
      base += "- 退款原因分布：是质量问题、物流破损还是描述不符？\n";
      base += "- 质量信号：退款率>10%的商品建议下架整改\n";
      break;
    default:
      base += "\n当前数据是**通用数据表**（未明确分类）。请先推断数据用途，再进行分析。\n";
      break;
  }
  return base;
}

// ============================================================================
// Layered Context Builder
// ============================================================================

export function buildAnalysisContext(
  tableClass: TableClass,
  tableConfidence: number,
  businessProfile: TableBusinessProfile,
  rowCount: number,
  columnCount: number,
  topEntities?: { name: string; revenue?: number; share?: number }[],
  trend?: { direction: string; description: string },
  crossTable?: AnalysisContext["crossTable"],
  diagnosis?: AnalysisContext["diagnosis"]
): string {
  var parts: string[] = [];
  parts.push("[TABLE] " + tableClass + " (confidence: " + Math.round(tableConfidence * 100) + "%)");
  parts.push("[PROFILE] " + rowCount + " rows, " + columnCount + " columns");

  // Role annotations
  var roleGroups: Record<string, { name: string; concept: string }[]> = {};
  for (var i = 0; i < businessProfile.concepts.length; i++) {
    var c = businessProfile.concepts[i];
    if (c.conceptConfidence < 0.3) continue;
    if (!roleGroups[c.role]) roleGroups[c.role] = [];
    roleGroups[c.role].push({ name: c.column, concept: c.label });
  }

  parts.push("[ROLES]");
  for (var role in roleGroups) {
    if (!roleGroups.hasOwnProperty(role)) continue;
    var cols = roleGroups[role];
    parts.push("  " + role + ": " + cols.map(function (col) { return col.name + "(" + col.concept + ")"; }).join(", "));
  }

  // Pre-computed metrics
  if (topEntities && topEntities.length > 0) {
    parts.push("[METRICS]");
    parts.push("  Top entities: " + topEntities.map(function (e) {
      var s = e.name;
      if (e.revenue) s += "(¥" + e.revenue.toLocaleString() + ")";
      if (e.share) s += "(" + e.share + "%)";
      return s;
    }).join(", "));
    if (topEntities.length >= 3) {
      var top3 = topEntities.slice(0, 3).reduce(function (s, e) { return s + (e.share || 0); }, 0);
      parts.push("  Top3 concentration: " + Math.round(top3) + "%");
    }
  }

  if (trend) parts.push("  Trend: " + trend.direction + " - " + trend.description);

  // Cross-table
  if (crossTable) {
    parts.push("[CROSS-TABLE]");
    parts.push("  Entity match rate: " + Math.round(crossTable.entityMatchRate * 100) + "%");
    if (crossTable.priceIssues) {
      for (var pi = 0; pi < crossTable.priceIssues.length; pi++) {
        parts.push("  Price issue: " + crossTable.priceIssues[pi].description);
      }
    }
    if (crossTable.quantityGaps) {
      for (var qi = 0; qi < Math.min(crossTable.quantityGaps.length, 5); qi++) {
        parts.push("  Quantity gap: " + crossTable.quantityGaps[qi].entity + " shortage=" + crossTable.quantityGaps[qi].gap);
      }
    }
    if (crossTable.unmatchedCount > 0) parts.push("  Unmatched entities: " + crossTable.unmatchedCount);
  }

  // Diagnosis
  if (diagnosis) {
    if (diagnosis.critical.length > 0) parts.push("[DIAGNOSIS:CRITICAL] " + diagnosis.critical.join("; "));
    if (diagnosis.warnings.length > 0) parts.push("[DIAGNOSIS:WARNING] " + diagnosis.warnings.join("; "));
  }

  return parts.join("\n");
}

// ============================================================================
// Core API
// ============================================================================

export async function analyzeWithContext(
  contextText: string, tableClass: TableClass, userQuestion?: string
): Promise<AnalysisResult> {
  var systemPrompt = buildSystemPrompt(tableClass);
  var userPrompt = "请根据以下数据上下文进行分析。\n\n==== 数据上下文 ====\n";
  userPrompt += contextText;
  userPrompt += "\n==== 上下文结束 ====\n\n";
  if (userQuestion) userPrompt += "用户问题：" + userQuestion + "\n";
  else userPrompt += "请提供全面的数据分析。\n";
  userPrompt += "\n请按以下JSON格式输出（确保是有效的JSON）：\n";
  userPrompt += '{"summary":"数据整体概述（一段话，包含关键数字和业务结论）","insights":["洞察1","洞察2","洞察3"],"risks":["风险1","风险2"],"suggestions":["建议1","建议2","建议3"]}';

  try {
    var openai = getClient();
    var response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature: 0.7, max_tokens: 2000,
    });
    return parseAIResponse(response.choices[0]?.message?.content || "");
  } catch (error) {
    console.error("AI analysis error:", error);
    throw new Error("AI分析服务暂时不可用，请稍后重试");
  }
}

export async function analyzeData(
  dataSummary: string, userQuestion?: string
): Promise<AnalysisResult> {
  var prompt = "你是一个专业的数据分析师。请根据以下数据摘要进行分析。\n\n";
  prompt += "数据摘要：\n" + dataSummary + "\n\n";
  prompt += (userQuestion ? "用户问题：" + userQuestion : "请提供全面的数据分析。") + "\n\n";
  prompt += "请用中文回答，按以下JSON格式输出：\n";
  prompt += '{"summary":"数据整体概述（一段话）","insights":["洞察1","洞察2","洞察3"],"risks":["风险1","风险2"],"suggestions":["建议1","建议2","建议3"]}';

  try {
    var openai = getClient();
    var response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [{
        role: "system",
        content: "你是一个资深商业数据分析师。遵循：1.先判断数据类型 2.只基于真实数据 3.发现业务逻辑 4.给出可执行建议。中文回答，输出JSON。",
      }, { role: "user", content: prompt }],
      temperature: 0.7, max_tokens: 2000,
    });
    return parseAIResponse(response.choices[0]?.message?.content || "");
  } catch (error) {
    console.error("AI analysis error:", error);
    throw new Error("AI分析服务暂时不可用，请稍后重试");
  }
}

export async function chatWithData(
  dataContext: string, messages: { role: string; content: string }[]
): Promise<string> {
  var sp = "你是一个AI数据分析助手。可访问以下数据来回答问题：\n\n" + dataContext;
  sp += "\n\n基于数据回答。问题超出数据范围请如实说明。中文回答，支持Markdown。";
  try {
    var openai = getClient();
    var response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "system", content: sp }, ...messages.map(function (m) {
        return { role: m.role as "user" | "assistant", content: m.content };
      })],
      temperature: 0.7, max_tokens: 2000,
    });
    return response.choices[0]?.message?.content || "无法生成回复。";
  } catch (error) {
    console.error("AI chat error:", error);
    throw new Error("AI服务暂时不可用");
  }
}

function parseAIResponse(text: string): AnalysisResult {
  try {
    var cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    var parsed = JSON.parse(cleaned);
    return {
      summary: parsed.summary || "分析完成",
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch {
    var lines = text.split("\n").filter(Boolean);
    return {
      summary: lines[0] || "分析完成",
      insights: lines.slice(1, 4),
      risks: lines.slice(4, 6),
      suggestions: lines.slice(6, 9),
    };
  }
}
