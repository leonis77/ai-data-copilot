import { LegacyTemplate, ColumnMeta } from "./types";
import { tmall } from "./tmall";
import { jd } from "./jd";
import { pdd } from "./pdd";
import { douyin } from "./douyin";
import { generic } from "./generic";

export { matchPlatformTemplate, matchAllTemplates } from "./matcher";
export { ALL_PLATFORM_TEMPLATES, getTemplatesByCategory, getTemplatesByPlatform } from "./platforms";
export type { PlatformTemplate, TemplateMatchResult, FieldMapping, MatchRules, ParseRules, Platform, TemplateCategory } from "./types";

// ============================================================================
// Old template system (backward compatible)
// ============================================================================

export var templates: LegacyTemplate[] = [tmall, jd, pdd, douyin];

/**
 * @deprecated 旧版模板匹配 — 请使用 matchPlatformTemplate()
 */
export function matchTemplate(columns: string[]): LegacyTemplate | null {
  var bestScore = 0;
  var best: LegacyTemplate | null = null;
  for (var i = 0; i < templates.length; i++) {
    var t = templates[i];
    var fields = Object.keys(t.fieldMap);
    var hits = fields.filter(function(f) { return columns.some(function(c) { return c.includes(f); }); }).length;
    var score = fields.length > 0 ? hits / Math.min(fields.length, columns.length) : 0;
    if (score > bestScore && score >= 0.25) { bestScore = score; best = t; }
  }
  return best;
}

/**
 * @deprecated 旧版模板应用 — 请使用新版模板系统的 fieldMap.standard
 */
export function applyTemplate(columns: string[], template: LegacyTemplate | null): ColumnMeta[] {
  if (!template || template.id === "generic") {
    return columns.map(function(c) {
      return { name: c, type: inferType(c), selected: true };
    });
  }
  return columns.map(function(c) {
    var stdName = template.fieldMap[c] || undefined;
    var colType = (stdName && template.columnTypes[stdName]) || inferType(c);
    return { name: c, standardName: stdName, type: colType, selected: true };
  });
}

export function applyClean(value: string, template: LegacyTemplate | null, standardField?: string): string {
  if (!template || !standardField) return value;
  var rule = template.cleanRules[standardField];
  if (rule === "removeSymbol") return String(value).replace(/[¥￥,，]/g, "").trim();
  return String(value);
}

function inferType(name: string): "number" | "date" | "category" | "text" {
  var n = name.toLowerCase();
  if (/价格|金额|price|amount|total|数量|quantity|qty|运费|花费|消耗/.test(n)) return "number";
  if (/时间|日期|date|time|下单|创建/.test(n)) return "date";
  if (/状态|status|分类|category|类型|方式|原因/.test(n)) return "category";
  return "text";
}
