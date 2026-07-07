/**
 * 跨平台商品匹配引擎 v1.0
 *
 * 核心能力：
 *   1. Jaccard相似度模糊匹配 — 同一商品在不同平台的名称差异识别
 *   2. 跨平台利润对比数据聚合
 *   3. 跨平台价差预警
 *
 * 匹配策略（按优先级）：
 *   1. SKU/商品ID精确匹配（如果有统一编码）
 *   2. 商品名Jaccard相似度（分词后比较）
 *   3. 规格参数匹配（型号/规格/颜色等）
 */

import type { ProfitResult } from "@/lib/profit/engine";

// ═══════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════

export interface ProductIdentity {
  /** 商品唯一标识（本平台内） */
  id: string;
  /** 商品名称 */
  name: string;
  /** 所属平台 */
  platform: string;
  /** 规格/型号 */
  spec?: string;
  /** SKU编码 */
  sku?: string;
  /** 售价 */
  price: number;
  /** 月销量 */
  monthlySales: number;
  /** 其他属性 */
  attributes?: Record<string, string>;
}

export interface CrossPlatformMatch {
  /** 匹配组ID */
  groupId: string;
  /** 匹配的商品列表（每个平台一个） */
  products: ProductIdentity[];
  /** 平均Jaccard相似度 */
  avgSimilarity: number;
  /** 匹配置信度 */
  confidence: "high" | "medium" | "low";
}

export interface CrossPlatformComparison {
  /** 商品名（统一名称） */
  productName: string;
  /** 各平台利润结果 */
  platformResults: ProfitResult[];
  /** 最佳平台 */
  bestPlatform: string;
  /** 最差平台 */
  worstPlatform: string;
  /** 跨平台价差（最高售价-最低售价） */
  priceSpread: number;
  /** 跨平台价差比例 */
  priceSpreadRatio: number;
  /** 是否触发价差预警（>30%） */
  priceSpreadAlert: boolean;
  /** AI综合建议 */
  aiRecommendation?: string;
}

// ═══════════════════════════════════════════════
// Jaccard 相似度计算
// ═══════════════════════════════════════════════

/**
 * 中文文本分词（简单2-gram + 单字）
 */
function tokenize(text: string): Set<string> {
  const cleaned = text.toLowerCase()
    .replace(/[【】\[\]\(\)（）\s]+/g, " ")
    .replace(/[^\w一-鿿\s]/g, "")
    .trim();

  const tokens = new Set<string>();

  // 按空格分词
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  for (const word of words) {
    // 英文词直接加入
    if (/^[a-z0-9]+$/.test(word)) {
      tokens.add(word);
      continue;
    }
    // 中文词：2-gram
    for (let i = 0; i < word.length - 1; i++) {
      tokens.add(word.substring(i, i + 2));
    }
  }

  // 补充：也加入完整的中文分词（按常见电商关键词切分）
  const ecomKeywords = ["蓝牙", "耳机", "无线", "充电", "数据线", "手机壳", "面膜", "支架",
    "T恤", "衬衫", "裤子", "鞋", "包", "零食", "坚果", "奶粉", "尿不湿",
    "pro", "max", "mini", "plus", "5g", "4g", "wifi"];
  for (const kw of ecomKeywords) {
    if (cleaned.includes(kw.toLowerCase())) {
      tokens.add(kw.toLowerCase());
    }
  }

  return tokens;
}

/**
 * Jaccard 相似度：|A ∩ B| / |A ∪ B|
 */
export function jaccardSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }

  const union = tokensA.size + tokensB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// ═══════════════════════════════════════════════
// 商品匹配
// ═══════════════════════════════════════════════

/**
 * 跨平台商品匹配
 *
 * 将来自不同平台的商品按名称相似度分组
 */
export function matchProductsAcrossPlatforms(
  products: ProductIdentity[],
  similarityThreshold: number = 0.30,
): CrossPlatformMatch[] {
  if (products.length <= 1) return [];

  const matched = new Set<string>();
  const groups: CrossPlatformMatch[] = [];
  let groupCounter = 0;

  for (let i = 0; i < products.length; i++) {
    if (matched.has(products[i].id)) continue;

    const group: ProductIdentity[] = [products[i]];
    matched.add(products[i].id);

    for (let j = i + 1; j < products.length; j++) {
      if (matched.has(products[j].id)) continue;
      // 跳过同平台（同一商品不会在同一平台出现两次）
      if (products[j].platform === products[i].platform) continue;

      let similarity = jaccardSimilarity(products[i].name, products[j].name);

      // 如果有规格信息，提高匹配精度
      if (products[i].spec && products[j].spec) {
        const specSim = jaccardSimilarity(products[i].spec!, products[j].spec!);
        similarity = similarity * 0.7 + specSim * 0.3;
      }

      // 如果有SKU，精确匹配
      if (products[i].sku && products[j].sku && products[i].sku === products[j].sku) {
        similarity = 1.0;
      }

      if (similarity >= similarityThreshold) {
        group.push(products[j]);
        matched.add(products[j].id);
      }
    }

    // 只有多平台才形成匹配组
    if (group.length >= 2) {
      groupCounter++;
      const avgSim = group.length > 1
        ? group.reduce((sum, _, idx) => {
            if (idx === 0) return sum;
            return sum + jaccardSimilarity(group[0].name, group[idx].name);
          }, 0) / (group.length - 1)
        : 1;

      groups.push({
        groupId: `cross_${groupCounter}`,
        products: group,
        avgSimilarity: avgSim,
        confidence: avgSim >= 0.70 ? "high" : avgSim >= 0.45 ? "medium" : "low",
      });
    }
  }

  return groups;
}

