import os
p = r"C:\Users\22123\Documents\Codex\2026-06-11\ai-data-copilot-full-prompt-spec\ai-data-copilot\src\lib\parser.ts"
c = open(p, "r", encoding="utf-8").read()

start = c.find("export function parseFile")
end = c.find("function buildSummary")
old = c[start:end]

new = """export function parseFile(data: Uint8Array, fileName: string): ParsedData {
  var ext = fileName.split(".").pop()?.toLowerCase();
  var workbook;
  if (ext === "csv") {
    // CSV: read as UTF-8 string to correctly handle Chinese characters
    var text = Buffer.from(data).toString("utf8");
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    workbook = XLSX.read(text, { type: "string" });
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
  if (allRows.length === 0) throw new Error("\u6587\u4EF6\u4E3A\u7A7A");
  var finalColumns = Array.from(new Set(allColumns));
  var activeColumns = finalColumns.filter(function(col: string) { return allRows.some(function(r: any) { var v = r[col]; return v !== undefined && v !== null && String(v).trim() !== ""; }); });
  var rows = allRows.slice(0, 5000);
  var summary = buildSummary(activeColumns, rows);
  return { columns: activeColumns, rows: rows, rowCount: rows.length, summary: summary };
}

"""

c = c.replace(old, new)
open(p, "w", encoding="utf-8").write(c)
print("parser fixed", len(c))