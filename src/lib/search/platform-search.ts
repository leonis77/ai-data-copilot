/**
 * 平台官方数据搜索 v1.0 — WebSearch 集成层
 *
 * 设计原则：
 *   1. Tavily Search API 作为主搜索后端（AI Agent专用，返回Markdown格式）
 *   2. 无 API Key 时降级为空结果（不阻塞分析流程）
 *   3. 搜索结果缓存7天，避免重复调用
 *   4. 所有搜索限定在四大平台官方域名
 *
 * 数据来源铁律：
 *   只搜索平台官方域名 — 天猫商家中心、京东商家中心、拼多多商家后台、抖音电商学习中心
 *   禁止从第三方媒体站点获取数据
 */

import type { IndustryResult } from "@/lib/rag/industry-detector";

// ═══════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════

export interface WebSearchResult {
  /** 结果标题 */
  title: string;
  /** 来源URL */
  url: string;
  /** 页面摘要/内容 */
  content: string;
  /** 相关性评分 0-1 */
  relevanceScore: number;
  /** 发布日期（如有） */
  publishedDate?: string;
  /** 所属平台 */
  platform?: "tmall" | "jd" | "pdd" | "douyin";
}

export interface StructuredFeeData {
  /** 平台 */
  platform: string;
  /** 类目/行业 */
  category: string;
  /** 佣金率 */
  commissionRate?: string;
  /** 其他费用信息 */
  otherFees?: string;
  /** 数据来源 */
  source: string;
  /** 来源URL */
  sourceUrl: string;
  /** 置信度 0-1 */
  confidence: number;
}

export interface PlatformSearchResult {
  /** 原始搜索结果 */
  rawResults: WebSearchResult[];
  /** DeepSeek解析后的结构化数据 */
  structuredData: StructuredFeeData[];
  /** 搜索统计 */
  stats: {
    totalQueries: number;
    totalResults: number;
    cachedHits: number;
    timestamp: string;
  };
}

// ═══════════════════════════════════════════════
// 平台官方域名配置
// ═══════════════════════════════════════════════

const PLATFORM_DOMAINS: Record<string, { name: string; domains: string[] }> = {
  tmall: {
    name: "天猫",
    domains: ["sell.tmall.com", "maowo.tmall.com", "talb.tmall.com"],
  },
  jd: {
    name: "京东",
    domains: ["shop.jd.com", "help.jd.com", "rule.jd.com"],
  },
  pdd: {
    name: "拼多多",
    domains: ["mms.pinduoduo.com", "mms.pinduoduo.com/rule"],
  },
  douyin: {
    name: "抖音",
    domains: ["school.jinritemai.com", "buyin.jinritemai.com"],
  },
};

// ═══════════════════════════════════════════════
// 搜索Query构建
// ═══════════════════════════════════════════════

/**
 * 构建平台官方域名搜索查询
 */
function buildPlatformQueries(industry: IndustryResult, platform?: string): Array<{ query: string; platform: string }> {
  const queries: Array<{ query: string; platform: string }> = [];
  const year = new Date().getFullYear();
  const industryName = industry.name;

  const targets = platform
    ? [{ key: platform, config: PLATFORM_DOMAINS[platform] }].filter(p => p.config)
    : Object.entries(PLATFORM_DOMAINS).map(([key, config]) => ({ key, config }));

  for (const { key, config } of targets) {
    // 构建 site: 限定搜索
    const siteFilter = config.domains.map(d => `site:${d}`).join(" OR ");
    const query = `${siteFilter} ${industryName} 类目 佣金率 费率 ${year}`;
    queries.push({ query, platform: key });
  }

  return queries;
}

/**
 * 构建时效性验证查询
 */
export function buildFreshnessQuery(title: string, source: string): string {
  const year = new Date().getFullYear();
  return `${title} ${source} ${year}年 最新`;
}

// ═══════════════════════════════════════════════
// 内存缓存层
// ═══════════════════════════════════════════════

const searchCache = new Map<string, { results: WebSearchResult[]; timestamp: number }>();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7天

