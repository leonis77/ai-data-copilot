/**
 * M1 Trusted Input — Data Quality Report
 *
 * 对上传数据集做结构化质量评分，输出 4 个维度：
 *   1. 字段完整度（fieldCompleteness）
 *   2. 数值有效性（numericValidity）
 *   3. 采样覆盖率（samplingCoverage）
 *   4. 平台置信度（platformConfidence）
 *
 * 评分范围 0-100，每项附带说明和改善建议。
 */

import { detectRoles } from "@/lib/semantic/roles";
import { detectPlatform } from "@/lib/platform/detect";
import type { ColumnRole } from "@/lib/semantic/types";

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export interface DataQualityReport {
  /** 整体质量分 0-100 */
  overallScore: number;
  /** 数据是否可接受用于分析（阈值: overallScore >= 40） */
  acceptable: boolean;
  /** 维度评分明细 */
  dimensions: {
    fieldCompleteness: DimensionScore;
    numericValidity: DimensionScore;
    samplingCoverage: DimensionScore;
    platformConfidence: DimensionScore;
  };
  /** 数据概要 */
  summary: {
    rowCount: number;
    columnCount: number;
    detectedRoles: string[];
    platform: string | null;
    sampleRowsUsed: number;
  };
}

export interface DimensionScore {
  /** 0-100 */
  score: number;
  /** 简短说明 */
  message: string;
  /** 可选的改善建议 */
  suggestion?: string;
}

// ═══════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════

/**
 * 计算数据集质量报告
 *
 * @param columns - 列名数组
 * @param rows - 行数据数组（可能被截断，由调用方控制采样）
 * @param totalRowCount - 原始总行数（用于采样覆盖率计算）
 */
export function computeDataQuality(
  columns: string[],
  rows: Record<string, unknown>[],
  totalRowCount?: number,
): DataQualityReport {
  const dimensions = {
    fieldCompleteness: scoreFieldCompleteness(columns, rows),
    numericValidity: scoreNumericValidity(columns, rows),
    samplingCoverage: scoreSamplingCoverage(rows, totalRowCount || rows.length),
    platformConfidence: scorePlatformConfidence(columns, rows),
  };

  const overallScore = Math.round(
    dimensions.fieldCompleteness.score * 0.35 +
    dimensions.numericValidity.score * 0.30 +
    dimensions.samplingCoverage.score * 0.15 +
    dimensions.platformConfidence.score * 0.20,
  );

  const detectedRoles = detectRoles(columns, rows.slice(0, 20));
  const platform = detectPlatform(columns);

  return {
    overallScore: Math.min(100, Math.max(0, overallScore)),
    acceptable: overallScore >= 40,
    dimensions,
    summary: {
      rowCount: totalRowCount || rows.length,
      columnCount: columns.length,
      detectedRoles: detectedRoles
        .filter(function (r) { return r.confidence >= 0.6; })
        .map(function (r) { return r.role + "(" + r.column + ")"; }),
      platform: platform || null,
      sampleRowsUsed: rows.length,
    },
  };
}

// ═══════════════════════════════════════════════
// Dimension 1: 字段完整度
// ═══════════════════════════════════════════════

function scoreFieldCompleteness(
  columns: string[],
  rows: Record<string, unknown>[],
): DimensionScore {
  if (columns.length === 0) {
    return { score: 0, message: "数据表为空", suggestion: "请上传包含列标题的 Excel/CSV 文件" };
  }

  // 期望的关键字段（电商场景）
  const criticalPatterns = [
    { pattern: /名称|商品|产品|name|title|product/i, label: "商品名称", weight: 3 },
    { pattern: /价格|售价|金额|price|amount|pay|total/i, label: "价格/金额", weight: 3 },
    { pattern: /数量|qty|count|volume/i, label: "数量", weight: 1 },
    { pattern: /平台|platform|channel/i, label: "平台", weight: 2 },
    { pattern: /时间|日期|date|time|order/i, label: "时间/订单", weight: 2 },
  ];

  const matched = criticalPatterns.filter(function (cp) {
    return columns.some(function (c) { return cp.pattern.test(c); });
  });

  const totalWeight = criticalPatterns.reduce(function (s, cp) { return s + cp.weight; }, 0);
  const matchedWeight = matched.reduce(function (s, cp) { return s + cp.weight; }, 0);
  const ratio = totalWeight > 0 ? matchedWeight / totalWeight : 0;
  const score = Math.round(ratio * 100);

  const missing = criticalPatterns.filter(function (cp) {
    return !columns.some(function (c) { return cp.pattern.test(c); });
  }).map(function (cp) { return cp.label; });

  if (score >= 80) {
    return { score, message: "关键字段识别完整" };
  } else if (score >= 50) {
    return {
      score,
      message: "部分关键字段缺失：" + missing.join("、"),
      suggestion: "补充缺失字段可获得更准确的利润估算",
    };
  } else {
    return {
      score,
      message: "关键字段严重缺失：" + missing.join("、"),
      suggestion: "请确认上传的是电商订单/商品数据表，而非其他类型数据",
    };
  }
}

