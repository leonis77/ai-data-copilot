import * as XLSX from "xlsx";

export interface ParsedData {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  summary: string;
}

export function parseFile(data: Uint8Array, fileName: string): ParsedData {
  var ext = fileName.split(".").pop()?.toLowerCase();
  var workbook;
  if (ext === "csv") {
    // CSV: read as UTF-8 string to correctly handle Chinese characters
    var text = Buffer.from(data).toString("utf8");
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    workbook = XLSX.read(text, { type: "string", codepage: 65001 });
  } else {
    workbook = XLSX.read(data, { type: "array", cellDates: true });
  }

  var allRows: Record<string, unknown>[] = [];
  var allColumns: string[] = [];
  var firstSheet = true;

  for (var sn of workbook.SheetNames) {
    var sheet = workbook.Sheets[sn];
    var merges = sheet["!merges"] || [];
    for (var m of merges) {
      var src = sheet[XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c })];
      if (!src) continue;
      for (var rr = m.s.r; rr <= m.e.r; rr++)
        for (var cc = m.s.c; cc <= m.e.c; cc++) {
          if (rr === m.s.r && cc === m.s.c) continue;
          var a = XLSX.utils.encode_cell({ r: rr, c: cc });
          if (!sheet[a]) sheet[a] = { t: src.t || "s", v: src.v };
        }
    }
  }

  for (var sheetName of workbook.SheetNames) {
    var sheet = workbook.Sheets[sheetName];
    if (!sheet["!ref"]) continue;
    var range = XLSX.utils.decode_range(sheet["!ref"]);
    var headerRow = range.s.r, best = -1;
    for (var r = range.s.r; r <= Math.min(range.s.r + 30, range.e.r); r++) {
      var n = 0;
      for (var c = range.s.c; c <= range.e.c; c++) {
        var cl = sheet[XLSX.utils.encode_cell({ r: r, c: c })];
        if (cl && cl.v !== undefined && cl.v !== null && String(cl.v).trim()) n++;
      }
      if (n > best) { best = n; headerRow = r; }
    }
    var cols: string[] = [];
    for (var c = range.s.c; c <= range.e.c; c++) {
      var cl = sheet[XLSX.utils.encode_cell({ r: headerRow, c: c })];
      cols.push(cl ? String(cl.v ?? "").trim() : "");
    }
    while (cols.length > 0 && !cols[cols.length - 1]) cols.pop();
    if (cols.length < 2) continue;
    if (firstSheet) {
      allColumns = cols;
      if (workbook.SheetNames.length > 1) allColumns = ["sheet_name"].concat(allColumns);
      firstSheet = false;
    }
    for (var r = headerRow + 1; r <= range.e.r; r++) {
      var hasData = false;
      var rd: Record<string, unknown> = {};
      for (var c = 0; c < cols.length; c++) {
        var cl = sheet[XLSX.utils.encode_cell({ r: r, c: c })];
        var val = cl ? cl.v : undefined;
        rd[cols[c]] = val !== undefined && val !== null ? val : "";
        if (val !== undefined && val !== null && String(val).trim()) hasData = true;
      }
      if (hasData) {
        if (workbook.SheetNames.length > 1) rd["sheet_name"] = sheetName;
        allRows.push(rd);
      }
    }
  }
  if (allRows.length === 0) throw new Error("文件为空");
  var finalColumns = Array.from(new Set(allColumns));
  var activeColumns = finalColumns.filter(function(col: string) { return allRows.some(function(r: any) { var v = r[col]; return v !== undefined && v !== null && String(v).trim() !== ""; }); });
  var rows = allRows.slice(0, 5000);
  var summary = buildSummary(activeColumns, rows);
  return { columns: activeColumns, rows: rows, rowCount: rows.length, summary: summary };
}

export function buildSummary(columns: string[], rows: Record<string, unknown>[]): string {
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
  if (typeof val !== "string") return val;
  if (!val) return val;
  // If already contains valid CJK, return as-is
  if (/[一-鿿]/.test(val)) return val;
  // Multi-pass Latin1 -> UTF8 decode until we get CJK or no change
  try {
    var fixed: string = val;
    for (var i = 0; i < 4; i++) {
      var bytes = Buffer.from(fixed, "latin1");
      var decoded = bytes.toString("utf8");
      if (/[一-鿿]/.test(decoded)) return decoded;
      if (decoded === fixed) break;
      fixed = decoded;
    }
  } catch (e) {}
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
