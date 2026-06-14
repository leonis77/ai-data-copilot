import type { DecisionCard, DecisionContext } from "./types";
import { generatePricingDecisions } from "./pricing";
import { generateRestockDecisions } from "./restock";
import { logger } from "@/lib/logger";

const priorityScore: Record<string, number> = { P0: 3, P1: 2, P2: 1 };

export function generateAllDecisions(ctx: DecisionContext): DecisionCard[] {
  try {
    var all: DecisionCard[] = [];

    // Collect from all engines
    all = all.concat(generatePricingDecisions(ctx));
    all = all.concat(generateRestockDecisions(ctx));

    // Sort by priority
    all.sort(function(a, b) {
      return (priorityScore[b.priority] || 0) - (priorityScore[a.priority] || 0);
    });

    // Deduplicate by title
    var seen: Record<string, boolean> = {};
    var deduped: DecisionCard[] = [];
    for (var i = 0; i < all.length; i++) {
      var key = all[i].type + "_" + all[i].title;
      if (!seen[key]) { seen[key] = true; deduped.push(all[i]); }
    }

    return deduped.slice(0, 6);
  } catch (e) {
    logger.error("decision router failed", { message: e instanceof Error ? e.message : String(e) });
    return [];
  }
}