// ═══════════════════════════════════════════════
// Dimension 2: 数值有效性
// ═══════════════════════════════════════════════

function scoreNumericValidity(
  columns: string[],
  rows: Record<string, unknown>[],
): DimensionScore {
  if (rows.length === 0) {
    return { score: 0, message: "无数据行", suggestion: "请上传包含数据的表格" };
  }

  // 识别疑似数值列
  const numericPattern = /价格|售价|金额|price|amount|pay|total|成本|cost|费用|fee|数量|qty|count/i;
  const numericCols = columns.filter(function (c) { return numericPattern.test(c); });

  if (numericCols.length === 0) {
    return { score: 30, message: "未识别到数值列", suggestion: "数据中缺少价格、金额或数量等数值字段" };
  }

  let validCount = 0;
  let totalChecks = 0;

  for (const col of numericCols) {
    for (const row of rows) {
      const val = row[col];
      if (val === undefined || val === null || val === "") continue;
      totalChecks++;
      if (typeof val === "number" && !isNaN(val) && isFinite(val)) {
        validCount++;
      } else if (typeof val === "string") {
        const parsed = Number(val.replace(/[,，\s]/g, ""));
        if (!isNaN(parsed) && isFinite(parsed)) validCount++;
      }
    }
  }

  const ratio = totalChecks > 0 ? validCount / totalChecks : 0;
  const score = Math.round(ratio * 100);

  if (score >= 90) {
    return { score, message: "数值数据有效" };
  } else if (score >= 60) {
    return {
      score,
      message: "部分数值格式异常（" + Math.round((1 - ratio) * 100) + "% 非标准数值）",
      suggestion: "检查是否有文本混合在金额/数量列中",
    };
  } else {
    return {
      score,
      message: "数值数据大量异常",
      suggestion: "请确认金额、数量列未被合并单元格或说明文字污染",
    };
  }
}

// ═══════════════════════════════════════════════
// Dimension 3: 采样覆盖率
// ═══════════════════════════════════════════════

function scoreSamplingCoverage(
  rows: Record<string, unknown>[],
  totalRowCount: number,
): DimensionScore {
  if (totalRowCount === 0) {
    return { score: 0, message: "无数据行" };
  }

  // Pipeline 最多采样 50 行做分析
  const SAMPLE_CAP = 50;
  const sampleSize = Math.min(rows.length, SAMPLE_CAP);
  const coverage = Math.min(sampleSize / totalRowCount, 1);
  const score = Math.round(coverage * 100);

  if (score >= 80) {
    return { score, message: "采样覆盖率: " + score + "% (" + sampleSize + "/" + totalRowCount + " 行)" };
  } else if (score >= 40) {
    return {
      score,
      message: "采样覆盖率: " + score + "% (" + sampleSize + "/" + totalRowCount + " 行)",
      suggestion: "数据量较大，当前仅采样 " + sampleSize + " 行分析，结果可能不完全代表整体",
    };
  } else {
    return {
      score,
      message: "采样覆盖率: " + score + "% (" + sampleSize + "/" + totalRowCount + " 行)",
      suggestion: "数据量非常大，建议先按时间/平台筛选后分段分析",
    };
  }
}

// ═══════════════════════════════════════════════
// Dimension 4: 平台置信度
// ═══════════════════════════════════════════════

function scorePlatformConfidence(
  columns: string[],
  rows: Record<string, unknown>[],
): DimensionScore {
  const platform = detectPlatform(columns);

  if (platform) {
    return { score: 100, message: "平台已确认: " + getPlatformLabel(platform) };
  }

  // 尝试从数据值推断
  const joined = (columns || []).join(" ");
  const aliases: Record<string, number> = {
    "tmall|天猫": 0.9,
    "taobao|淘宝|宝贝": 0.9,
    "京东|jd|自营": 0.9,
    "拼多多|pdd|百亿补贴": 0.9,
    "抖音|douyin|达人|千川": 0.9,
  };

  let bestMatch = "";
  let bestScore = 0;
  for (const [pattern, confidence] of Object.entries(aliases)) {
    if (new RegExp(pattern, "i").test(joined) && confidence > bestScore) {
      bestScore = confidence;
      bestMatch = pattern.split("|")[0];
    }
  }

  if (bestScore > 0) {
    return {
      score: 70,
      message: "平台推测为: " + bestMatch + "（置信度中等）",
      suggestion: "利润估算将使用 " + bestMatch + " 默认费率，如数据来自其他平台请手动指定",
    };
  }

  return {
    score: 30,
    message: "未能识别电商平台",
    suggestion: "无法进行平台利润率估算，仅提供通用指标分析",
  };
}

function getPlatformLabel(key: string): string {
  const map: Record<string, string> = {
    tmall: "天猫", taobao: "淘宝", jd: "京东", pdd: "拼多多", douyin: "抖音",
  };
  return map[key] || key;
}
