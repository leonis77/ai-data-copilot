// Diagnosis engine - rule-based health assessment
import type { ProductMetrics, StoreMetrics } from "./metrics-engine";

export interface Diagnosis {
  level: "critical" | "warning" | "opportunity";
  type: string;
  title: string;
  detail: string;
  products?: string[];
  action?: string;
  impact?: string;
}

export interface HealthScore {
  score: number; // 0-100
  breakdown: { category: string; score: number; maxScore: number }[];
}

export function diagnoseProducts(products: ProductMetrics[]): Diagnosis[] {
  const results: Diagnosis[] = [];
  if (products.length === 0) return results;

  const totalRevenue = products.reduce(function(s,p){return s+p.revenue},0);

  // Product-level diagnosis
  for (const p of products) {
    // Low stock + high sales -> shortage risk
    if (p.turnover !== undefined && p.turnover > 5 && p.stock! < 10) {
      results.push({ level: "critical", type: "stockout", title: p.name + " 缺货风险",
        detail: "库存仅" + p.stock + "件，周转率" + p.turnover + "，建议立即补货",
        products: [p.name], action: "补货 " + p.name, impact: "避免断货损失约¥" + Math.round(p.revenue/p.sales*10) });
    }
    // High stock + low sales -> dead stock
    if (p.turnover !== undefined && p.turnover < 0.5 && p.stock! > 20) {
      results.push({ level: "warning", type: "deadstock", title: p.name + " 滞销风险",
        detail: "库存" + p.stock + "件，周转率仅" + p.turnover + "，建议促销清仓",
        products: [p.name], action: "促销清仓 " + p.name, impact: "释放库存资金约¥" + Math.round(p.avgPrice*p.stock!*0.5) });
    }
    // High sales + low price -> can raise price
    if (p.contribution > 15 && p.avgPrice < totalRevenue/products.length*0.7) {
      results.push({ level: "opportunity", type: "priceup", title: p.name + " 可提价",
        detail: "贡献度" + p.contribution + "%，价格低于均值30%+，建议提价5-10%",
        products: [p.name], action: p.name + " 提价5%", impact: "预计增加毛利约¥" + Math.round(p.revenue*0.05) });
    }
  }

  // Store-level diagnosis
  const top3 = products.slice(0,3).reduce(function(s,p){return s+p.revenue},0);
  const top3Ratio = totalRevenue>0 ? top3/totalRevenue : 0;
  if (top3Ratio > 0.7) {
    results.push({ level: "warning", type: "hitdep", title: "爆款依赖",
      detail: "Top3商品占销售额" + Math.round(top3Ratio*100) + "%，过度集中有风险",
      products: products.slice(0,3).map(function(p){return p.name}),
      action: "培育腰部商品，降低爆款依赖" });
  }

  // Long tail redundancy
  const longTail = products.filter(function(p){return p.contribution<2});
  if (longTail.length > products.length*0.6) {
    results.push({ level: "warning", type: "redundant", title: "SKU结构冗余",
      detail: longTail.length + "个SKU（" + Math.round(longTail.length/products.length*100) + "%）贡献不足2%，建议精简",
      action: "精简低效SKU " + longTail.slice(0,3).map(function(p){return p.name}).join(",") });
  }

  return results;
}

export function computeHealthScore(products: ProductMetrics[], diagnosis: Diagnosis[]): HealthScore {
  const breakdown = [
    { category: "库存健康", score: countBy(diagnosis,"stockout")===0?30:15, maxScore: 30 },
    { category: "销量结构", score: countBy(diagnosis,"hitdep")===0?25:10, maxScore: 25 },
    { category: "产品效率", score: countBy(diagnosis,"deadstock")===0?25:10, maxScore: 25 },
    { category: "价格健康", score: 20, maxScore: 20 },
  ];
  const total = breakdown.reduce(function(s,b){return s+b.score},0);
  return { score: total, breakdown };
}

function countBy(arr: Diagnosis[], type: string): number {
  return arr.filter(function(d){return d.type===type}).length;
}