// ═══════════════════════════════════════════════
// 跨平台对比
// ═══════════════════════════════════════════════

/**
 * 构建跨平台利润对比
 */
export function buildCrossPlatformComparison(
  match: CrossPlatformMatch,
  profitResults: ProfitResult[],
): CrossPlatformComparison | null {
  if (match.products.length < 2) return null;

  // 找到匹配商品的利润结果
  const platformResults: ProfitResult[] = [];
  for (const product of match.products) {
    const result = profitResults.find(r =>
      r.productName === product.name && r.platformKey === product.platform,
    );
    if (result) platformResults.push(result);
  }

  if (platformResults.length < 2) return null;

  // 排序（按利润降序）
  platformResults.sort((a, b) => b.netProfitPerItem - a.netProfitPerItem);

  const best = platformResults[0];
  const worst = platformResults[platformResults.length - 1];

  // 跨平台价差
  const prices = platformResults.map(r => r.sellPrice);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const priceSpread = maxPrice - minPrice;
  const priceSpreadRatio = minPrice > 0 ? priceSpread / minPrice : 0;

  // 取第一个商品名作为统一名称
  const productName = match.products[0].name;

  return {
    productName,
    platformResults,
    bestPlatform: best.platform,
    worstPlatform: worst.platform,
    priceSpread,
    priceSpreadRatio,
    priceSpreadAlert: priceSpreadRatio > 0.30,
    aiRecommendation: generateCrossPlatformRecommendation(platformResults),
  };
}

/**
 * 生成跨平台AI建议
 */
function generateCrossPlatformRecommendation(results: ProfitResult[]): string {
  const profitable = results.filter(r => r.netProfitPerItem > 0);
  const unprofitable = results.filter(r => r.netProfitPerItem <= 0);

  const parts: string[] = [];

  if (unprofitable.length > 0) {
    const names = unprofitable.map(r => r.platform).join("、");
    const totalLoss = unprofitable.reduce((s, r) => s + r.netProfitMonthly, 0);
    parts.push(`⚠️ ${names}平台亏损，月亏约¥${Math.abs(Math.round(totalLoss))}。建议调整定价或停止这些平台的销售。`);
  }

  if (profitable.length > 0) {
    const best = profitable[0];
    parts.push(`✅ 利润最高的平台是${best.platform}（¥${best.netProfitPerItem}/件，利润率${best.profitMargin}%）。建议将更多资源投入该平台。`);
  }

  // 价差预警
  const prices = results.map(r => r.sellPrice);
  const spread = Math.max(...prices) - Math.min(...prices);
  if (spread > 0 && Math.min(...prices) > 0 && spread / Math.min(...prices) > 0.30) {
    parts.push(`🔴 跨平台价差超过30%！存在窜货和消费者信任风险。建议缩小价差至合理范围（15-25%）。`);
  }

  return parts.join("\n");
}

// ═══════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════

/**
 * 从行数据提取商品标识
 */
export function extractProductIdentity(
  row: any,
  platform: string,
  nameField: string,
  priceField: string,
  salesField?: string,
  skuField?: string,
  specField?: string,
): ProductIdentity {
  const name = String(row[nameField] || "unknown");
  const price = parseFloat(String(row[priceField] || "0")) || 0;
  const sales = salesField ? (parseFloat(String(row[salesField] || "0")) || 0) : 0;

  return {
    id: `${platform}_${name}`,
    name,
    platform,
    spec: specField ? String(row[specField] || "") : undefined,
    sku: skuField ? String(row[skuField] || "") : undefined,
    price,
    monthlySales: sales,
  };
}

/**
 * 判断是否所有平台匹配都完成（用于UI状态提示）
 */
export function getMatchStats(matches: CrossPlatformMatch[]): {
  totalGroups: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  coveredPlatforms: Set<string>;
} {
  const coveredPlatforms = new Set<string>();
  let high = 0, medium = 0, low = 0;

  for (const m of matches) {
    if (m.confidence === "high") high++;
    else if (m.confidence === "medium") medium++;
    else low++;
    for (const p of m.products) {
      coveredPlatforms.add(p.platform);
    }
  }

  return { totalGroups: matches.length, highConfidence: high, mediumConfidence: medium, lowConfidence: low, coveredPlatforms };
}
