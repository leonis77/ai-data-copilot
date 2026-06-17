/**
 * 业务模型自动构建 — 从多张表中自动发现实体关系
 *
 * @module business-model
 */

import type { ColumnRole } from "@/lib/semantic/types";
import type { TableClass, ClassificationResult } from "@/lib/classifier";
import type { TableBusinessProfile } from "@/lib/business-concepts";
import { mapBusinessConcepts } from "@/lib/business-concepts";
import { extractEntities, buildCrossSheetEntityMap } from "@/lib/entities";
import type { CrossEntityMap } from "@/lib/entities";

export type BusinessEntityType = "product" | "supplier" | "customer" | "warehouse" | "order" | "transaction" | "unknown";
export type RelationshipType = "supplies" | "purchases" | "stores" | "delivers_to" | "belongs_to" | "finances";

export interface BusinessEntity {
  id: string;
  type: BusinessEntityType;
  label: string;
  sourceDataset: string;
  columnName: string;
  uniqueCount: number;
  topValues: string[];
}

export interface BusinessRelationship {
  id: string;
  type: RelationshipType;
  from: string;
  to: string;
  label: string;
  metrics: { matchedCount: number; matchRate: number; moneyDelta?: number };
}

export interface BusinessModel {
  entities: BusinessEntity[];
  relationships: BusinessRelationship[];
  summary: string;
  graphDescription: string;
}

export interface DatasetInfo {
  id: string;
  originalName: string;
  columns: string[];
  rows: Record<string, unknown>[];
  semanticRoles: ColumnRole[];
  classification: ClassificationResult;
  businessProfile: TableBusinessProfile;
}

var RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  supplies: "供货", purchases: "采购/销售", stores: "库存管理",
  delivers_to: "配送", belongs_to: "关联", finances: "财务结算",
};

// ============================================================================
// Core API
// ============================================================================

export function buildBusinessModel(datasets: DatasetInfo[]): BusinessModel {
  if (!datasets || datasets.length === 0) {
    return { entities: [], relationships: [], summary: "无可用数据", graphDescription: "请先上传数据文件" };
  }

  // Step 1: Build entities
  var entities: BusinessEntity[] = [];

  for (var i = 0; i < datasets.length; i++) {
    var ds = datasets[i];
    var profile = ds.businessProfile;
    var entityType = inferEntityType(profile, ds.classification.class);
    var entityCol = profile.getColumn("product_name") || profile.getColumn("supplier_name") || profile.getColumn("customer_name");

    var entityValues: string[] = [];
    if (entityCol) {
      var extracted = extractEntities(ds.rows, entityCol);
      entityValues = extracted.slice(0, 20).map(function (e) { return e.name; });
    }

    entities.push({
      id: "entity_" + ds.id, type: entityType,
      label: ds.originalName || ds.classification.class,
      sourceDataset: ds.id, columnName: entityCol || "未知",
      uniqueCount: entityValues.length, topValues: entityValues.slice(0, 5),
    });
  }

  // Step 2: Build relationships
  var relationships: BusinessRelationship[] = [];

  for (var ai = 0; ai < datasets.length; ai++) {
    for (var bj = ai + 1; bj < datasets.length; bj++) {
      var dsA = datasets[ai], dsB = datasets[bj];
      var relType = inferRelationship(dsA.classification.class, dsB.classification.class);
      if (!relType) continue;

      var entityColA = dsA.businessProfile.getColumn("product_name") || dsA.businessProfile.getColumn("supplier_name") || dsA.businessProfile.getColumn("customer_name");
      var entityColB = dsB.businessProfile.getColumn("product_name") || dsB.businessProfile.getColumn("supplier_name") || dsB.businessProfile.getColumn("customer_name");

      var matchedCount = 0;
      if (entityColA && entityColB) {
        var entitiesA = extractEntities(dsA.rows, entityColA);
        var entitiesB = extractEntities(dsB.rows, entityColB);
        var crossMap = buildCrossSheetEntityMap([
          { id: dsA.id, name: dsA.originalName, entities: entitiesA },
          { id: dsB.id, name: dsB.originalName, entities: entitiesB },
        ]);
        matchedCount = crossMap.matched.length;
      }

      var maxEntities = entities[ai].uniqueCount + entities[bj].uniqueCount;
      var matchRate = maxEntities > 0 ? matchedCount / Math.max(1, Math.min(entities[ai].uniqueCount, entities[bj].uniqueCount)) : 0;

      relationships.push({
        id: "rel_" + dsA.id + "_" + dsB.id, type: relType,
        from: "entity_" + dsA.id, to: "entity_" + dsB.id,
        label: RELATIONSHIP_LABELS[relType],
        metrics: { matchedCount: matchedCount, matchRate: Math.min(matchRate, 1.0) },
      });
    }
  }

  var model: BusinessModel = { entities: entities, relationships: relationships, summary: "", graphDescription: "" };
  model.summary = generateSummary(model);
  model.graphDescription = generateGraphDescription(model);
  return model;
}

