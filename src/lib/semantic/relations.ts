import type { SemanticProfile, DatasetRelation, ColumnRole } from "./types";
import { logger } from "@/lib/logger";

interface DatasetMeta {
  id: string;
  originalName: string;
  semanticRoles?: SemanticProfile;
}

var RELATION_RULES: { type: string; requiresA: string[]; requiresB: string[]; desc: string }[] = [
  { type: "profit_analysis", requiresA: ["money", "entity_name"], requiresB: ["money", "entity_name"], desc: "Both tables have money and product names - profit comparison possible" },
  { type: "time_comparison", requiresA: ["money", "datetime"], requiresB: ["money", "datetime"], desc: "Both tables have money and time - trend comparison possible" },
  { type: "entity_overlap", requiresA: ["entity_name"], requiresB: ["entity_name"], desc: "Both tables have product names - entity overlap analysis possible" },
  { type: "regional_analysis", requiresA: ["money", "location"], requiresB: ["money", "location"], desc: "Both tables have money and location - regional comparison possible" },
];

function getRoles(profile: SemanticProfile): Set<string> {
  var roles = new Set<string>();
  for (var i = 0; i < profile.columns.length; i++) {
    if (profile.columns[i].confidence >= 0.6) {
      roles.add(profile.columns[i].role);
    }
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
        var aMatch = rule.requiresA.every(function(r) { return rolesA.has(r); });
        var bMatch = rule.requiresB.every(function(r) { return rolesB.has(r); });
        
        if (aMatch && bMatch) {
          var joinKey = "entity_name";
          if (rule.type === "time_comparison") joinKey = "datetime";
          if (rule.type === "regional_analysis") joinKey = "location";
          
          relations.push({
            type: rule.type as DatasetRelation["type"],
            datasetA: a.id, datasetB: b.id,
            joinKey: joinKey,
            confidence: 0.8,
            description: a.originalName + " x " + b.originalName + ": " + rule.desc,
          });
          break; // One relation per pair is enough
        }
      }
    }
  }
  
  return relations;
}
