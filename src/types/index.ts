export interface ParsedData {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  summary: string;
}

export interface DatasetRecord {
  id: string;
  name: string;
  original_name: string;
  columns: string;
  row_count: number;
  summary: string | null;
  created_at: string;
}

export interface AnalysisResult {
  summary: string;
  insights: string[];
  risks: string[];
  suggestions: string[];
}

export interface DataStats {
  stats: Record<string, { sum: number; avg: number; min: number; max: number; count: number }>;
  distributions: Record<string, Record<string, number>>;
  rowCount: number;
  columnCount: number;
}

export interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
}
