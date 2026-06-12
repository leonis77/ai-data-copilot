import { PlatformTemplate, ColumnMeta } from "./types";
import { tmall } from "./tmall";
import { jd } from "./jd";
import { pdd } from "./pdd";
import { douyin } from "./douyin";
import { generic } from "./generic";

export const templates: PlatformTemplate[] = [tmall, jd, pdd, douyin];

// Match template to columns, return best match (or null)
export function matchTemplate(columns: string[]): PlatformTemplate | null {
  let bestScore = 0;
  let best: PlatformTemplate | null = null;
  for (const t of templates) {
    const fields = Object.keys(t.fieldMap);
    const hits = fields.filter(function(f) { return columns.some(function(c) { return c.includes(f); }); }).length;
    const score = fields.length > 0 ? hits / Math.min(fields.length, columns.length) : 0;
    if (score > bestScore && score >= 0.25) { bestScore = score; best = t; }
  }
  return best;
}

// Apply template to raw columns: return ColumnMeta[]
export function applyTemplate(columns: string[], template: PlatformTemplate | null): ColumnMeta[] {
  if (!template || template.id === "generic") {
    return columns.map(function(c) {
      return { name: c, type: inferType(c), selected: true };
    });
  }
  return columns.map(function(c) {
    const stdName = template.fieldMap[c] || undefined;
    const colType = (stdName && template.columnTypes[stdName]) || inferType(c);
    return { name: c, standardName: stdName, type: colType, selected: true };
  });
}

// Default type inference based on column name
function inferType(name: string): "number" | "date" | "category" | "text" {
  const n = name.toLowerCase();
  if (/价格|金额|price|amount|total|数量|quantity|qty|运费/.test(n)) return "number";
  if (/时间|日期|date|time|下单|创建/.test(n)) return "date";
  if (/状态|status|分类|category|类型|方式/.test(n)) return "category";
  return "text";
}

// Apply clean rules to a row value
export function applyClean(value: string, template: PlatformTemplate | null, standardField?: string): string {
  if (!template || !standardField) return value;
  const rule = template.cleanRules[standardField];
  if (rule === "removeSymbol") return String(value).replace(/[¥￥,，]/g, "").trim();
  return String(value);
}
