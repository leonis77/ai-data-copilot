/**
 * RAG 知识注入 — 双层架构
 *
 * Layer 1: 用户历史数据（100% 准确）
 * Layer 2: 行业参考知识（带来源标注）
 */

import { getIndustryKnowledge } from "./knowledge-base";
import { searchKnowledge } from "./knowledge";
import { getUserHistory, formatHistoryForPrompt } from "./user-benchmarks";
import { logger } from "@/lib/logger";

export interface RAGContext {
  userHistory: string;
  industryKnowledge: string;
  combined: string;
}

/**
 * 注入双层 RAG 知识到 AI prompt
 *
 * @param query - 用户查询
 * @param userId - 用户标识（用于检索历史基准）
 * @param dataSummary - 数据摘要（用于检索相关行业知识）
 */
export async function injectRAG(
  query: string,
  userId?: string,
  dataSummary?: string
): Promise<RAGContext> {
  var userHistory = "";
  var industryKnowledge = "";

  // Layer 1: 用户历史基准
  if (userId) {
    try {
      var comparisons = await getUserHistory(userId);
      if (comparisons.length > 0) {
        userHistory = formatHistoryForPrompt(comparisons);
      }
    } catch (e) {
      logger.warn("User history retrieval failed", { message: String(e) });
    }
  }

  // Layer 2: 行业知识（Supabase 优先 + 本地兜底）
  var searchQuery = query;
  if (dataSummary) {
    searchQuery += " " + dataSummary.substring(0, 200);
  }

  try {
    var industryResults = await getIndustryKnowledge(searchQuery, 3);
    if (industryResults.length > 0) {
      var lines: string[] = ["[INDUSTRY KNOWLEDGE] 行业参考知识："];
      for (var i = 0; i < industryResults.length; i++) {
        var src = industryResults[i].source ? "（来源：" + industryResults[i].source + "）" : "";
        lines.push("  " + industryResults[i].content + " " + src);
      }
      lines.push("  以上行业数据仅供参考，请结合用户实际数据分析。");
      industryKnowledge = lines.join("\n");
    }
  } catch (e) {
    logger.warn("Industry knowledge retrieval failed", { message: String(e) });
    // 离线回退
    var localResults = searchKnowledge(searchQuery || query, 3);
    if (localResults.length > 0) {
      industryKnowledge = "[INDUSTRY KNOWLEDGE] 行业参考（离线知识库）：\n  " + localResults.join("\n  ");
    }
  }

  // 组装
  var parts: string[] = [];
  if (userHistory) parts.push(userHistory);
  if (industryKnowledge) parts.push(industryKnowledge);

  return {
    userHistory: userHistory,
    industryKnowledge: industryKnowledge,
    combined: parts.join("\n\n"),
  };
}

/**
 * 简版注入（同步，用于非关键路径）
 */
export function injectKnowledgeSync(query: string, maxResults?: number): string {
  var results = searchKnowledge(query, maxResults || 3);
  if (results.length === 0) return "";
  return "[INDUSTRY KNOWLEDGE]\n" + results.map(function (r) { return "  " + r; }).join("\n");
}
