import * as XLSX from "xlsx";

export interface ParsedData {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  summary: string;
}

export function parseFile(data: Uint8Array, fileName: string): ParsedData {
  const ext = fileName.split(".").pop()?.toLowerCase();
  let bytes: Uint8Array = data;
  if (ext === "csv" && data.length >= 3 && data[0] === 0xEF && data[1] === 0xBB && data[2] === 0xBF) bytes = data.slice(3);
  const workbook = XLSX.read(bytes, { type: "array", cellDates: true });
  // Expand merged cells
  for (const sn of workbook.SheetNames) {
    const sheet = workbook.Sheets[sn];
    const merges = sheet["!merges"] || [];
    for (const m of merges) {
      const src = sheet[XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c })];
      if (!src) continue;
      for (let rr = m.s.r; rr <= m.e.r; rr++)
        for (let cc = m.s.c; cc <= m.e.c; cc++) {
          if (rr === m.s.r && cc === m.s.c) continue;
          const a = XLSX.utils.encode_cell({ r: rr, c: cc });
          if (!sheet[a]) sheet[a] = { t: src.t || "s", v: src.v };
        }
    }
  }
  // Multi-sheet support with auto header detection
  const allRows: Record<string, unknown>[] = [];
  let allColumns: string[] = [];
  let firstSheet = true;
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet["!ref"]) continue;
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    // Find best header row
    let headerRow = range.s.r, best = -1;
    for (let r = range.s.r; r <= Math.min(range.s.r + 30, range.e.r); r++) {
      let n = 0;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cl = sheet[XLSX.utils.encode_cell({ r, c })];
        if (cl && cl.v !== undefined && cl.v !== null && String(cl.v).trim()) n++;
      }
      if (n > best) { best = n; headerRow = r; }
    }
    // Extract columns
    const cols: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cl = sheet[XLSX.utils.encode_cell({ r: headerRow, c })];
      cols.push(cl ? String(cl.v ?? "").trim() : "");
    }
    while (cols.length > 0 && !cols[cols.length - 1]) cols.pop();
    if (cols.length < 2) continue;
    if (firstSheet) {
      allColumns = cols;
      if (workbook.SheetNames.length > 1) allColumns = ["sheet_name", ...allColumns];
      firstSheet = false;
    }
    // Parse rows
    for (let r = headerRow + 1; r <= range.e.r; r++) {
      let hasData = false;
      const rd: Record<string, unknown> = {};
      for (let c = 0; c < cols.length; c++) {
        const cl = sheet[XLSX.utils.encode_cell({ r, c })];
        const val = cl ? cl.v : undefined;
        rd[cols[c]] = val !== undefined && val !== null ? val : "";
        if (val !== undefined && val !== null && String(val).trim()) hasData = true;
      }
      if (hasData) {
        if (workbook.SheetNames.length > 1) rd["sheet_name"] = sheetName;
        allRows.push(rd);
      }
    }
  }
  if (allRows.length === 0) throw new Error("?????????????");
  const finalColumns = [...new Set(allColumns)];
  const activeColumns = finalColumns.filter(col => allRows.some(r => { const v = r[col]; return v !== undefined && v !== null && String(v).trim() !== ""; }));
  const rows = allRows.slice(0, 5000).map(row => { const fixed: Record<string, unknown> = {}; for (const k of Object.keys(row)) { fixed[k] = fixEncoding(row[k]); } return fixed; });
  const summary = buildSummary(activeColumns, rows);
  return { columns: activeColumns, rows, rowCount: rows.length, summary };
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

function fixEncoding(val: unknown): unknown {
  if (typeof val !== 'string') return val;
  // Check for double-encoding pattern: UTF-8 bytes interpreted as Latin-1 then re-encoded
  // Common indicators: strings containing 'Ã' (0xC3) followed by other high bytes
  if (/[\u00C0-\u00FF]{2,}/.test(val)) {
    try {
      const fixed = Buffer.from(val, 'latin1').toString('utf8');
      // Only use the fix if it produces valid text (has CJK or ASCII)
      if (/[\u4e00-\u9fff]/.test(fixed) || /^[\x20-\x7E]+$/.test(fixed)) {
        return fixed;
      }
    } catch {}
  }
  return val;
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
