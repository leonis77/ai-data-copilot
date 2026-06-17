/**
 * Supabase 知识库检索 — 双层：Supabase 优先 + 本地兜底
 */

import { createClient } from "@supabase/supabase-js";
import { searchByTokens, tokenize } from "./matcher";
import { KNOWLEDGE, searchKnowledge } from "./knowledge";
import { logger } from "@/lib/logger";

interface KnowledgeEntry {
  id: number;
  category: string;
  topic: string;
  keywords: string[];
  content: string;
  source?: string;
  confidence?: number;
}

/**
 * 从 Supabase 检索行业知识
 * 失败时回退到本地 knowledge.ts
 */
export async function getIndustryKnowledge(query: string, maxResults?: number): Promise<{ content: string; score: number; source?: string }[]> {
  var maxR = maxResults !== undefined ? maxResults : 3;

  try {
    var supabaseUrl = process.env.SUPABASE_URL;
    var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      logger.info("Supabase credentials missing, using local knowledge base");
      return getLocalKnowledge(query, maxR);
    }

    var client = createClient(supabaseUrl, supabaseKey);
    var { data, error } = await client.from("knowledge_base").select("*");

    if (error || !data || data.length === 0) {
      logger.warn("Supabase knowledge_base query failed or empty, fallback to local", { error: error?.message });
      return getLocalKnowledge(query, maxR);
    }

    var entries = (data as KnowledgeEntry[]).map(function (row) {
      return {
        keywords: Array.isArray(row.keywords) ? row.keywords : [],
        content: row.content,
        category: row.category,
        topic: row.topic,
        source: row.source,
        confidence: row.confidence,
      };
    });

    var results = searchByTokens(query, entries, maxR, 0.1);

    // 如果 Supabase 检索结果不足，用本地知识补充
    if (results.length < maxR) {
      var localResults = getLocalKnowledge(query, maxR - results.length);
      for (var i = 0; i < localResults.length; i++) {
        results.push(localResults[i]);
      }
    }

    return results;
  } catch (e) {
    logger.warn("getIndustryKnowledge failed, fallback to local", { message: String(e) });
    return getLocalKnowledge(query, maxR);
  }
}

/**
 * 本地知识库检索（离线兜底）
 */
function getLocalKnowledge(query: string, maxResults: number): { content: string; score: number; source?: string }[] {
  var localEntries = KNOWLEDGE.map(function (item) {
    return {
      keywords: item.keywords,
      content: item.content,
      source: "内置知识库",
    };
  });

  var results = searchByTokens(query, localEntries, maxResults, 0.1);
  return results;
}