export function buildModelFromDatasets(datasets: {
  id: string; originalName: string; columns: string[]; rows: Record<string, unknown>[];
  semanticRoles: ColumnRole[]; classification: ClassificationResult;
}[]): BusinessModel {
  var infos: DatasetInfo[] = datasets.map(function (ds) {
    var profile = mapBusinessConcepts(ds.semanticRoles, ds.classification.class, ds.columns);
    return {
      id: ds.id, originalName: ds.originalName, columns: ds.columns, rows: ds.rows,
      semanticRoles: ds.semanticRoles, classification: ds.classification, businessProfile: profile,
    };
  });
  return buildBusinessModel(infos);
}

// ============================================================================
// Internal helpers
// ============================================================================

function inferEntityType(profile: TableBusinessProfile, tableClass: TableClass): BusinessEntityType {
  if (profile.getColumn("supplier_name")) return "supplier";
  if (profile.getColumn("customer_name")) return "customer";
  if (profile.getColumn("warehouse_name")) return "warehouse";
  if (profile.getColumn("product_name")) return "product";
  switch (tableClass) {
    case "supply": return "supplier";
    case "order": return "order";
    case "inventory": return "warehouse";
    case "financial": return "transaction";
    default: return "unknown";
  }
}

function inferRelationship(classA: TableClass, classB: TableClass): RelationshipType | null {
  if ((classA === "supply" && classB === "order") || (classA === "order" && classB === "supply")) return "supplies";
  if ((classA === "supply" && classB === "inventory") || (classA === "inventory" && classB === "supply")) return "stores";
  if ((classA === "order" && classB === "inventory") || (classA === "inventory" && classB === "order")) return "purchases";
  if (classA === "order" && classB === "order") return "belongs_to";
  if (classA === "financial" || classB === "financial") return "finances";
  if (classA === classB) return "belongs_to";
  return null;
}

function generateSummary(model: BusinessModel): string {
  var entityTypes: Record<string, number> = {};
  for (var i = 0; i < model.entities.length; i++) {
    var t = model.entities[i].type;
    entityTypes[t] = (entityTypes[t] || 0) + 1;
  }
  var parts: string[] = [];
  if (entityTypes["product"]) parts.push(entityTypes["product"] + " 个商品实体");
  if (entityTypes["supplier"]) parts.push(entityTypes["supplier"] + " 个供应商实体");
  if (entityTypes["customer"]) parts.push(entityTypes["customer"] + " 个客户实体");
  if (entityTypes["order"]) parts.push(entityTypes["order"] + " 个订单数据集");
  if (entityTypes["warehouse"]) parts.push(entityTypes["warehouse"] + " 个仓库实体");
  if (entityTypes["transaction"]) parts.push(entityTypes["transaction"] + " 个交易流水");

  var summary = parts.length > 0 ? "业务模型包含: " + parts.join("、") : "业务模型包含 " + model.entities.length + " 个实体";
  if (model.relationships.length > 0) summary += "，已识别 " + model.relationships.length + " 组关键关系";
  return summary;
}

function generateGraphDescription(model: BusinessModel): string {
  if (model.relationships.length === 0) return "未检测到跨表关系。请上传更多相关数据表以构建业务模型。";
  var lines: string[] = [];
  for (var i = 0; i < model.relationships.length; i++) {
    var rel = model.relationships[i];
    var fromEntity = model.entities.find(function (e) { return e.id === rel.from; });
    var toEntity = model.entities.find(function (e) { return e.id === rel.to; });
    if (!fromEntity || !toEntity) continue;
    lines.push("[" + fromEntity.label + "] --" + rel.label + "--> [" + toEntity.label + "] (匹配" + rel.metrics.matchedCount + "个实体)");
  }
  return lines.join("\n");
}
