/**
 * 表格分类器 — 基于语义角色指纹，品类无关
 *
 * 设计原则：
 * - 不使用列名正则（那是 detectRoles 的事）
 * - 仅凭角色组合（Role Fingerprint）推断表格类型
 * - 每种分类给出置信度，允许 "unknown" + 候选建议
 *
 * @module classifier
 */

import type { ColumnRole, SemanticRole } from "@/lib/semantic/types";

export type TableClass = "order" | "supply" | "inventory" | "financial" | "marketing" | "aftersales" | "product" | "unknown";

export interface ClassificationResult {
  class: TableClass;
  confidence: number;
  alternatives?: { class: TableClass; confidence: number }[];
  signals: ClassificationSignal[];
  fingerprint: string;
}

export interface ClassificationSignal {
  source: "role_presence" | "role_absence" | "role_combination";
  description: string;
  weight: number;
}

export var TABLE_LABELS: Record<TableClass, string> = {
  order: "订单表",
  supply: "供货表",
  inventory: "库存表",
  financial: "财务流水",
  marketing: "推广报表",
  aftersales: "售后表",
  product: "商品目录",
  unknown: "通用数据表",
};

// ============================================================================
// Fingerprint definitions
// ============================================================================

interface RoleFingerprint {
  class: TableClass;
  required: SemanticRole[];
  optional: SemanticRole[];
  label: string;
}

var FINGERPRINTS: RoleFingerprint[] = [
  { class: "order", required: ["money", "entity_name"], optional: ["datetime", "location", "identifier"], label: "订单表" },
  { class: "supply", required: ["money", "entity_name", "quantity"], optional: ["identifier", "category"], label: "供货表" },
  { class: "marketing", required: ["money", "entity_name"], optional: ["quantity", "datetime", "identifier"], label: "推广报表" },
  { class: "aftersales", required: ["money", "entity_name"], optional: ["datetime", "category", "identifier"], label: "售后表" },
  { class: "inventory", required: ["entity_name", "quantity"], optional: ["location", "category", "identifier"], label: "库存表" },
  { class: "product", required: ["entity_name"], optional: ["category", "money", "identifier"], label: "商品目录" },
  { class: "financial", required: ["money", "datetime"], optional: ["category", "entity_name", "identifier"], label: "财务流水" },
];

// ============================================================================
// Core API
// ============================================================================

export function classifyByRoles(semanticRoles: ColumnRole[]): ClassificationResult {
  if (!semanticRoles || semanticRoles.length === 0) {
    return {
      class: "unknown", confidence: 1.0,
      signals: [{ source: "role_absence", description: "无可用角色信息", weight: 1.0 }],
      fingerprint: "empty",
    };
  }

  var presentRoles = getPresentRoles(semanticRoles);

  var scored: { class: TableClass; score: number; signals: ClassificationSignal[] }[] = [];
  for (var i = 0; i < FINGERPRINTS.length; i++) {
    var fp = FINGERPRINTS[i];
    var fpResult = scoreFingerprint(fp, presentRoles, semanticRoles);
    if (fpResult.score > 0) {
      scored.push({ class: fp.class, score: fpResult.score, signals: fpResult.signals });
    }
  }

  scored.sort(function (a, b) { return b.score - a.score; });

  if (scored.length === 0) {
    return {
      class: "unknown", confidence: 1.0,
      signals: [{ source: "role_combination", description: "角色组合不匹配任何已知表格类型。现有角色: " + presentRoles.join(", "), weight: 1.0 }],
      fingerprint: presentRoles.join("+"),
    };
  }

  var best = scored[0];
  var confidence = Math.min(best.score, 1.0);

  var result: ClassificationResult = {
    class: best.class,
    confidence: Math.round(confidence * 100) / 100,
    signals: best.signals,
    fingerprint: presentRoles.join("+"),
  };

  if (confidence < 0.7 && scored.length > 1) {
    result.alternatives = scored.slice(1, 3).map(function (s) {
      return { class: s.class, confidence: Math.round(s.score * 100) / 100 };
    });
  }

  return result;
}

