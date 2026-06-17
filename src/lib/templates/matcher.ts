/**
 * 模板匹配引擎 — 模板优先 > AI 兜底
 *
 * 输入：文件列名数组
 * 输出：最佳匹配模板 + 置信度 + 列映射，或 null（无匹配）
 *
 * 匹配策略：
 * 1. requiredColumns 必须全部匹配（支持模糊匹配，至少 60% 匹配率）
 * 2. optionalColumns 匹配越多分数越高
 * 3. columnCountRange 范围内满分，超出扣分
 * 4. 最高分模板且 >= 阈值 → 返回匹配
 */

import type { PlatformTemplate, TemplateMatchResult, FieldMapping } from "./types";
import { ALL_PLATFORM_TEMPLATES } from "./platforms";

/** 匹配置信度阈值（>= 此值才返回匹配结果） */
var MATCH_THRESHOLD = 0.6;

/**
 * 匹配平台模板
 *
 * @param columns - 上传文件的列名数组
 * @param threshold - 可选的置信度阈值，默认 0.6
 * @returns 最佳匹配结果，或 null
 */
export function matchPlatformTemplate(
  columns: string[],
  threshold?: number
): TemplateMatchResult | null {
  var effectiveThreshold = threshold !== undefined ? threshold : MATCH_THRESHOLD;
  if (!columns || columns.length === 0) return null;

  var bestResult: TemplateMatchResult | null = null;
  var bestScore = 0;

  for (var i = 0; i < ALL_PLATFORM_TEMPLATES.length; i++) {
    var template = ALL_PLATFORM_TEMPLATES[i];
    var result = scoreTemplate(template, columns);

    if (result && result.confidence > bestScore) {
      bestScore = result.confidence;
      bestResult = result;
    }
  }

  if (bestResult && bestResult.confidence >= effectiveThreshold) {
    return bestResult;
  }

  return null;
}

/**
 * 获取所有可能的模板匹配（用于调试和用户选择）
 */
export function matchAllTemplates(columns: string[]): TemplateMatchResult[] {
  var results: TemplateMatchResult[] = [];
  for (var i = 0; i < ALL_PLATFORM_TEMPLATES.length; i++) {
    var result = scoreTemplate(ALL_PLATFORM_TEMPLATES[i], columns);
    if (result) results.push(result);
  }
  results.sort(function (a, b) { return b.confidence - a.confidence; });
  return results;
}

/**
 * 对单个模板打分
 */
function scoreTemplate(
  template: PlatformTemplate,
  columns: string[]
): TemplateMatchResult | null {
  var rules = template.matchRules;

  // ── Column count check ──
  var colCountScore = 1.0;
  if (columns.length < rules.columnCountRange[0]) {
    colCountScore = columns.length / rules.columnCountRange[0];
  } else if (columns.length > rules.columnCountRange[1]) {
    colCountScore = rules.columnCountRange[1] / columns.length;
  }
  if (colCountScore < 0.3) return null; // 列数差太多，不匹配

  // ── Required columns match ──
  var requiredMatched = 0;
  var requiredMatchRate = rules.requiredMatchRate || 0.6;
  var columnMapping: Record<string, string> = {};

  for (var ri = 0; ri < rules.requiredColumns.length; ri++) {
    var keyword = rules.requiredColumns[ri];
    var colName = findColumnByName(columns, keyword, template.fieldMap);
    if (colName) {
      requiredMatched++;
      columnMapping[colName] = findStandardName(colName, template.fieldMap);
    }
  }

  var requiredRate = rules.requiredColumns.length > 0
    ? requiredMatched / rules.requiredColumns.length
    : 1.0;

  if (requiredRate < requiredMatchRate) return null;

  // ── Optional columns match ──
  var optionalMatched = 0;
  for (var oi = 0; oi < rules.optionalColumns.length; oi++) {
    var optKeyword = rules.optionalColumns[oi];
    var optColName = findColumnByName(columns, optKeyword, template.fieldMap);
    if (optColName) {
      optionalMatched++;
      if (!columnMapping[optColName]) {
        columnMapping[optColName] = findStandardName(optColName, template.fieldMap);
      }
    }
  }

  // ── Compute confidence ──
  var requiredWeight = 0.5;
  var optionalWeight = 0.3;
  var colCountWeight = 0.2;

  var optionalRate = rules.optionalColumns.length > 0
    ? optionalMatched / rules.optionalColumns.length
    : 0.5; // 没有可选列时给中等分

  var confidence = requiredWeight * requiredRate
    + optionalWeight * optionalRate
    + colCountWeight * colCountScore;

  confidence = Math.round(confidence * 100) / 100;

  return {
    template: template,
    confidence: confidence,
    columnMapping: columnMapping,
    details: {
      requiredMatched: requiredMatched,
      requiredTotal: rules.requiredColumns.length,
      optionalMatched: optionalMatched,
      optionalTotal: rules.optionalColumns.length,
    },
  };
}

// ============================================================================
// Internal: Column name matching
// ============================================================================

/**
 * 根据关键词查找匹配的列名
 *
 * 依次尝试：
 * 1. 精确匹配（列名包含关键词）
 * 2. 别名匹配（列名匹配 fieldMap 中任一条目的 aliases）
 */
function findColumnByName(
  columns: string[],
  keyword: string,
  fieldMap: Record<string, FieldMapping>
): string | null {
  var kwLower = keyword.toLowerCase();

  // 精确匹配：列名包含关键词
  for (var i = 0; i < columns.length; i++) {
    if (columns[i].toLowerCase().indexOf(kwLower) !== -1) {
      return columns[i];
    }
  }

  // 别名匹配：fieldMap 中的别名
  var fieldKeys = Object.keys(fieldMap);
  for (var fi = 0; fi < fieldKeys.length; fi++) {
    var field = fieldMap[fieldKeys[fi]];

    // 检查主键名
    if (fieldKeys[fi].toLowerCase().indexOf(kwLower) !== -1) {
      for (var ci = 0; ci < columns.length; ci++) {
        if (columns[ci].toLowerCase().indexOf(fieldKeys[fi].toLowerCase()) !== -1) {
          return columns[ci];
        }
      }
    }

    // 检查别名
    for (var ai = 0; ai < field.aliases.length; ai++) {
      if (field.aliases[ai].toLowerCase().indexOf(kwLower) !== -1) {
        for (var cj = 0; cj < columns.length; cj++) {
          if (columns[cj].toLowerCase().indexOf(field.aliases[ai].toLowerCase()) !== -1) {
            return columns[cj];
          }
        }
      }
    }
  }

  return null;
}

/**
 * 根据原始列名查找标准字段名
 */
function findStandardName(
  columnName: string,
  fieldMap: Record<string, FieldMapping>
): string {
  var colLower = columnName.toLowerCase();

  var fieldKeys = Object.keys(fieldMap);
  for (var i = 0; i < fieldKeys.length; i++) {
    var key = fieldKeys[i];
    var field = fieldMap[key];

    // 主键匹配
    if (colLower.indexOf(key.toLowerCase()) !== -1 || key.toLowerCase().indexOf(colLower) !== -1) {
      return field.standard;
    }

    // 别名匹配
    for (var ai = 0; ai < field.aliases.length; ai++) {
      if (colLower.indexOf(field.aliases[ai].toLowerCase()) !== -1 ||
        field.aliases[ai].toLowerCase().indexOf(colLower) !== -1) {
        return field.standard;
      }
    }
  }

  // 兜底：返回原始列名
  return columnName;
}
