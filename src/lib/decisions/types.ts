export type DecisionPriority = "P0" | "P1" | "P2";
export type DecisionType = "pricing" | "restock" | "new_product" | "clearance" | "anomaly";

export interface DecisionCard {
  id: string;
  type: DecisionType;
  priority: DecisionPriority;
  title: string;
  description: string;
  impact: string;
  action: string;
  confidence: "high" | "medium" | "low";
  relatedProduct?: string;
  relatedMetric?: { label: string; value: string };
}

export interface DecisionContext {
  columns: string[];
  rows: Record<string, unknown>[];
  datasetName: string;
  productMetrics?: any[];
  diagnosis?: any[];
  healthScore?: any;
}
