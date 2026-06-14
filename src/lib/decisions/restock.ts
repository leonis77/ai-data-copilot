import type { DecisionCard, DecisionContext } from "./types";
import { logger } from "@/lib/logger";

export function generateRestockDecisions(ctx: DecisionContext): DecisionCard[] {
  try {
    const { columns, rows, productMetrics } = ctx;
    if (!rows || rows.length < 3) return [];

    // Find quantity/sales columns
    const qtyCol = columns.find(function(c) {
      return /\u6570\u91cf|\u9500\u91cf|quantity|qty|count|\u603b\u6570\u91cf/i.test(c);
    });
    const nameCol = columns.find(function(c) {
      return /\u540d\u79f0|\u5546\u54c1|\u4ea7\u54c1|\u6807\u9898|name|title|product/i.test(c);
    });

    // Use productMetrics from diagnosis engine if available
    if (productMetrics && productMetrics.length > 0) {
      const decisions: DecisionCard[] = [];

      // Find products with high sales velocity
      const bySales = [...productMetrics].sort(function(a, b) {
        return (b.salesVolume || b.sales || 0) - (a.salesVolume || a.sales || 0);
      });

      if (bySales.length > 0 && bySales[0].name) {
        decisions.push({
          id: "restock_top_" + Date.now(),
          type: "restock",
          priority: "P1",
          title: "\u7545\u9500\u5546\u54c1\u8865\u8d27\u63d0\u9192",
          description: bySales[0].name + " \u9500\u91cf\u9886\u5148\uff0c\u5efa\u8bae\u786e\u4fdd\u5e93\u5b58\u5145\u8db3",
          impact: "\u907f\u514d\u56e0\u7f3a\u8d27\u5bfc\u81f4\u7684\u8425\u4e1a\u989d\u635f\u5931",
          action: "\u68c0\u67e5\u5e93\u5b58",
          confidence: "medium",
          relatedProduct: bySales[0].name,
        });
      }

      return decisions;
    }

    return [];
  } catch (e) {
    logger.warn("restock decisions failed", { message: e instanceof Error ? e.message : String(e) });
    return [];
  }
}
