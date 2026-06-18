export type ProductSignal = "hot" | "value" | "new" | "tail" | "caution";

export interface TaggedProduct {
  name: string; price: number; signals: ProductSignal[]; reason: string; category: string;
}

/**
 * 根据产品分类标签和价格位置生成信号
 */
function containsTag(category: string, price: number, p25: number, p75: number): { signals: ProductSignal[]; reason: string } {
  var signals: ProductSignal[] = [];
  var reasons: string[] = [];
  var cat = category;

  // 主推商品 → hot
  if (/主推/.test(cat)) { signals.push("hot"); reasons.push("主推"); }
  // 新品 → new
  if (/新品/.test(cat)) { signals.push("new"); reasons.push("新品"); }
  // 低价商品 → value (高性价比)
  if (price < p25) { signals.push("value"); reasons.push("高性价比"); }
  // 尾季商品 → tail
  if (/尾季/.test(cat)) { signals.push("tail"); reasons.push("尾季"); }
  // 高价商品 → 谨慎
  if (price > p75) { signals.push("caution"); reasons.push("高价，建议少量试销"); }

  // 有信号用信号，否则标记普通
  return { signals: signals.length > 0 ? signals : [], reason: reasons.join("，") || "普通" };
}

/**
 * 对产品打标签，去重（同产品名取最低价）
 */
export function tagProducts(
  rows: Record<string, unknown>[],
  nameCol: string, catCol: string, priceCol: string,
  p25: number, p75: number,
  limit?: number
): TaggedProduct[] {
  var maxResults = limit !== undefined ? limit : 15;

  // Step 1: 聚合 — 按产品名分组，取最低价和第一个分类
  var productMap: Record<string, { name: string; minPrice: number; category: string }> = {};

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rawName = String(row[nameCol] || "").trim();
    var cat = String(row[catCol] || "");
    var price = Number(row[priceCol]) || 0;

    if (!rawName || price <= 0) continue;
    // 截断过长的名称
    var name = rawName.length > 30 ? rawName.substring(0, 30) + "..." : rawName;

    if (!productMap[name]) {
      productMap[name] = { name: name, minPrice: price, category: cat };
    } else {
      // 保留最低价
      if (price < productMap[name].minPrice) {
        productMap[name].minPrice = price;
        productMap[name].category = cat; // 用最低价对应的分类
      }
    }
  }

  // Step 2: 打分排序（信号多的排前面，同信号按价格）
  var scored: { product: typeof productMap[string]; signals: ProductSignal[]; reason: string; score: number }[] = [];

  for (var key in productMap) {
    if (!productMap.hasOwnProperty(key)) continue;
    var product = productMap[key];
    var tagResult = containsTag(product.category, product.minPrice, p25, p75);
    var score = tagResult.signals.length;
    // hot 加分
    if (tagResult.signals.indexOf("hot") !== -1) score += 2;
    // caution 减分
    if (tagResult.signals.indexOf("caution") !== -1) score -= 1;

    scored.push({ product: product, signals: tagResult.signals, reason: tagResult.reason, score: score });
  }

  // Step 3: 排序
  scored.sort(function (a, b) { return b.score - a.score; });

  // Step 4: 取前 N
  return scored.slice(0, maxResults).map(function (s) {
    return {
      name: s.product.name,
      price: s.product.minPrice,
      signals: s.signals,
      reason: s.reason,
      category: s.product.category,
    };
  });
}
