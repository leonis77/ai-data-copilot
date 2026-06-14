import type { DecisionCard, DecisionContext } from "./types";
import { logger } from "@/lib/logger";

function findCol(cols: string[], patterns: RegExp[][]): string | undefined {
  for (const group of patterns) {
    for (const p of group) {
      const found = cols.find(function(c) { return p.test(c); });
      if (found) return found;
    }
  }
  return undefined;
}

export function generatePricingDecisions(ctx: DecisionContext): DecisionCard[] {
  try {
    const { columns, rows } = ctx;
    if (!rows || rows.length < 3) return [];

    // Find price/amount columns - both Chinese and English
    const priceCol = findCol(columns, [
      [/\u5b9e\u4ed8/, /\u91d1\u989d/, /\u4ef7\u683c/, /\u603b\u4ef7/],
      [/amount/, /price/, /pay/, /total/, /revenue/],
    ]);
    const nameCol = findCol(columns, [
      [/\u540d\u79f0/, /\u5546\u54c1/, /\u4ea7\u54c1/, /\u6807\u9898/, /\u5b9d\u8d1d/],
      [/name/, /title/, /product/, /item/],
    ]);

    if (!priceCol) return [];

    const decisions: DecisionCard[] = [];

    // Calculate price distribution
    const values: { name: string; price: number }[] = [];
    for (const row of rows) {
      const v = Number(row[priceCol]);
      if (!isNaN(v) && v > 0) {
        values.push({
          name: nameCol ? String(row[nameCol] || "Unknown").substring(0, 25) : "Item #" + values.length,
          price: v,
        });
      }
    }
    if (values.length < 3) return [];

    // Sort by price descending
    const sorted = [...values].sort(function(a, b) { return b.price - a.price; });
    const avg = values.reduce(function(s, v) { return s + v.price; }, 0) / values.length;
    const top3 = sorted.slice(0, 3);

    // Decision 1: High-value items - pricing review
    if (top3[0] && top3[0].price > avg * 2) {
      decisions.push({
        id: "price_high_" + Date.now(),
        type: "pricing",
        priority: "P1",
        title: "\u9ad8\u4ef7\u5546\u54c1\u5b9a\u4ef7\u5ba1\u67e5",
        description: top3[0].name + " \u552e\u4ef7 \u00a5" + top3[0].price.toLocaleString() + "\uff0c\u8fdc\u9ad8\u4e8e\u5747\u4ef7 \u00a5" + Math.round(avg).toLocaleString(),
        impact: "\u5efa\u8bae\u786e\u8ba4\u8be5\u4ef7\u683c\u662f\u5426\u6709\u5e02\u573a\u7ade\u4e89\u529b\uff0c\u82e5\u8f6c\u5316\u7387\u4f4e\u53ef\u8003\u8651\u964d\u4ef7",
        action: "\u5ba1\u67e5\u5b9a\u4ef7",
        confidence: "medium",
        relatedProduct: top3[0].name,
        relatedMetric: { label: "\u5747\u4ef7", value: "\u00a5" + Math.round(avg).toLocaleString() },
      });
    }

    // Decision 2: Price concentration - dependency risk
    const top3Total = top3.reduce(function(s, v) { return s + v.price; }, 0);
    const allTotal = values.reduce(function(s, v) { return s + v.price; }, 0);
    const concentration = allTotal > 0 ? Math.round(top3Total / allTotal * 100) : 0;
    if (concentration > 60 && values.length > 5) {
      decisions.push({
        id: "price_conc_" + Date.now(),
        type: "pricing",
        priority: "P2",
        title: "\u6536\u5165\u96c6\u4e2d\u5ea6\u504f\u9ad8",
        description: "TOP3 \u5546\u54c1\u5360\u603b\u91d1\u989d\u7684 " + concentration + "%\uff0c\u5b58\u5728\u7206\u6b3e\u4f9d\u8d56\u98ce\u9669",
        impact: "\u5efa\u8bae\u57f9\u80b2\u957f\u5c3e\u5546\u54c1\uff0c\u5206\u6563\u6536\u5165\u6765\u6e90",
        action: "\u4f18\u5316\u5546\u54c1\u7ed3\u6784",
        confidence: "high",
        relatedMetric: { label: "TOP3 \u5360\u6bd4", value: concentration + "%" },
      });
    }

    return decisions;
  } catch (e) {
    logger.warn("pricing decisions failed", { message: e instanceof Error ? e.message : String(e) });
    return [];
  }
}
