import type { SemanticRole, ColumnRole, SemanticProfile } from "./types";

var ROLE_PATTERNS: Record<string, RegExp> = {
  money: /\u4ef7|\u91d1\u989d|\u8d39|\u6b3e|pay|amount|price|cost|revenue|total|\u5b9e\u4ed8/i,
  datetime: /\u65f6\u95f4|\u65e5\u671f|date|time|\u4e0b\u5355|\u521b\u5efa|order/i,
  entity_name: /\u540d\u79f0|\u6807\u9898|\u5546\u54c1|\u4ea7\u54c1|name|title|product|item|\u5b9d\u8d1d/i,
  identifier: /\u7f16\u53f7|id$|\u5355\u53f7|\u7535\u8bdd|phone|sku|code|\u7801/i,
  location: /\u5730\u5740|\u7701|\u5e02|addr|region|location|\u6536\u8d27/i,
  quantity: /\u6570\u91cf|\u4ef6\u6570|qty|quantity|count|volume|\u9500\u91cf/i,
  category: /\u5206\u7c7b|\u7c7b\u578b|\u72b6\u6001|category|type|status|\u54c1\u7c7b/i,
};

var ROLE_DECISIONS: Record<string, string[]> = {
  money: ["trend", "ranking", "anomaly", "distribution"],
  datetime: ["trend", "cycle", "seasonality"],
  entity_name: ["ranking", "concentration", "comparison"],
  location: ["geo_distribution", "regional_comparison"],
  quantity: ["ranking", "anomaly", "trend"],
  category: ["breakdown", "concentration", "comparison"],
};

export function detectRoles(columns: string[], sampleRows: Record<string, unknown>[]): ColumnRole[] {
  var result: ColumnRole[] = [];

  for (var i = 0; i < columns.length; i++) {
    var col = columns[i];
    var bestRole: SemanticRole = "text";
    var bestConfidence = 0;

    // Pattern matching
    for (var role in ROLE_PATTERNS) {
      if (ROLE_PATTERNS[role].test(col)) {
        var conf = 0.7; // Base confidence from pattern match
        bestRole = role as SemanticRole;
        bestConfidence = conf;
        break;
      }
    }

    // Value-based verification
    var values: string[] = [];
    var numCount = 0, dateCount = 0, total = 0;
    for (var j = 0; j < Math.min(sampleRows.length, 50); j++) {
      var v = sampleRows[j][col];
      if (v === undefined || v === null || v === "") continue;
      var vs = String(v);
      values.push(vs.substring(0, 30));
      total++;
      if (typeof v === "number" || (!isNaN(Number(v)) && Number(v) !== 0)) numCount++;
      var d = new Date(String(v));
      if (!isNaN(d.getTime()) && d.getFullYear() > 2000 && d.getFullYear() < 2100) dateCount++;
    }

    // Value-based role confirmation
    if (numCount > total * 0.7 && bestRole !== "money") {
      bestRole = "quantity";
      bestConfidence = Math.max(bestConfidence, 0.75);
    }
    if (dateCount > total * 0.7 && bestRole !== "datetime") {
      bestRole = "datetime";
      bestConfidence = Math.max(bestConfidence, 0.8);
    }
    if (bestRole === "money" && numCount > 0) {
      bestConfidence = Math.max(bestConfidence, 0.85);
    }

    result.push({
      column: col,
      role: bestRole,
      confidence: bestConfidence,
      sampleValues: values.slice(0, 5),
    });
  }

  return result;
}

export function getAvailableDecisions(profile: ColumnRole[]): string[] {
  var roles = new Set<string>();
  for (var i = 0; i < profile.length; i++) {
    if (profile[i].confidence >= 0.6) {
      var decision = ROLE_DECISIONS[profile[i].role];
      if (decision) decision.forEach(function(d) { roles.add(d); });
    }
  }
  return Array.from(roles);
}

export function buildSemanticProfile(datasetId: string, columns: string[], rows: Record<string, unknown>[]): SemanticProfile {
  var profile = detectRoles(columns, rows);
  var decisions = getAvailableDecisions(profile);
  var moneyCols = profile.filter(function(p) { return p.role === "money" && p.confidence >= 0.7; });
  var entityCols = profile.filter(function(p) { return p.role === "entity_name" && p.confidence >= 0.6; });

  var summary = rows.length + " rows, " + columns.length + " columns. ";
  if (moneyCols.length > 0) summary += "Money columns: " + moneyCols.map(function(m) { return m.column; }).join(", ") + ". ";
  if (entityCols.length > 0) summary += "Entity columns: " + entityCols.map(function(e) { return e.column; }).join(", ") + ". ";

  return {
    datasetId: datasetId,
    columns: profile,
    summary: summary,
    availableDecisions: decisions,
  };
}
