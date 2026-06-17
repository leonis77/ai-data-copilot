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
  /** 如果存在这些角色，说明大概率不是此类型，扣分 */
  penaltyRoles: SemanticRole[];
  label: string;
}

var FINGERPRINTS: RoleFingerprint[] = [
  // 订单：必须有 money + entity_name + datetime
  { class: "order", required: ["money", "entity_name", "datetime"], optional: ["location", "identifier"], penaltyRoles: [], label: "订单表" },
  // 供货：money + entity_name（不强制 quantity，真实供货表经常没有数量列），有 datetime 则扣分
  { class: "supply", required: ["money", "entity_name"], optional: ["quantity", "identifier", "category", "location"], penaltyRoles: ["datetime"], label: "供货表" },
  // 推广：money + entity_name，展现/点击等衍生量
  { class: "marketing", required: ["money", "entity_name"], optional: ["quantity", "identifier"], penaltyRoles: ["datetime", "location"], label: "推广报表" },
  // 售后：money + entity_name + datetime（退款时间）
  { class: "aftersales", required: ["money", "entity_name", "datetime"], optional: ["category", "identifier"], penaltyRoles: [], label: "售后表" },
  // 库存：entity_name + quantity，没有 money
  { class: "inventory", required: ["entity_name", "quantity"], optional: ["location", "category"], penaltyRoles: ["money"], label: "库存表" },
  // 商品目录：entity_name 为主
  { class: "product", required: ["entity_name"], optional: ["category", "identifier"], penaltyRoles: ["money", "datetime"], label: "商品目录" },
  // 财务：money + datetime，无 entity_name
  { class: "financial", required: ["money", "datetime"], optional: ["category", "identifier"], penaltyRoles: ["entity_name"], label: "财务流水" },
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
  var joined = columns.join(",").toLowerCase();

  var hasOrderSignal = /订单|买家|收货|支付|实付|应付|order|buyer|customer|收货人/.test(joined);
  var hasSupplySignal = /供货|供应商|采购|批发|产地|进货|supply|vendor|procurement|sku|规格|物流|快递/.test(joined);
  var hasMarketingSignal = /花费|展现|点击|投产|roi|消耗|impression|click|ctr|cpc|广告|推广|投放|campaign/.test(joined);
  var hasInventorySignal = /库存|仓库|库位|入库|出库|inventory|warehouse|stock/.test(joined);
  var hasAftersalesSignal = /退款|退货|售后|refund|纠纷/.test(joined);

  // 关键纠偏1：如果角色分类是 marketing 但没有推广关键词，且有供货关键词 → 改判供货
  if (roleResult.class === "marketing" && !hasMarketingSignal && hasSupplySignal) {
    roleResult.class = "supply";
    roleResult.confidence = Math.min(roleResult.confidence + 0.15, 0.85);
    roleResult.signals.push({ source: "role_combination", description: "列名包含供货/产地/物流等关键词，修正为供货表", weight: 0.1 });
    return roleResult;
  }

  // 关键纠偏2：如果角色分类是 supply 但有订单+日期关键词 → 改判订单
  if (roleResult.class === "supply" && hasOrderSignal) {
    roleResult.class = "order";
    roleResult.confidence = Math.min(roleResult.confidence + 0.15, 0.85);
    roleResult.signals.push({ source: "role_combination", description: "列名包含订单/买家等关键词，修正为订单表", weight: 0.1 });
    return roleResult;
  }

  // 关键纠偏3：unknown 时用列名推断
  if (roleResult.class === "unknown") {
    if (hasSupplySignal) {
      roleResult.class = "supply";
      roleResult.confidence = Math.min(roleResult.confidence + 0.25, 0.65);
      roleResult.signals.push({ source: "role_presence", description: "列名包含供货/供应商/产地等关键词，辅助判断为供货表", weight: 0.25 });
    } else if (hasOrderSignal) {
      roleResult.class = "order";
      roleResult.confidence = Math.min(roleResult.confidence + 0.25, 0.65);
      roleResult.signals.push({ source: "role_presence", description: "列名包含订单/买家等关键词，辅助判断为订单表", weight: 0.25 });
    } else if (hasMarketingSignal) {
      roleResult.class = "marketing";
      roleResult.confidence = Math.min(roleResult.confidence + 0.2, 0.6);
      roleResult.signals.push({ source: "role_presence", description: "列名包含推广/花费/展现等关键词，辅助判断为推广报表", weight: 0.2 });
    }
  }

  // 低置信度加固
  if (roleResult.confidence < 0.6 && hasSupplySignal) {
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

  // Penalty roles: if present, this is likely NOT this table type
  for (var p = 0; p < fp.penaltyRoles.length; p++) {
    if (presentRoles.indexOf(fp.penaltyRoles[p]) !== -1) {
      score -= 0.35;
      signals.push({ source: "role_presence", description: "存在排斥角色: " + fp.penaltyRoles[p] + "（大概率不是" + fp.label + "）", weight: -0.35 });
    }
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
