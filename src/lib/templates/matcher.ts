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
      // 用实际列名作 key，确保映射到正确的 standard field
      var stdName = findStandardName(colName, template.fieldMap);
      columnMapping[colName] = stdName;
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

  // required 分量归一化到 [0,1]：用最大 requiredColumns 总数做分母
  // 保证 confidence 始终 <= 1.0，同时保留 cardinality 信号（3/4 > 2/2）
  var MAX_REQUIRED_COLS = 4;
  var requiredComponent = requiredRate * rules.requiredColumns.length / MAX_REQUIRED_COLS;
  var confidence = requiredWeight * requiredComponent
    + optionalWeight * optionalRate
    + colCountWeight * colCountScore;

  confidence = Math.round(confidence * 100) / 100;
  confidence = Math.max(0, Math.min(confidence, 1.0)); // clamp to [0, 1]

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

/** 中文分词器（浏览器/Node 均支持） */
var segmenter = typeof Intl !== "undefined" && Intl.Segmenter
  ? new Intl.Segmenter("zh-CN", { granularity: "word" })
  : null;

/**
 * 将字符串拆成「词段」数组。
 * 优先用 Intl.Segmenter 做中文分词；降级用正则按中文/非中文分块。
 *
 * 例: "京东订单号" → ["京东", "订单号"]
 *     "订单ID"    → ["订单", "ID"]
 *     "SKU编码"   → ["SKU", "编码"]
 */
function toWordSegments(text: string): string[] {
  if (segmenter) {
    var segs: string[] = [];
    var iterator = segmenter.segment(text);
    for (var s of iterator) {
      if ((s as any).isWordLike) segs.push((s as any).segment);
    }
    return segs;
  }
  // 降级：逐个中文字符 + 连续非中文分块
  // 注意：无 Segmenter 时精度下降，但保证不会出现「子串跨词边界误匹配」
  return text.match(/[一-鿿]|[a-z0-9_]+/gi) || [];
}

/**
 * 检查 keyword 是否以「词边界」形式出现在 text 中。
 *
 * 规则（三层策略）：
 * - text === keyword → 命中
 * - Strategy 1: keyword 的词段序列作为 text 词段序列的连续子序列出现 → 命中
 * - Strategy 2: CJK-only 时用字符级子序列（处理 Segmenter 分词粒度差异）
 * - Strategy 3: mixed CJK/non-CJK 时用 substring（处理非中文字符插入场景）
 *
 * 例: keyword="金额" 命中 text="实付金额"（seg ["实","付","金额"] 的末尾 ["金额"]）
 * 例: keyword="订单" 命中 text="订单号"（seg ["订单","号"] 的开头 ["订单"]）
 * 例: keyword="订单ID" 不命中 text="订单号"（seg ["订单","号"] vs ["订单","ID"] 末尾不同）
 * 例: keyword="收货" 命中 text="收货地址"（seg ["收货","地址"] 的开头 ["收货"]）
 */
function matchesAtWordBoundary(text: string, keyword: string): boolean {
  if (text === keyword) return true;
  var textSegs = toWordSegments(text);
  var kwSegs = toWordSegments(keyword);

  // Strategy 1: subsequence match at segment level
  var ti = 0;
  for (var k = 0; k < kwSegs.length; k++) {
    while (ti < textSegs.length && textSegs[ti] !== kwSegs[k]) ti++;
    if (ti >= textSegs.length) break;
    ti++;
  }
  if (k >= kwSegs.length) return true;

  // Strategy 2: character-level subsequence for CJK-only keyword/text
  // Handles cases where Segmenter groups chars differently, e.g.:
  //   '订单号' vs '订单编号'  -> '号' not in seg '编号'
  //   '收货地址' vs '收货人地址' -> '收货' not in seg '收货人'
  var isCjkKeyword = /^[一-鿿]+$/.test(keyword);
  var isCjkText = /^[一-鿿]+$/.test(text);
  if (isCjkKeyword && isCjkText) {
    var ci2 = 0;
    for (var c = 0; c < keyword.length; c++) {
      while (ci2 < text.length && text[ci2] !== keyword[c]) ci2++;
      if (ci2 >= text.length) return false;
      ci2++;
    }
    return true;
  }

  // Strategy 3: substring fallback for mixed CJK/non-CJK text
  // Handles cases like text="实付金额(元)" keyword="金额":
  //   Segmenter may split "实付金额(元)" → ['实','付','金额(元)']
  //   kwSegs=['金额'] not found as subsequence in ['实','付','金额(元)']
  //   But text.indexOf('金额') >= 0 → TRUE
  // Guard: only fires when Strategies 1+2 failed (prevents false positives)
  if (text.indexOf(keyword) >= 0) return true;
  if (keyword.indexOf(text) >= 0) return true;

  return false;
}

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

  // ── Step 1: direct token match against column names ──
  for (var i = 0; i < columns.length; i++) {
    if (matchesAtWordBoundary(columns[i].toLowerCase(), kwLower)) {
      return columns[i];
    }
  }

  // ── Step 2: fieldMap key match ──
  var fieldKeys = Object.keys(fieldMap);
  for (var fi = 0; fi < fieldKeys.length; fi++) {
    var key = fieldKeys[fi];
    var keyLower = key.toLowerCase();
    // keyword must match the fieldMap key at word boundary
    if (matchesAtWordBoundary(keyLower, kwLower)) {
      // find a column that also contains the full fieldMap key at word boundary
      for (var ci = 0; ci < columns.length; ci++) {
        if (matchesAtWordBoundary(columns[ci].toLowerCase(), keyLower)) {
          return columns[ci];
        }
      }
    }

    // ── Step 3: alias match ──
    var aliases = fieldMap[key].aliases;
    for (var ai = 0; ai < aliases.length; ai++) {
      var aliasLower = aliases[ai].toLowerCase();
      if (matchesAtWordBoundary(aliasLower, kwLower)) {
        for (var cj = 0; cj < columns.length; cj++) {
          if (matchesAtWordBoundary(columns[cj].toLowerCase(), aliasLower)) {
            return columns[cj];
          }
        }
      }
    }
  }

  return null;
}

/**
 * 根据原始列名查找标准字段名（词边界感知，精确优先）
 *
 * 优先级：
 * 1. colLower 完整命中某个 fieldMap key（边界感知）→ 最高优先级
 * 2. colLower 完整命中某个 alias（边界感知）→ 次优先级（处理 alias-only 场景）
 *
 * 不使用「keyword 是 fieldMap key 子段」的反向匹配，防止短词误匹配。
 */
function findStandardName(
  columnName: string,
  fieldMap: Record<string, FieldMapping>
): string {
  var colLower = columnName.toLowerCase();
  var fieldKeys = Object.keys(fieldMap);

  // Step 1: col name is (or contains at word boundary) a fieldMap key
  for (var i = 0; i < fieldKeys.length; i++) {
    if (matchesAtWordBoundary(colLower, fieldKeys[i].toLowerCase())) {
      return fieldMap[fieldKeys[i]].standard;
    }
  }

  // Step 2: col name matches a fieldMap alias at word boundary
  for (var i = 0; i < fieldKeys.length; i++) {
    var aliases = fieldMap[fieldKeys[i]].aliases;
    for (var ai = 0; ai < aliases.length; ai++) {
      if (matchesAtWordBoundary(colLower, aliases[ai].toLowerCase())) {
        return fieldMap[fieldKeys[i]].standard;
      }
    }
  }

  return columnName;
}
