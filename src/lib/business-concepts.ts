/**
 * 业务概念映射 — 将抽象语义角色翻译为用户可理解的业务含义
 *
 * 核心价值：角色告诉你"这列是金额"，业务概念告诉你"这是采购成本还是销售价格"
 *
 * @module business-concepts
 */

import type { ColumnRole, SemanticRole } from "@/lib/semantic/types";
import type { TableClass } from "@/lib/classifier";

export type BusinessConceptId =
  | "selling_price" | "procurement_cost" | "shipping_fee" | "refund_amount"
  | "tax_amount" | "discount_amount" | "other_fee"
  | "sales_volume" | "stock_quantity" | "order_quantity" | "return_quantity"
  | "product_name" | "supplier_name" | "customer_name" | "warehouse_name"
  | "order_time" | "delivery_time" | "payment_time" | "update_time"
  | "delivery_address" | "warehouse_location" | "supplier_region"
  | "order_id" | "sku_code" | "category_name" | "status_label" | "phone_number"
  | "unknown";

export interface BusinessConcept {
  column: string;
  role: SemanticRole;
  roleConfidence: number;
  concept: BusinessConceptId;
  conceptConfidence: number;
  label: string;
}

export interface TableBusinessProfile {
  tableClass: TableClass;
  concepts: BusinessConcept[];
  getByConcept: (conceptId: BusinessConceptId) => BusinessConcept[];
  getColumn: (conceptId: BusinessConceptId) => string | undefined;
}

// ============================================================================
// Concept labels
// ============================================================================

var CONCEPT_LABELS: Record<BusinessConceptId, string> = {
  selling_price: "销售价格", procurement_cost: "采购成本", shipping_fee: "物流运费",
  refund_amount: "退款金额", tax_amount: "税费", discount_amount: "折扣金额",
  other_fee: "其他费用", sales_volume: "销售量", stock_quantity: "库存量",
  order_quantity: "采购量", return_quantity: "退货量", product_name: "商品名称",
  supplier_name: "供应商", customer_name: "客户", warehouse_name: "仓库",
  order_time: "下单时间", delivery_time: "发货时间", payment_time: "付款时间",
  update_time: "更新时间", delivery_address: "收货地址", warehouse_location: "仓库位置",
  supplier_region: "产地", order_id: "订单编号", sku_code: "SKU编码",
  category_name: "分类", status_label: "状态", phone_number: "联系电话", unknown: "未知",
};

// ============================================================================
// Concept mapping rules
// ============================================================================

interface ConceptRule {
  role: SemanticRole;
  keywords: RegExp;
  tableClasses?: TableClass[];
  concept: BusinessConceptId;
}

