import type { SemanticRole, ColumnRole, SemanticProfile } from "./types";

var ROLE_PATTERNS: Record<string, RegExp> = {
  // Order matters! More specific patterns should be checked first.
  // e.g. "\u4ea7\u54c1\u5206\u7c7b" \u2192 should match category ("\u5206\u7c7b") not entity_name ("\u4ea7\u54c1")
  money: /\u4ef7|\u91d1\u989d|\u8d39|\u6b3e|pay|amount|price|cost|revenue|total|\u5b9e\u4ed8|\u4f63\u91d1|commission|\u6536\u5165|\u652f\u51fa|\u5229\u6da6|\u6bdb\u5229/i,
  datetime: /\u65f6\u95f4|\u65e5\u671f|date|time|\u4e0b\u5355|\u521b\u5efa|order|\u7ed3\u7b97|\u652f\u4ed8/i,
  entity_name: /\u540d\u79f0|\u6807\u9898|\u5546\u54c1|\u4ea7\u54c1|name|title|product|item|\u5b9d\u8d1d|goods|sku|\u54c1\u540d/i,
  identifier: /\u7f16\u53f7|id$|\u5355\u53f7|\u7535\u8bdd|phone|sku|code|\u7801|\u8ba2\u5355\u53f7/i,
  location: /\u5730\u5740|\u7701|\u5e02|addr|region|location|\u6536\u8d27/i,
  quantity: /\u6570\u91cf|\u4ef6\u6570|qty|quantity|count|volume|\u9500\u91cf|\u5e93\u5b58/i,
  category: /\u5206\u7c7b|\u7c7b\u578b|\u72b6\u6001|category|type|status|\u54c1\u7c7b|\u7c7b\u76ee|\u5e73\u53f0/i,
  // \ud83c\udd95 2026\u5e74\u65b0\u589e\uff1a\u6296\u97f3\u7535\u5546\u4e13\u5c5e\u5b57\u6bb5
  influencer: /\u8fbe\u4eba|\u4e3b\u64ad|influencer|KOL|\u4f63\u91d1\u7387|\u8fbe\u4eba\u7b49\u7ea7|\u8fbe\u4eba\u5206\u7ea7|\u5751\u4f4d\u8d39/i,
  platform: /\u5e73\u53f0|platform|\u6e20\u9053|channel|\u5e97\u94fa|shop|\u5e97\u94fa\u540d/i,
  return_refund: /\u9000\u8d27|\u9000\u6b3e|refund|return|\u552e\u540e|\u4ec5\u9000\u6b3e/i,
};

var ROLE_DECISIONS: Record<string, string[]> = {
  money: ["trend", "ranking", "anomaly", "distribution", "profit_analysis"],
  datetime: ["trend", "cycle", "seasonality"],
  entity_name: ["ranking", "concentration", "comparison", "cross_platform_matching"],
  location: ["geo_distribution", "regional_comparison"],
  quantity: ["ranking", "anomaly", "trend", "inventory_alert"],
  category: ["breakdown", "concentration", "comparison"],
  // 🆕 2026年新增角色决策
  influencer: ["roi_analysis", "influencer_comparison", "grade_optimization"],
  platform: ["cross_platform_comparison", "platform_profit_ranking"],
  return_refund: ["return_rate_analysis", "quality_alert", "refund_trend"],
};

export function detectRoles(columns: string[], sampleRows: Record<string, unknown>[]): ColumnRole[] {
  var result: ColumnRole[] = [];

  // 元数据列（系统生成的，不是用户数据）
  var META_COLUMNS = ["sheet_name", "__row_id", "__index"];

  for (var i = 0; i < columns.length; i++) {
    var col = columns[i];

    // 跳过元数据列
    if (META_COLUMNS.indexOf(col) !== -1) {
      result.push({ column: col, role: "text", confidence: 0, sampleValues: [] });
      continue;
    }

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
