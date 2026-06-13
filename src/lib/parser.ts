import * as XLSX from "xlsx";

export interface ParsedData {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  summary: string;
  sheets?: { name: string; rowCount: number }[] | null;
}

export function parseFile(data: Uint8Array, fileName: string, sheetName?: string): ParsedData {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (ext === "csv") { return parseCSV(data); }

  // XLS/XLSX: use xlsx library
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const activeSheets: string[] = sheetName ? [sheetName] : workbook.SheetNames;

  const sheetMeta = workbook.SheetNames.map(function(sn: string) {
    const s = workbook.Sheets[sn];
    const ref2 = s["!ref"] || "A1";
    const rng = XLSX.utils.decode_range(ref2);
    return { name: sn, rowCount: rng.e.r - rng.s.r };
  });

  let allRows: Record<string, unknown>[] = [];
  let allColumns: string[] = [];
  let firstSheet = true;

  for (const sn of activeSheets) {
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

  for (const sheetName of activeSheets) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet["!ref"]) continue;
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    let headerRow = range.s.r, best = -1;
    for (let r = range.s.r; r <= Math.min(range.s.r + 30, range.e.r); r++) {
      let n = 0;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cl = sheet[XLSX.utils.encode_cell({ r, c })];
        if (cl && cl.v !== undefined && cl.v !== null && String(cl.v).trim()) n++;
      }
      if (n > best) { best = n; headerRow = r; }
    }
    const cols: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cl = sheet[XLSX.utils.encode_cell({ r: headerRow, c })];
      cols.push(cl ? String(cl.v ?? "").trim() : "");
    }
    while (cols.length > 0 && !cols[cols.length - 1]) cols.pop();
    if (cols.length < 2) continue;
    if (firstSheet) {
      allColumns = cols;
      if (workbook.SheetNames.length > 1) allColumns = ["sheet_name"].concat(allColumns);
      firstSheet = false;
    }
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

  if (allRows.length === 0) throw new Error("empty file");
  const finalColumns = [...new Set(allColumns)];
  const activeColumns = finalColumns.filter(function(c) { return allRows.some(function(r) { const v = r[c]; return v !== undefined && v !== null && String(v).trim() !== ""; }); });
  const rows = allRows.slice(0, 5000);
  const summary = buildSummary(activeColumns, rows);
  return { columns: activeColumns, rows, rowCount: rows.length, summary, sheets: sheetMeta.length > 1 ? sheetMeta : null };
}

function parseCSV(data: Uint8Array): ParsedData {
  const text = new TextDecoder("utf-8").decode(data);
  const clean = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  const lines = clean.split("\n").filter(function(l) { return l.trim().length > 0; });
  if (lines.length < 2) throw new Error("empty CSV");

  const headers = lines[0].split(",").map(function(h) { return h.trim().replace(/\r$/, ""); });
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",");
    const row: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      const raw = (vals[j] || "").trim().replace(/\r$/, "");
      const num = Number(raw);
      row[headers[j]] = isNaN(num) ? raw : num;
    }
    rows.push(row);
  }

  const activeColumns = headers.filter(function(c) { return rows.some(function(r) { return String(r[c] || "").trim() !== ""; }); });
  const limited = rows.slice(0, 5000);
  const summary = buildSummary(activeColumns, limited);
  return { columns: activeColumns, rows: limited, rowCount: limited.length, summary };
}

export function buildSummary(columns: string[], rows: Record<string, unknown>[]): string {
  const numericColumns: string[] = [];
  for (const col of columns) {
    const hasNumeric = rows.some(function(r) { return typeof r[col] === "number" && !isNaN(r[col] as number); });
    if (hasNumeric) numericColumns.push(col);
  }
  const parts: string[] = [];
  parts.push("contains " + rows.length + " rows, " + columns.length + " cols.");
  for (const col of numericColumns.slice(0, 5)) {
    const values = rows.map(function(r) { return Number(r[col]); }).filter(function(v) { return !isNaN(v); });
    if (values.length === 0) continue;
    const sum = values.reduce(function(a, b) { return a + b; }, 0);
    const avg = sum / values.length;
    const min = Math.min.apply(null, values);
    const max = Math.max.apply(null, values);
    parts.push(col + ": avg=" + avg.toFixed(2) + ", min=" + min + ", max=" + max);
  }
  return parts.join("\n");
}


function isIdColumn(col: string, rows: Record<string, unknown>[]): boolean {
  const n = col.toLowerCase();
  // Name patterns that indicate ID/identifier columns
  if (/id$|编号|单号|手机|电话|物流|track|courier|运单/.test(n)) return true;
  // Check cardinality: if >70% values are unique, it is an ID
  if (rows.length > 5) {
    const unique = new Set();
    let numCount = 0;
    for (let i = 0; i < Math.min(rows.length, 200); i++) {
      const v = rows[i][col];
      if (typeof v === "number") numCount++;
      unique.add(String(v));
    }
    const sampleSize = Math.min(rows.length, 200);
    if (unique.size > sampleSize * 0.7) return true;
  }
  return false;
}

function isNumericLike(n: string): boolean {
  // Column name suggests numeric content
  return /price|金额|价格|amount|total|quantity|数量|qty|num|rating|评分|销量|volume/.test(n.toLowerCase());
}

export function computeStats(rows: Record<string, unknown>[], columns: string[]) {
  const numericColumns = columns.filter(function(col) {
    return rows.some(function(r) { return typeof r[col] === "number" && !isNaN(r[col] as number); }) && !isIdColumn(col, rows);
  });
  const stats: Record<string, { sum: number; avg: number; min: number; max: number; count: number }> = {};
  for (const col of numericColumns) {
    const values = rows.map(function(r) { return Number(r[col]); }).filter(function(v) { return !isNaN(v); });
    if (values.length === 0) continue;
    stats[col] = {
      sum: values.reduce(function(a, b) { return a + b; }, 0),
      avg: values.reduce(function(a, b) { return a + b; }, 0) / values.length,
      min: Math.min.apply(null, values),
      max: Math.max.apply(null, values),
      count: values.length,
    };
  }
  const textColumns = columns.filter(function(col) { return !numericColumns.includes(col) && !isIdColumn(col, rows); });
  const distributions: Record<string, Record<string, number>> = {};
  for (const col of textColumns.slice(0, 3)) {
    const dist: Record<string, number> = {};
    for (const row of rows) {
      const val = String(row[col] ?? "");
      if (val) dist[val] = (dist[val] || 0) + 1;
    }
    distributions[col] = Object.fromEntries(
      Object.entries(dist).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 10)
    );
  }
  return { stats, distributions, rowCount: rows.length, columnCount: columns.length };
}