function getCached(key: string): WebSearchResult[] | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    searchCache.delete(key);
    return null;
  }
  return entry.results;
}

function setCache(key: string, results: WebSearchResult[]): void {
  // 限制缓存大小
  if (searchCache.size > 100) {
    const oldest = [...searchCache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) searchCache.delete(oldest[0]);
  }
  searchCache.set(key, { results, timestamp: Date.now() });
}

// ═══════════════════════════════════════════════
// 核心搜索函数
// ═══════════════════════════════════════════════

/**
 * 搜索平台官方数据
 *
 * @param industry 检测到的行业信息
 * @param platform 可选，指定平台（不指定则搜索全部四个平台）
 * @returns 搜索结果
 */
export async function searchPlatformOfficial(
  industry: IndustryResult,
  platform?: string
): Promise<PlatformSearchResult> {
  const queries = buildPlatformQueries(industry, platform);
  const allResults: WebSearchResult[] = [];
  let cachedHits = 0;
  const tavilyKey = process.env.TAVILY_API_KEY;

  for (const { query, platform: p } of queries) {
    const cacheKey = `${p}:${query}`;
    const cached = getCached(cacheKey);

    if (cached) {
      allResults.push(...cached);
      cachedHits++;
      continue;
    }

    // 如果有 Tavily API Key，执行真实搜索
    if (tavilyKey) {
      try {
        const results = await searchWithTavily(query, tavilyKey);
        setCache(cacheKey, results);
        allResults.push(...results);
      } catch (e) {
        // Tavily 搜索失败不阻塞流程
        console.warn(`[platform-search] Tavily search failed for "${query}":`, e);
      }
    }
    // 无 API Key 时跳过搜索（开发/免费额度用尽时的预期行为）
  }

  // 结构化解析（在后续DeepSeek调用中完成，这里返回原始结果）
  return {
    rawResults: allResults,
    structuredData: [], // 由调用方通过 DeepSeek 解析填充
    stats: {
      totalQueries: queries.length,
      totalResults: allResults.length,
      cachedHits,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * 使用 Tavily Search API 执行搜索
 */
async function searchWithTavily(query: string, apiKey: string): Promise<WebSearchResult[]> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      include_answer: true,
      max_results: 5,
      include_domains: [
        "sell.tmall.com", "maowo.tmall.com",
        "shop.jd.com", "help.jd.com",
        "mms.pinduoduo.com",
        "school.jinritemai.com", "buyin.jinritemai.com",
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const results: WebSearchResult[] = [];

  // Tavily answer（AI摘要）
  if (data.answer) {
    results.push({
      title: "AI摘要",
      url: "",
      content: data.answer,
      relevanceScore: 1.0,
    });
  }

  // 搜索结果
  for (const item of (data.results || [])) {
    results.push({
      title: item.title || "",
      url: item.url || "",
      content: item.content || "",
      relevanceScore: item.score || 0.5,
      publishedDate: item.published_date,
    });
  }

  return results;
}

/**
 * 将搜索结果格式化为可注入 AI prompt 的文本
 */
export function formatSearchResultsForPrompt(results: PlatformSearchResult): string {
  if (results.rawResults.length === 0) {
    return "";
  }

  let text = "## 🌐 实时平台数据（WebSearch获取）\n\n";
  text += `> 搜索时间：${results.stats.timestamp}\n`;
  text += `> 搜索结果：${results.stats.totalResults}条（来自${results.stats.totalQueries}个查询）\n\n`;

  for (const r of results.rawResults.slice(0, 8)) {
    text += `### ${r.title}\n`;
    text += `${r.content}\n`;
    if (r.url) text += `> 来源：[${r.url}](${r.url})\n`;
    text += "\n";
  }

  if (results.structuredData.length > 0) {
    text += "\n## 📋 结构化费率数据\n\n";
    for (const d of results.structuredData) {
      text += `- **${d.platform}** · ${d.category}: 佣金${d.commissionRate || "未找到"} · 来源：${d.source} · 置信度：${Math.round(d.confidence * 100)}%\n`;
    }
    text += "\n";
  }

  return text;
}
