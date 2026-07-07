// Diagnosis engine - rule-based health assessment with knowledge-backed references
import type { ProductMetrics, StoreMetrics } from "./metrics-engine";
import type { ProfitResult } from "@/lib/profit/engine";
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

/**
 * 利润诊断：从 ProfitResult[] 中检测亏损、平台固定费负担等利润相关问题。
 *
 * 这是对 diagnoseProducts() 的补充 — 后者只看库存/结构/价格，对利润数据无感知。
 * Pipeline Layer 2 中调用本函数，将利润发现注入 Diagnosis[]。
 */
export function diagnoseProfitIssues(
  profitResults: ProfitResult[],
  platform: string,
): Diagnosis[] {
  const results: Diagnosis[] = [];
  if (profitResults.length === 0) return results;

  const dropProducts: ProfitResult[] = [];
  const reduceProducts: ProfitResult[] = [];
  const jdFeeBurdenProducts: ProfitResult[] = [];

  for (const r of profitResults) {
    // 严重亏损品 → critical
    if (r.verdict === "drop" && r.profitMargin < -10) {
      dropProducts.push(r);
      results.push({
        level: "critical",
        type: "negative_margin_severe",
        title: r.productName + " 严重亏损",
        detail:
          "月亏 ¥" +
          Math.abs(Math.round(r.netProfitMonthly)).toLocaleString() +
          "，单品利润 ¥" +
          (r.netProfitPerItem >= 0 ? "+" : "−") +
          Math.abs(r.netProfitPerItem).toFixed(2) +
          "，利润率 " +
          (r.profitMargin >= 0 ? "+" : "−") +
          Math.abs(r.profitMargin) +
          "%",
        products: [r.productName],
        action: "立即停止采购 " + r.productName + "，或用提价/换供应商扭转亏损",
        impact: "止损后可节省约 ¥" + Math.abs(Math.round(r.netProfitMonthly)).toLocaleString() + "/月",
        reference:
          "依据 RULE_NEGATIVE_MARGIN_SEVERE：单品利润率低于-10%属于严重亏损，持续将影响整体现金流。证据卡 verdict=" +
          r.verdict +
          "，置信度 " +
          Math.round(r.verdictConfidence * 100) +
          "%",
      });
    }

    // 微亏品 → warning
    if (r.verdict === "reduce" && r.profitMargin < 0) {
      reduceProducts.push(r);
      results.push({
        level: "warning",
        type: "negative_margin",
        title: r.productName + " 微亏",
        detail:
          "月亏 ¥" +
          Math.abs(Math.round(r.netProfitMonthly)).toLocaleString() +
          "，利润率 " +
          (r.profitMargin >= 0 ? "+" : "−") +
          Math.abs(r.profitMargin) +
          "%。亏损幅度较小，建议减量观察或小幅提价。",
        products: [r.productName],
        action: "减量观察 " + r.productName + "，尝试小幅提价",
        impact: "优化后预计改善 ¥" + Math.abs(Math.round(r.netProfitMonthly * 0.5)).toLocaleString() + "/月",
        reference:
          "依据 RULE_NEGATIVE_MARGIN：单品利润为负但幅度较小，需评估优化空间。证据卡 verdict=" +
          r.verdict +
          "，置信度 " +
          Math.round(r.verdictConfidence * 100) +
          "%",
      });
    }

    // 京东月费分摊负担 → warning
    if (
      r.platformKey === "jd" &&
      r.costs.fixedFeePerItem > 0 &&
      r.profitMargin < 0.05
    ) {
      jdFeeBurdenProducts.push(r);
      // 避免重复添加同一类诊断
      if (jdFeeBurdenProducts.length === 1) {
        results.push({
          level: "warning",
          type: "jd_fixed_fee_burden",
          title: "京东月费分摊负担 (影响 " + (jdFeeBurdenProducts.length > 1 ? "多品" : r.productName) + ")",
          detail:
            "京东月费 ¥1,000 分摊到低销量单品导致单位成本偏高。" +
            "月销 <100 件时固定费负担显著，当前部分商品月销不足，每件负担 ¥" +
            r.costs.fixedFeePerItem.toFixed(0) +
            "+ 的固定费用。",
          products: jdFeeBurdenProducts.map(function(p) { return p.productName; }),
          action: "评估京东POP模式是否适合当前品类，提升销量摊薄固定成本或考虑其他平台",
          impact: "若能提升月销量至100件+，每件固定费成本从 ¥" + r.costs.fixedFeePerItem.toFixed(0) + " 降至 ¥10 以下",
          reference:
            "依据 RULE_JD_FIXED_FEE_BURDEN：京东月费 ¥1,000 分摊到低销量品导致单位成本偏高，月销 <100 件时影响显著。",
        });
      } else {
        // 追加产品到已有诊断
        var lastJdDiag = results[results.length - 1];
        if (lastJdDiag.type === "jd_fixed_fee_burden" && lastJdDiag.products) {
          lastJdDiag.products.push(r.productName);
          lastJdDiag.title = "京东月费分摊负担 (影响 " + lastJdDiag.products.length + "品)";
        }
      }
    }
  }

  // 平台级诊断：如果该平台所有商品都是 drop → critical
  if (dropProducts.length === profitResults.length && profitResults.length > 0) {
    const totalMonthlyLoss = dropProducts.reduce(function(s, r) { return s + r.netProfitMonthly; }, 0);
    results.push({
      level: "critical",
      type: "platform_unprofitable",
      title: "平台整体亏损",
      detail:
        platform +
        "全品类 " +
        dropProducts.length +
        " 件商品均处于亏损状态，合计月亏 ¥" +
        Math.abs(Math.round(totalMonthlyLoss)).toLocaleString() +
        "。需要重新评估该平台的经营策略。",
      products: dropProducts.map(function(p) { return p.productName; }),
      action: "紧急评估 " + platform + " 平台策略：考虑削减品类、重新定价、或暂停该平台运营",
      impact: "平台级止损潜力约 ¥" + Math.abs(Math.round(totalMonthlyLoss)).toLocaleString() + "/月",
      reference:
        "所有证据卡 verdict=drop，" +
        dropProducts.length +
        " 件商品全部触发 RULE_NEGATIVE_MARGIN_SEVERE。",
    });
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
