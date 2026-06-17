import type { SemanticProfile, DatasetRelation, ColumnRole } from "./types";
import { logger } from "@/lib/logger";
import { extractEntities, buildCrossSheetEntityMap } from "@/lib/entities";
import type { CrossEntityMap } from "@/lib/entities";

// ============================================================================
// Types
// ============================================================================

interface DatasetMeta {
  id: string;
  originalName: string;
  semanticRoles?: SemanticProfile;
}

export interface CrossTableInput {
  id: string;
  originalName: string;
  columns: string[];
  rows: Record<string, unknown>[];
  semanticRoles: ColumnRole[];
}

export interface CrossTableMetrics {
  entityOverlap: { matched: number; totalA: number; totalB: number; rate: number };
  priceComparison: { entity: string; priceA: number; priceB: number; diff: number; diffPercent: number }[];
  quantityComparison: { entity: string; qtyA: number; qtyB: number; gap: number }[];
  unmatchedA: string[];
  unmatchedB: string[];
  entityMap: CrossEntityMap | null;
}

// ============================================================================
// Relation Rules (backward compatible)
// ============================================================================

var RELATION_RULES: { type: string; requiresA: string[]; requiresB: string[]; desc: string }[] = [
  { type: "profit_analysis", requiresA: ["money", "entity_name"], requiresB: ["money", "entity_name"], desc: "Both tables have money and product names - profit comparison possible" },
  { type: "time_comparison", requiresA: ["money", "datetime"], requiresB: ["money", "datetime"], desc: "Both tables have money and time - trend comparison possible" },
  { type: "entity_overlap", requiresA: ["entity_name"], requiresB: ["entity_name"], desc: "Both tables have product names - entity overlap analysis possible" },
  { type: "regional_analysis", requiresA: ["money", "location"], requiresB: ["money", "location"], desc: "Both tables have money and location - regional comparison possible" },
];

function getRoles(profile: SemanticProfile): Set<string> {
  var roles = new Set<string>();
  for (var i = 0; i < profile.columns.length; i++) {
    if (profile.columns[i].confidence >= 0.6) roles.add(profile.columns[i].role);
  }
  return roles;
}

export function detectRelations(datasets: DatasetMeta[]): DatasetRelation[] {
  if (datasets.length < 2) return [];
  var relations: DatasetRelation[] = [];
  for (var i = 0; i < datasets.length; i++) {
    for (var j = i + 1; j < datasets.length; j++) {
      var a = datasets[i], b = datasets[j];
      if (!a.semanticRoles || !b.semanticRoles) continue;
      var rolesA = getRoles(a.semanticRoles);
      var rolesB = getRoles(b.semanticRoles);
      for (var k = 0; k < RELATION_RULES.length; k++) {
        var rule = RELATION_RULES[k];
        var aMatch = rule.requiresA.every(function (r) { return rolesA.has(r); });
        var bMatch = rule.requiresB.every(function (r) { return rolesB.has(r); });
        if (aMatch && bMatch) {
          var joinKey = "entity_name";
          if (rule.type === "time_comparison") joinKey = "datetime";
          if (rule.type === "regional_analysis") joinKey = "location";
          relations.push({
            type: rule.type as DatasetRelation["type"],
            datasetA: a.id, datasetB: b.id, joinKey: joinKey, confidence: 0.8,
            description: a.originalName + " x " + b.originalName + ": " + rule.desc,
          });
          break;
        }
      }
    }
  }
  return relations;
}

// ============================================================================
// Cross-Table Metrics (NEW — role-driven)
// ============================================================================

