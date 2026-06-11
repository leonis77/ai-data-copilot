import * as XLSX from "xlsx";

export interface ParsedData {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  summary: string;
}

export function parseFile(data: Uint8Array, fileName: string): ParsedData {
  const ext = fileName.split(".").pop()?.toLowerCase();

  // Strip BOM from CSV before passing to xlsx
  let bytes: Uint8Array;
  if (ext === "csv" && data.length >= 3 && data[0] === 0xEF && data[1] === 0xBB && data[2] === 0xBF) {
    bytes = data.slice(3);
  } else {
    bytes = data;
  }

  const workbook = XLSX.read(bytes, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  if (raw.length === 0) {
    throw new Error("文件为空，请上传包含数据的文件");
  }

  const columns = Object.keys(raw[0]);
  const rows = raw.slice(0, 5000);

  const summary = buildSummary(columns, rows);

  return {
    columns,
    rows,
    rowCount: rows.length,
    summary,
  };
}

function buildSummary(columns: string[], rows: Record<string, unknown>[]): string {
  const numericColumns: string[] = [];
  for (const col of columns) {
    const hasNumeric = rows.some((r) => typeof r[col] === "number" && !isNaN(r[col] as number));
    if (hasNumeric) numericColumns.push(col);
  }

  const parts: string[] = [];
  parts.push(`数据集包含 ${rows.length} 条记录，共 ${columns.length} 个字段。`);

  for (const col of numericColumns.slice(0, 5)) {
    const values = rows
      .map((r) => Number(r[col]))
      .filter((v) => !isNaN(v));
    if (values.length === 0) continue;
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    parts.push(`${col}: 平均值 ${avg.toFixed(2)}, 最小值 ${min}, 最大值 ${max}。`);
  }

  return parts.join("\n");
}

export function computeStats(rows: Record<string, unknown>[], columns: string[]) {
  const numericColumns = columns.filter((col) =>
    rows.some((r) => typeof r[col] === "number" && !isNaN(r[col] as number))
  );

  const stats: Record<string, { sum: number; avg: number; min: number; max: number; count: number }> = {};
  for (const col of numericColumns) {
    const values = rows.map((r) => Number(r[col])).filter((v) => !isNaN(v));
    if (values.length === 0) continue;
    stats[col] = {
      sum: values.reduce((a, b) => a + b, 0),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }

  const textColumns = columns.filter((col) => !numericColumns.includes(col));
  const distributions: Record<string, Record<string, number>> = {};
  for (const col of textColumns.slice(0, 3)) {
    const dist: Record<string, number> = {};
    for (const row of rows) {
      const val = String(row[col] ?? "");
      dist[val] = (dist[val] || 0) + 1;
    }
    distributions[col] = Object.fromEntries(
      Object.entries(dist)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    );
  }

  return { stats, distributions, rowCount: rows.length, columnCount: columns.length };
}