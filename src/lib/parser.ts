import * as XLSX from "xlsx";

export interface ParsedData {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  summary: string;
}

// Find the most likely header row in a sheet
function findHeaderRow(sheet: XLSX.WorkSheet): number {
  const ref = sheet["!ref"];
  if (!ref) return 0;
  const range = XLSX.utils.decode_range(ref);
  
  // Scan rows to find one that looks like a header (multiple non-empty cells)
  let bestRow = 0;
  let bestScore = 0;
  
  for (let r = range.s.r; r <= Math.min(range.s.r + 20, range.e.r); r++) {
    let nonEmpty = 0;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== "") {
        nonEmpty++;
      }
    }
    // Header rows typically have 3+ columns with data
    if (nonEmpty >= 3 && nonEmpty > bestScore) {
      bestScore = nonEmpty;
      bestRow = r;
    }
  }
  return bestRow;
}

// Get clean column names from the header row
function getColumns(sheet: XLSX.WorkSheet, headerRow: number): string[] {
  const ref = sheet["!ref"];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const columns: string[] = [];
  
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: headerRow, c })];
    const val = cell ? String(cell.v ?? "").trim() : "";
    columns.push(val || `Column${c + 1}`);
  }
  
  // Strip trailing empty column headers
  while (columns.length > 0 && !columns[columns.length - 1]) {
    columns.pop();
  }
  
  return columns;
}

// Check if a row looks like a data row (not a note/annotation row)
function isDataRow(row: Record<string, unknown>, columns: string[]): boolean {
  const values = Object.values(row).filter(
    (v) => v !== undefined && v !== null && String(v).trim() !== ""
  );
  // A data row should have values in at least 2 columns
  return values.length >= 2;
}

export function parseFile(data: Uint8Array, fileName: string): ParsedData {
  const ext = fileName.split(".").pop()?.toLowerCase();

  // Strip BOM from CSV
  let bytes: Uint8Array;
  if (ext === "csv" && data.length >= 3 && data[0] === 0xEF && data[1] === 0xBB && data[2] === 0xBF) {
    bytes = data.slice(3);
  } else {
    bytes = data;
  }

  const workbook = XLSX.read(bytes, { type: "array" });
  
  // Process all sheets and merge data
  const allRows: Record<string, unknown>[] = [];
  let allColumns: string[] = [];
  let firstSheet = true;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet["!ref"]) continue;
    
    const headerRow = findHeaderRow(sheet);
    const sheetCols = getColumns(sheet, headerRow);
    
    // Use columns from first valid sheet, add sheet_name column for multi-sheet files
    if (firstSheet && sheetCols.length >= 2) {
      allColumns = sheetCols;
      if (workbook.SheetNames.length > 1) {
        allColumns = ["sheet_name", ...allColumns];
      }
      firstSheet = false;
    }
    
    if (sheetCols.length < 2) continue;
    
    // Parse data rows (start from headerRow + 1)
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    const rawRows: Record<string, unknown>[] = [];
    
    for (let r = headerRow + 1; r <= range.e.r; r++) {
      const rowData: Record<string, unknown> = {};
      let hasData = false;
      
      for (let c = 0; c < sheetCols.length; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })];
        const val = cell ? cell.v : undefined;
        rowData[sheetCols[c]] = val !== undefined ? val : "";
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          hasData = true;
        }
      }
      
      if (hasData) {
        if (workbook.SheetNames.length > 1) {
          rowData["sheet_name"] = sheetName;
        }
        rawRows.push(rowData);
      }
    }
    
    // Filter out rows that are notes/annotations (single-cell-wide content)
    const dataRows = rawRows.filter((row) => isDataRow(row, sheetCols));
    allRows.push(...dataRows);
  }

  if (allRows.length === 0) {
    throw new Error("?????????????????????");
  }

  // Reorder columns: put sheet_name first if it exists
  const finalColumns = [...new Set([...allColumns])];
  
  // Limit to 5000 rows
  const rows = allRows.slice(0, 5000);

  // Remove columns where all values are empty
  const activeColumns = finalColumns.filter((col) =>
    rows.some((r) => r[col] !== undefined && r[col] !== null && String(r[col]).trim() !== "")
  );

  const summary = buildSummary(activeColumns, rows);

  return {
    columns: activeColumns,
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
  parts.push("????? " + rows.length + " ????? " + columns.length + " ????");

  for (const col of numericColumns.slice(0, 5)) {
    const values = rows
      .map((r) => Number(r[col]))
      .filter((v) => !isNaN(v));
    if (values.length === 0) continue;
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    parts.push(col + ": ??? " + avg.toFixed(2) + ", ??? " + min + ", ??? " + max + "?");
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
