// Diagnosis engine - rule-based health assessment with knowledge-backed references
import type { ProductMetrics, StoreMetrics } from "./metrics-engine";
import { searchKnowledge } from "@/lib/rag/knowledge";

// Knowledge-backed reference data for diagnosis enrichment
// Each reference links a diagnosis type to knowledge base entries that provide market context
const KNOWLEDGE_REFS: Record<string, { id: string; summary: string }> = {
  stockout: { id: "method_inventory_health", summary: "参考依据：EOQ经济订货量模型 — 最优订货量=√(2×年需求量×单次订货成本/单位持有成本)。库存资金占用成本=库存金额×月资金成本率(0.5%-1%)×月数。" },
  deadstock: { id: "alert_inventory_dead_stock", summary: "参考依据：库存天数>90天为黄色预警，>180天为红色预警。清仓定价不低于进货成本的80%，优先处理高价值滞销品。" },
  priceup: { id: "benchmark_profit_margin_by_category", summary: "参考依据：3C数码类目毛利率10%-25%，全品类净利率通常为毛利率的40%-60%。提价需评估对转化率的影响（参考：价格每上涨5%，行业平均转化率下降1%-3%）。" },
  hitdep: { id: "method_pareto_analysis", summary: "参考依据：帕累托法则 — TOP20%商品通常贡献80%销售额。TOP3占比>60%存在爆款依赖风险，理想状态TOP10贡献50%-60%，长尾40%-50%。" },
  redundant: { id: "method_pareto_analysis", summary: "参考依据：长尾SKU占SKU总数60%+但贡献<2%时，建议精简以释放运营资源和库存资金。每个低效SKU的隐性持有成本约¥200-500/月（仓储+管理+资金占用）。" },
};

export interface Diagnosis {
  level: "critical" | "warning" | "opportunity";
  type: string;
  title: string;
  detail: string;
  products?: string[];
  action?: string;
  impact?: string;
  /** 市场参考依据，来源于知识库 */
  reference?: string;
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
        products: [p.name], action: "补货 " + p.name,
        impact: "避免断货损失约¥" + Math.round(p.revenue/p.sales*10),
        reference: KNOWLEDGE_REFS.stockout.summary });
    }
    // High stock + low sales -> dead stock
    if (p.turnover !== undefined && p.turnover < 0.5 && p.stock! > 20) {
      results.push({ level: "warning", type: "deadstock", title: p.name + " 滞销风险",
        detail: "库存" + p.stock + "件，周转率仅" + p.turnover + "，建议促销清仓",
        products: [p.name], action: "促销清仓 " + p.name,
        impact: "释放库存资金约¥" + Math.round(p.avgPrice*p.stock!*0.5),
        reference: KNOWLEDGE_REFS.deadstock.summary });
    }
    // High sales + low price -> can raise price
    var avgPriceAll = totalRevenue / products.length;
    if (p.contribution > 15 && p.avgPrice < avgPriceAll * 0.7) {
      results.push({ level: "opportunity", type: "priceup", title: p.name + " 可提价",
        detail: "贡献度" + p.contribution + "%（营收¥" + p.revenue + "），当前均价¥" + p.avgPrice + " vs 全品均价¥" + Math.round(avgPriceAll) + "，低于均值" + Math.round((1 - p.avgPrice/avgPriceAll) * 100) + "%，建议提价5-10%",
        products: [p.name], action: p.name + " 提价5%",
        impact: "预计增加毛利约¥" + Math.round(p.revenue*0.05) + "（基于当前营收¥" + p.revenue + "×5%估算）",
        reference: KNOWLEDGE_REFS.priceup.summary });
    }
  }

  // Store-level diagnosis
  const top3 = products.slice(0,3).reduce(function(s,p){return s+p.revenue},0);
  const top3Ratio = totalRevenue>0 ? top3/totalRevenue : 0;
  if (top3Ratio > 0.7) {
    results.push({ level: "warning", type: "hitdep", title: "爆款依赖",
      detail: "Top3商品占销售额" + Math.round(top3Ratio*100) + "%，过度集中有风险",
      products: products.slice(0,3).map(function(p){return p.name}),
      action: "培育腰部商品，降低爆款依赖",
      reference: KNOWLEDGE_REFS.hitdep.summary });
  }

  // Long tail redundancy
  const longTail = products.filter(function(p){return p.contribution<2});
  if (longTail.length > products.length*0.6) {
    results.push({ level: "warning", type: "redundant", title: "SKU结构冗余",
      detail: longTail.length + "个SKU（" + Math.round(longTail.length/products.length*100) + "%）贡献不足2%，建议精简",
      action: "精简低效SKU " + longTail.slice(0,3).map(function(p){return p.name}).join(","),
      reference: KNOWLEDGE_REFS.redundant.summary });
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