export function computeCrossTableMetrics(
  datasetA: CrossTableInput, datasetB: CrossTableInput
): CrossTableMetrics {
  function findColByRole(roles: ColumnRole[], targetRole: string): string | undefined {
    for (var i = 0; i < roles.length; i++) {
      if (roles[i].role === targetRole && roles[i].confidence >= 0.6) return roles[i].column;
    }
    return undefined;
  }

  var entityColA = findColByRole(datasetA.semanticRoles, "entity_name");
  var entityColB = findColByRole(datasetB.semanticRoles, "entity_name");
  var moneyColA = findColByRole(datasetA.semanticRoles, "money");
  var moneyColB = findColByRole(datasetB.semanticRoles, "money");
  var qtyColA = findColByRole(datasetA.semanticRoles, "quantity");
  var qtyColB = findColByRole(datasetB.semanticRoles, "quantity");

  var entityMap: CrossEntityMap | null = null;
  var entityOverlap = { matched: 0, totalA: 0, totalB: 0, rate: 0 };
  var unmatchedA: string[] = [];
  var unmatchedB: string[] = [];

  if (entityColA && entityColB) {
    var entitiesA = extractEntities(datasetA.rows, entityColA, moneyColA, qtyColA);
    var entitiesB = extractEntities(datasetB.rows, entityColB, moneyColB, qtyColB);
    entityMap = buildCrossSheetEntityMap([
      { id: datasetA.id, name: datasetA.originalName, entities: entitiesA },
      { id: datasetB.id, name: datasetB.originalName, entities: entitiesB },
    ]);
    entityOverlap = { matched: entityMap.matched.length, totalA: entitiesA.length, totalB: entitiesB.length, rate: entityMap.coverage };
    unmatchedA = entityMap.unmatched.filter(function (u) { return u.dataset === datasetA.id; }).map(function (u) { return u.name; });
    unmatchedB = entityMap.unmatched.filter(function (u) { return u.dataset === datasetB.id; }).map(function (u) { return u.name; });
  }

  var priceComparison: CrossTableMetrics["priceComparison"] = [];
  if (moneyColA && moneyColB && entityColA && entityColB && entityMap) {
    function buildPriceMap(rows: Record<string, unknown>[], eCol: string, mCol: string): Record<string, { sum: number; count: number }> {
      var map: Record<string, { sum: number; count: number }> = {};
      for (var i = 0; i < rows.length; i++) {
        var name = String(rows[i][eCol] || "").trim();
        var money = Number(rows[i][mCol]);
        if (!name || isNaN(money)) continue;
        if (!map[name]) map[name] = { sum: 0, count: 0 };
        map[name].sum += money; map[name].count++;
      }
      return map;
    }
    var priceMapA = buildPriceMap(datasetA.rows, entityColA, moneyColA);
    var priceMapB = buildPriceMap(datasetB.rows, entityColB, moneyColB);
    for (var pi = 0; pi < entityMap.matched.length; pi++) {
      var m = entityMap.matched[pi];
      var priceA = 0, priceB = 0; var found = false;
      for (var vi = 0; vi < m.variants.length; vi++) {
        var v = m.variants[vi];
        if (priceMapA[v]) { priceA = priceMapA[v].sum / priceMapA[v].count; found = true; }
        if (priceMapB[v]) { priceB = priceMapB[v].sum / priceMapB[v].count; found = true; }
      }
      if (found && (priceA > 0 || priceB > 0)) {
        var diff = Math.round((priceB - priceA) * 100) / 100;
        priceComparison.push({
          entity: m.canonical, priceA: Math.round(priceA * 100) / 100, priceB: Math.round(priceB * 100) / 100,
          diff: diff, diffPercent: priceA > 0 ? Math.round(diff / priceA * 10000) / 100 : 0,
        });
      }
    }
  }

  var quantityComparison: CrossTableMetrics["quantityComparison"] = [];
  if (qtyColA && qtyColB && entityColA && entityColB && entityMap) {
    function buildQtyMap(rows: Record<string, unknown>[], eCol: string, qCol: string): Record<string, number> {
      var map: Record<string, number> = {};
      for (var i = 0; i < rows.length; i++) {
        var name = String(rows[i][eCol] || "").trim();
        var qty = Number(rows[i][qCol]);
        if (!name || isNaN(qty)) continue;
        map[name] = (map[name] || 0) + qty;
      }
      return map;
    }
    var qtyMapA = buildQtyMap(datasetA.rows, entityColA, qtyColA);
    var qtyMapB = buildQtyMap(datasetB.rows, entityColB, qtyColB);
    for (var qi = 0; qi < entityMap.matched.length; qi++) {
      var m2 = entityMap.matched[qi];
      var qtyA = 0, qtyB = 0;
      for (var vj = 0; vj < m2.variants.length; vj++) {
        var v2 = m2.variants[vj]; qtyA += qtyMapA[v2] || 0; qtyB += qtyMapB[v2] || 0;
      }
      if (qtyA > 0 || qtyB > 0) {
        quantityComparison.push({ entity: m2.canonical, qtyA: qtyA, qtyB: qtyB, gap: qtyB - qtyA });
      }
    }
  }

  return { entityOverlap, priceComparison, quantityComparison, unmatchedA, unmatchedB, entityMap };
}
