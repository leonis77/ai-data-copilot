// Standardized decision output + priority scoring
import type { Diagnosis } from "./diagnosis-engine";

export interface Action {
  action: string;
  target: string;
  priority: "P0" | "P1" | "P2";
  expected_impact: string;
  confidence: "high" | "medium" | "low";
  reason: string;
  risk: string;
}

export function computePriority(d: Diagnosis): { score: number; level: "P0"|"P1"|"P2" } {
  let score = 0;
  // Risk weight
  if (d.level === "critical") score += 40;
  if (d.level === "warning") score += 20;
  // Revenue impact
  if (d.impact) {
    const match = d.impact.match(/¥?(\d[\d,.]*)/);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g,""));
      if (amount > 10000) score += 30;
      else if (amount > 1000) score += 15;
      else score += 5;
    }
  }
  // Urgency
  if (d.type === "stockout") score += 35;
  if (d.type === "hitdep") score += 20;
  if (d.type === "deadstock") score += 10;
  if (d.type === "opportunity") score += 5;

  const level = score >= 50 ? "P0" : score >= 25 ? "P1" : "P2";
  return { score, level };
}

export function generateActions(diagnoses: Diagnosis[]): Action[] {
  return diagnoses
    .filter(function(d) { return d.action; })
    .map(function(d) {
      const p = computePriority(d);
      const target = d.products && d.products.length > 0 ? d.products.join(",") : d.title;
      return {
        action: d.action || "",
        target: target,
        priority: p.level,
        expected_impact: d.impact || "预计改善经营指标",
        confidence: (d.level === "opportunity" ? "medium" : (d.level === "critical" ? "high" : "medium")) as "high" | "medium" | "low",
        reason: d.detail,
        risk: d.type === "priceup" ? "涨价可能影响销量" : d.type === "stockout" ? "缺货可能导致客户流失" : "执行后持续监控",
      };
    })
    .sort(function(a, b) {
      const order = { P0: 0, P1: 1, P2: 2 };
      return order[a.priority] - order[b.priority];
    });
}
