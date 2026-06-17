/**
 * 通用实体引擎 — 品类无关、字段无关的实体抽取与模糊匹配
 *
 * 设计原则：
 * - 不依赖品类知识库（水果/数码/服装/工业品 同一套逻辑）
 * - 纯字符串算法，不调用 AI
 * - 所有匹配策略可解释、可调试
 *
 * @module entities
 */

export interface Entity {
  name: string;
  variants: string[];
  rowCount: number;
  totalMoney?: number;
  totalQuantity?: number;
}

export interface EntityMatch {
  source: Entity;
  target: Entity;
  confidence: number;
  strategy: "exact" | "contains" | "token_jaccard" | "number_tolerant";
}

export interface CrossEntityMap {
  matched: {
    canonical: string;
    variants: string[];
    datasets: string[];
    metrics: { totalMoney: number; totalQuantity: number };
  }[];
  unmatched: { name: string; dataset: string }[];
  coverage: number;
}

// ============================================================================
// Internal helpers
// ============================================================================

interface MatchAttempt {
  confidence: number;
  strategy: "exact" | "contains" | "token_jaccard" | "number_tolerant";
}

function normalizeEntityName(raw: string): string {
  var result = raw
    .replace(/\s+/g, " ")
    .replace(/[　]/g, " ")
    .replace(/^["'【】《》「」『』""'']+/, "")
    .replace(/["'【】《》「」『』""'']+$/, "")
    .trim();
  if (/^[\d\s.,，。、\-—/\\]+$/.test(result)) return "";
  return result;
}

function tokenize(str: string): string[] {
  var tokens: string[] = [];
  var parts = str.split(/[\s,，、。/；;：:()（）\[\]【】\-—]+/);
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    if (!part) continue;
    for (var j = 0; j < part.length - 1; j++) {
      tokens.push(part.substring(j, j + 2));
    }
    if (part.length >= 2) tokens.push(part);
  }
  return tokens;
}

function tryMatch(a: string, b: string, jaccardThreshold: number): MatchAttempt | null {
  var aNorm = a.toLowerCase().trim();
  var bNorm = b.toLowerCase().trim();

  // 1. Exact match
  if (aNorm === bNorm) {
    return { confidence: 1.0, strategy: "exact" };
  }

  // 2. Contains match
  if (aNorm.indexOf(bNorm) !== -1 || bNorm.indexOf(aNorm) !== -1) {
    var lenRatio = Math.min(aNorm.length, bNorm.length) / Math.max(aNorm.length, bNorm.length);
    return { confidence: 0.7 + lenRatio * 0.2, strategy: "contains" };
  }

  // 3. Number-tolerant match
  var aNoNum = aNorm.replace(/\d+/g, "").trim();
  var bNoNum = bNorm.replace(/\d+/g, "").trim();
  if (aNoNum && bNoNum && aNoNum === bNoNum) {
    return { confidence: 0.75, strategy: "number_tolerant" };
  }

  // 4. Token Jaccard
  var aTokens = tokenize(aNorm).filter(function (t) { return t.length > 1; });
  var bTokens = tokenize(bNorm).filter(function (t) { return t.length > 1; });

  if (aTokens.length === 0 || bTokens.length === 0) return null;

  var intersection = 0;
  var aSet = new Set(aTokens);
  var bSet = new Set(bTokens);
  aSet.forEach(function (t) { if (bSet.has(t)) intersection++; });

  var allTokens = aTokens.slice();
  for (var ti = 0; ti < bTokens.length; ti++) {
    if (allTokens.indexOf(bTokens[ti]) === -1) allTokens.push(bTokens[ti]);
  }
  var jaccard = allTokens.length > 0 ? intersection / allTokens.length : 0;

  if (jaccard >= jaccardThreshold) {
    return { confidence: jaccard, strategy: "token_jaccard" };
  }

  return null;
}

// ============================================================================
// Public API
// ============================================================================

export function extractEntities(
  rows: Record<string, unknown>[],
  entityColumn: string,
  moneyColumn?: string,
  quantityColumn?: string
): Entity[] {
  if (!rows || rows.length === 0 || !entityColumn) return [];

  var entityMap: Record<string, { count: number; totalMoney: number; totalQuantity: number }> = {};

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rawName = String(row[entityColumn] || "").trim();
    if (!rawName || rawName === "undefined" || rawName === "null") continue;

    var name = normalizeEntityName(rawName);
    if (!name) continue;

    if (!entityMap[name]) {
      entityMap[name] = { count: 0, totalMoney: 0, totalQuantity: 0 };
    }
    entityMap[name].count++;

    if (moneyColumn) {
      var moneyVal = Number(row[moneyColumn]);
      if (!isNaN(moneyVal)) entityMap[name].totalMoney += moneyVal;
    }
    if (quantityColumn) {
      var qtyVal = Number(row[quantityColumn]);
      if (!isNaN(qtyVal)) entityMap[name].totalQuantity += qtyVal;
    }
  }

  var entities: Entity[] = [];
  for (var key in entityMap) {
    if (!entityMap.hasOwnProperty(key)) continue;
    var entry = entityMap[key];
    entities.push({
      name: key,
      variants: [key],
      rowCount: entry.count,
      totalMoney: entry.totalMoney > 0 ? Math.round(entry.totalMoney * 100) / 100 : undefined,
      totalQuantity: entry.totalQuantity > 0 ? entry.totalQuantity : undefined,
    });
  }

  entities.sort(function (a, b) { return b.rowCount - a.rowCount; });
  return entities;
}

export function matchEntities(
  sourceEntities: Entity[],
  targetEntities: Entity[],
  threshold?: number
): EntityMatch[] {
  var jaccardThreshold = threshold !== undefined ? threshold : 0.5;
  var matches: EntityMatch[] = [];
  var matchedTargets = new Set<string>();

  for (var i = 0; i < sourceEntities.length; i++) {
    var source = sourceEntities[i];
    var bestMatch: EntityMatch | null = null;

    for (var j = 0; j < targetEntities.length; j++) {
      var target = targetEntities[j];
      if (matchedTargets.has(target.name)) continue;

      var result = tryMatch(source.name, target.name, jaccardThreshold);
      if (result && (!bestMatch || result.confidence > bestMatch.confidence)) {
        bestMatch = {
          source: source,
          target: target,
          confidence: result.confidence,
          strategy: result.strategy,
        };
      }
    }

    if (bestMatch) {
      matches.push(bestMatch);
      matchedTargets.add(bestMatch.target.name);
    }
  }

  return matches;
}

export function buildCrossSheetEntityMap(
  datasets: { id: string; name: string; entities: Entity[] }[]
): CrossEntityMap {
  if (datasets.length === 0) {
    return { matched: [], unmatched: [], coverage: 0 };
  }

  if (datasets.length === 1) {
    var only = datasets[0];
    return {
      matched: [],
      unmatched: only.entities.map(function (e) { return { name: e.name, dataset: only.id }; }),
      coverage: 0,
    };
  }

  var allMatchedCanonicals = new Map<string, {
    canonical: string; variants: string[]; datasets: Set<string>;
    totalMoney: number; totalQuantity: number;
  }>();
  var matchedEntityNames = new Set<string>();

  for (var i = 0; i < datasets.length; i++) {
    for (var j = i + 1; j < datasets.length; j++) {
      var matches = matchEntities(datasets[i].entities, datasets[j].entities);

      for (var k = 0; k < matches.length; k++) {
        var m = matches[k];
        var canonical = m.source.name.length <= m.target.name.length
          ? m.source.name : m.target.name;

        if (allMatchedCanonicals.has(canonical)) {
          var existing = allMatchedCanonicals.get(canonical)!;
          existing.variants.push(m.source.name);
          existing.variants.push(m.target.name);
          existing.datasets.add(datasets[i].id);
          existing.datasets.add(datasets[j].id);
          existing.totalMoney += (m.source.totalMoney || 0) + (m.target.totalMoney || 0);
          existing.totalQuantity += (m.source.totalQuantity || 0) + (m.target.totalQuantity || 0);
        } else {
          allMatchedCanonicals.set(canonical, {
            canonical: canonical,
            variants: [m.source.name, m.target.name],
            datasets: new Set([datasets[i].id, datasets[j].id]),
            totalMoney: (m.source.totalMoney || 0) + (m.target.totalMoney || 0),
            totalQuantity: (m.source.totalQuantity || 0) + (m.target.totalQuantity || 0),
          });
        }

        matchedEntityNames.add(m.source.name);
        matchedEntityNames.add(m.target.name);
      }
    }
  }

  var matched: CrossEntityMap["matched"] = [];
  allMatchedCanonicals.forEach(function (entry) {
    var uniqueVariants: string[] = [];
    var seen = new Set<string>();
    for (var vi = 0; vi < entry.variants.length; vi++) {
      if (!seen.has(entry.variants[vi])) {
        seen.add(entry.variants[vi]);
        uniqueVariants.push(entry.variants[vi]);
      }
    }

    matched.push({
      canonical: entry.canonical,
      variants: uniqueVariants,
      datasets: Array.from(entry.datasets),
      metrics: {
        totalMoney: Math.round(entry.totalMoney * 100) / 100,
        totalQuantity: entry.totalQuantity,
      },
    });
  });

  var unmatched: CrossEntityMap["unmatched"] = [];
  for (var di = 0; di < datasets.length; di++) {
    var ds = datasets[di];
    for (var ei = 0; ei < ds.entities.length; ei++) {
      var entity = ds.entities[ei];
      if (!matchedEntityNames.has(entity.name)) {
        unmatched.push({ name: entity.name, dataset: ds.id });
      }
    }
  }

  var totalUniqueEntities = matched.length + unmatched.length;
  var coverage = totalUniqueEntities > 0
    ? Math.round(matched.length / totalUniqueEntities * 100) / 100
    : 0;

  return { matched: matched, unmatched: unmatched, coverage: coverage };
}
