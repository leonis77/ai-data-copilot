export type SemanticRole = "money" | "datetime" | "entity_name" | "identifier" | "location" | "quantity" | "category" | "text";

export interface ColumnRole {
  column: string;
  role: SemanticRole;
  confidence: number;
  sampleValues: string[];
}

export interface SemanticProfile {
  datasetId: string;
  columns: ColumnRole[];
  summary: string;
  availableDecisions: string[];
}

export interface DatasetRelation {
  type: "profit_analysis" | "time_comparison" | "entity_overlap" | "none";
  datasetA: string;
  datasetB: string;
  joinKey: string;
  confidence: number;
  description: string;
}

export interface MatchEvidence {
  source: string;
  row: number;
  column: string;
  value: string | number;
}

export interface VerifiedClaim {
  claim: string;
  evidence: MatchEvidence[];
  calculation: string;
  sampleSize: number;
  confidence: number;
  verified: boolean;
  limitations: string;
}

export interface DecisionContext {
  columns: string[];
  rows: Record<string, unknown>[];
  datasetName: string;
  semanticRoles?: SemanticProfile;
  relations?: DatasetRelation[];
}