var CONCEPT_RULES: ConceptRule[] = [
  // money roles
  { role: "money", keywords: /采购|成本|进价|批发价|供货价|进货|cost|procurement|wholesale|supply.price/i, tableClasses: ["supply"], concept: "procurement_cost" },
  { role: "money", keywords: /采购|成本|进价|批发价|供货价|进货|cost|procurement|wholesale|supply.price/i, concept: "procurement_cost" },
  { role: "money", keywords: /运费|物流|快递|配送|shipping|freight|delivery|express/i, concept: "shipping_fee" },
  { role: "money", keywords: /退款|退货|refund|return|退回/i, concept: "refund_amount" },
  { role: "money", keywords: /税|tax|vat|gst/i, concept: "tax_amount" },
  { role: "money", keywords: /折扣|优惠|discount|coupon|promo/i, concept: "discount_amount" },
  { role: "money", keywords: /售价|零售|实付|实收|单价|金额|总价|总金额|价格|price|amount|total|revenue|pay/i, tableClasses: ["order", "unknown"], concept: "selling_price" },
  { role: "money", keywords: /售价|零售|单价|价格|price|retail/i, concept: "selling_price" },
  { role: "money", keywords: /.*/, tableClasses: ["order"], concept: "selling_price" },
  { role: "money", keywords: /.*/, tableClasses: ["supply"], concept: "procurement_cost" },
  { role: "money", keywords: /.*/, tableClasses: ["financial"], concept: "other_fee" },
  // quantity roles
  { role: "quantity", keywords: /库存|存货|在库|stock|inventory|on.hand/i, concept: "stock_quantity" },
  { role: "quantity", keywords: /销量|售出|已售|sales|sold|卖出/i, concept: "sales_volume" },
  { role: "quantity", keywords: /订货|采购|进货|order.qty|purchase.qty|起订/i, concept: "order_quantity" },
  { role: "quantity", keywords: /退货|退货量|return.qty/i, concept: "return_quantity" },
  { role: "quantity", keywords: /.*/, tableClasses: ["supply", "inventory"], concept: "stock_quantity" },
  { role: "quantity", keywords: /.*/, tableClasses: ["order"], concept: "sales_volume" },
  // entity_name roles
  { role: "entity_name", keywords: /供应商|供货商|厂家|supplier|vendor|manufacturer/i, concept: "supplier_name" },
  { role: "entity_name", keywords: /客户|买家|会员|顾客|customer|buyer|member|用户/i, concept: "customer_name" },
  { role: "entity_name", keywords: /仓库|库房|warehouse|storage/i, concept: "warehouse_name" },
  { role: "entity_name", keywords: /.*/, tableClasses: ["supply"], concept: "supplier_name" },
  { role: "entity_name", keywords: /.*/, tableClasses: ["inventory"], concept: "product_name" },
  { role: "entity_name", keywords: /.*/, concept: "product_name" },
  // datetime roles
  { role: "datetime", keywords: /下单|订单|order|购买|created/i, concept: "order_time" },
  { role: "datetime", keywords: /发货|ship|delivery|send/i, concept: "delivery_time" },
  { role: "datetime", keywords: /付款|支付|pay|paid/i, concept: "payment_time" },
  { role: "datetime", keywords: /更新|修改|update|modified/i, concept: "update_time" },
  { role: "datetime", keywords: /.*/, tableClasses: ["order"], concept: "order_time" },
  { role: "datetime", keywords: /.*/, tableClasses: ["supply"], concept: "update_time" },
  { role: "datetime", keywords: /.*/, concept: "update_time" },
  // location roles
  { role: "location", keywords: /收货|地址|address|ship.to|delivery/i, concept: "delivery_address" },
  { role: "location", keywords: /仓库|库位|warehouse|storage/i, concept: "warehouse_location" },
  { role: "location", keywords: /产地|货源|origin|source/i, concept: "supplier_region" },
  { role: "location", keywords: /.*/, tableClasses: ["order"], concept: "delivery_address" },
  { role: "location", keywords: /.*/, concept: "supplier_region" },
  // identifier roles
  { role: "identifier", keywords: /订单|order|编号.*订单/i, concept: "order_id" },
  { role: "identifier", keywords: /sku|货号|编码|code/i, concept: "sku_code" },
  { role: "identifier", keywords: /电话|手机|phone|mobile|tel/i, concept: "phone_number" },
  // category role
  { role: "category", keywords: /.*/, concept: "category_name" },
];

// ============================================================================
// Core API
// ============================================================================

export function mapBusinessConcepts(
  semanticRoles: ColumnRole[], tableClass: TableClass, columns: string[]
): TableBusinessProfile {
  var concepts: BusinessConcept[] = [];

  for (var i = 0; i < semanticRoles.length; i++) {
    var roleInfo = semanticRoles[i];
    if (roleInfo.confidence < 0.4) {
      concepts.push({
        column: roleInfo.column, role: roleInfo.role, roleConfidence: roleInfo.confidence,
        concept: "unknown", conceptConfidence: 0, label: "未知",
      });
      continue;
    }

    var matched = matchConcept(roleInfo, tableClass);
    concepts.push({
      column: roleInfo.column, role: roleInfo.role, roleConfidence: roleInfo.confidence,
      concept: matched.concept, conceptConfidence: matched.confidence,
      label: CONCEPT_LABELS[matched.concept],
    });
  }

  return {
    tableClass: tableClass, concepts: concepts,
    getByConcept: function (conceptId: BusinessConceptId) {
      return concepts.filter(function (c) { return c.concept === conceptId; });
    },
    getColumn: function (conceptId: BusinessConceptId) {
      var found = concepts.find(function (c) { return c.concept === conceptId && c.conceptConfidence >= 0.4; });
      return found ? found.column : undefined;
    },
  };
}

export function getConceptLabel(conceptId: BusinessConceptId): string {
  return CONCEPT_LABELS[conceptId] || "未知";
}

function matchConcept(roleInfo: ColumnRole, tableClass: TableClass): { concept: BusinessConceptId; confidence: number } {
  var colName = roleInfo.column;
  for (var i = 0; i < CONCEPT_RULES.length; i++) {
    var rule = CONCEPT_RULES[i];
    if (rule.role !== roleInfo.role) continue;
    if (rule.tableClasses && rule.tableClasses.indexOf(tableClass) === -1) continue;
    if (rule.keywords.test(colName)) {
      return { concept: rule.concept, confidence: Math.min(roleInfo.confidence * 1.1, 1.0) };
    }
  }
  return { concept: "unknown", confidence: roleInfo.confidence * 0.5 };
}
