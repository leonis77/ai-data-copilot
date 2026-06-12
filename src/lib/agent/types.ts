export type AgentType = "query" | "report" | "interpret" | "general";

export interface AgentContext {
  dataSummary: string;
  columns: string[];
  rowCount: number;
  stats: any;
  datasetName: string;
}

export interface AgentResponse {
  type: AgentType;
  content: string;
  chart?: { type: string; data: { name: string; value: number }[]; title: string };
  table?: { columns: string[]; rows: Record<string, unknown>[] };
  suggestions?: string[];
  followUp?: string[];
}