export function classifyByColumns(columns: string[], semanticRoles: ColumnRole[]): ClassificationResult {
  var roleResult = classifyByRoles(semanticRoles);
  if (roleResult.confidence >= 0.6) return roleResult;

  var joined = columns.join(",").toLowerCase();
  var hasOrderSignal = /订单|买家|收货|支付|退款|实付|order|buyer|customer/.test(joined);
  var hasSupplySignal = /供货|供应商|采购|批发|产地|supply|vendor|procurement/.test(joined);
  var hasInventorySignal = /库存|仓库|库位|入库|出库|inventory|warehouse|stock/.test(joined);

  if (hasOrderSignal && roleResult.class === "unknown") {
    roleResult.signals.push({ source: "role_presence", description: "列名包含订单/买家等关键词，辅助判断为订单表", weight: 0.15 });
    roleResult.confidence = Math.min(roleResult.confidence + 0.15, 0.65);
  }
  if (hasSupplySignal && roleResult.class === "unknown") {
    roleResult.signals.push({ source: "role_presence", description: "列名包含供货/供应商等关键词，辅助判断为供货表", weight: 0.15 });
    roleResult.confidence = Math.min(roleResult.confidence + 0.15, 0.65);
  }
  if (hasInventorySignal && roleResult.class === "unknown") {
    roleResult.signals.push({ source: "role_presence", description: "列名包含库存/仓库等关键词，辅助判断为库存表", weight: 0.15 });
    roleResult.confidence = Math.min(roleResult.confidence + 0.15, 0.65);
  }

  return roleResult;
}

// ============================================================================
// Internal helpers
// ============================================================================

function getPresentRoles(roles: ColumnRole[], threshold?: number): SemanticRole[] {
  var t = threshold !== undefined ? threshold : 0.6;
  var roleSet = new Set<SemanticRole>();
  for (var i = 0; i < roles.length; i++) {
    if (roles[i].confidence >= t) roleSet.add(roles[i].role);
  }
  return Array.from(roleSet);
}

function getRoleColumns(roles: ColumnRole[], target: SemanticRole): ColumnRole[] {
  return roles.filter(function (r) { return r.role === target; });
}

function scoreFingerprint(
  fp: RoleFingerprint, presentRoles: SemanticRole[], allRoles: ColumnRole[]
): { score: number; signals: ClassificationSignal[] } {
  var signals: ClassificationSignal[] = [];
  var score = 0;

  var requiredSatisfied = 0;
  for (var i = 0; i < fp.required.length; i++) {
    if (presentRoles.indexOf(fp.required[i]) !== -1) {
      var cols = getRoleColumns(allRoles, fp.required[i]);
      var maxConf = 0;
      for (var c = 0; c < cols.length; c++) { if (cols[c].confidence > maxConf) maxConf = cols[c].confidence; }
      requiredSatisfied++;
      score += 0.3 * maxConf;
    } else {
      signals.push({ source: "role_absence", description: "缺少关键角色: " + fp.required[i], weight: -0.3 });
      score -= 0.3;
    }
  }

  var optionalSatisfied = 0;
  for (var j = 0; j < fp.optional.length; j++) {
    if (presentRoles.indexOf(fp.optional[j]) !== -1) { optionalSatisfied++; score += 0.1; }
  }

  if (requiredSatisfied === fp.required.length) {
    signals.push({
      source: "role_combination",
      description: "满足 " + fp.label + " 角色组合: " + fp.required.join("+") + (optionalSatisfied > 0 ? " (+" + optionalSatisfied + " 可选角色)" : ""),
      weight: 0.6,
    });
  }

  var normalized = Math.max(0, Math.min(1, score));
  return { score: normalized, signals: signals };
}
