export interface PlatformTemplate {
  id: string;
  name: string;
  fieldMap: Record<string, string>;
  columnTypes: Record<string, "number" | "date" | "category" | "text">;
  cleanRules: Record<string, string>;
}

export interface ColumnMeta {
  name: string;
  standardName?: string;
  type: "number" | "date" | "category" | "text";
  selected: boolean;
}
