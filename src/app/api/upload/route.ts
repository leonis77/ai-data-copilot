import { NextRequest, NextResponse } from "next/server";
import { parseFile, rawPreview } from "@/lib/parser";
import { analyzeSheetStructure } from "@/lib/parser-ai";
import { logger } from "@/lib/logger";
import { buildSemanticProfile } from "@/lib/semantic";
import { saveDataset, getLatestDataset, getDataset, listDatasets, deleteDataset } from "@/lib/db";

var XLSX = require("xlsx");

export async function POST(request: NextRequest) {
  try {
    var body = await request.json();
    var fileName = body.fileName || "";
    var fileData = body.fileData || "";
    if (!fileName || !fileData) return NextResponse.json({ error: "missing file" }, { status: 400 });

    var ext = fileName.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") return NextResponse.json({ error: "unsupported format" }, { status: 400 });
    if (fileData.length > 70 * 1024 * 1024) return NextResponse.json({ error: "file too large" }, { status: 413 });

    var buffer = Buffer.from(fileData, "base64");
    var data = new Uint8Array(buffer);

    // Step 1: Try rule-based parser first (fast path)
    var parsed: any = null;
    var parseError: string | null = null;
    try {
      parsed = parseFile(data, fileName, body.sheetName);
    } catch (e: any) {
      parseError = e.message;
      logger.warn("Rule parser failed, trying AI-guided parsing", { error: parseError });
    }

    // Step 2: If rule parser failed AND it is an Excel file, try AI-guided parsing
    if (!parsed && (ext === "xlsx" || ext === "xls")) {
      try {
        var preview = rawPreview(data, fileName);
        if (preview && preview.sheets && preview.sheets.length > 0) {
          var firstSheet = preview.sheets[0];
          var aiStructure = await analyzeSheetStructure(
            firstSheet.name, firstSheet.preview, firstSheet.mergeInfo, firstSheet.totalRows
          );
          
          if (aiStructure && aiStructure.headerRow >= 0) {
            // Re-parse using AI guidance
            var wb = XLSX.read(data, { type: "array", cellDates: true });
            var sn = wb.SheetNames[0];
            var sheet = wb.Sheets[sn];
            var rang = XLSX.utils.decode_range(sheet["!ref"] || "A1");

            // Use AI-provided header row and column types
            var cols: string[] = [];
            for (var c = rang.s.c; c <= rang.e.c; c++) {
              var cl = sheet[XLSX_enc3(aiStructure.headerRow, c)];
              cols.push(cl ? String(cl.v || "").trim() : "");
            }
            while (cols.length > 0 && !cols[cols.length - 1]) cols.pop();

            // Collect rows, skipping AI-identified annotation rows
            var skipSet = new Set(aiStructure.skipRows);
            var rows: Record<string, unknown>[] = [];
            for (var r = aiStructure.headerRow + 1; r <= rang.e.r; r++) {
              if (skipSet.has(r)) continue;
              var hasData = false;
              var rd: Record<string, unknown> = {};
              for (var c2 = 0; c2 < cols.length; c2++) {
                var cl2 = sheet[XLSX_enc3(r, c2)];
                var val = cl2 ? cl2.v : undefined;
                rd[cols[c2]] = val !== undefined && val !== null ? val : "";
                if (val !== undefined && val !== null && String(val).trim()) hasData = true;
              }
              if (hasData) rows.push(rd);
            }

            if (rows.length > 0) {
              var activeCols = cols.filter(function(c) { return rows.some(function(r) { return String(r[c] || "").trim() !== ""; }); });
              var maxRows = 500;
              var limitedRows = rows.slice(0, maxRows);
              parsed = {
                columns: activeCols,
                rows: limitedRows,
                rowCount: rows.length,
                summary: "AI-guided parse: " + rows.length + " rows, " + activeCols.length + " columns (showing " + limitedRows.length + " rows)",
                sheets: null,
              };
              logger.info("AI-guided parsing succeeded", { rowCount: rows.length, headerRow: aiStructure.headerRow });
            }
          }
        }
      } catch (aiErr: any) {
        logger.warn("AI-guided parsing also failed", { message: aiErr.message });
      }
    }

    // Step 3: If still failed, return error
    if (!parsed) {
      return NextResponse.json({ error: parseError || "parse failed - file may be empty or format unsupported" }, { status: 400 });
    }

    // Save to Supabase (non-blocking)
    var semProfile: any = null;
    try { semProfile = buildSemanticProfile("", parsed.columns, parsed.rows.slice(0, 50)); } catch (e) { logger.warn("Semantic profile failed"); }
    
    var id = "ds_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    var saveRows = parsed.rows.slice(0, 500);
    try {
      try {
      await saveDataset({ id, name: "dataset_" + Date.now(), originalName: fileName, columns: parsed.columns, rows: saveRows, summary: parsed.summary });
    } catch (dbError: any) { logger.warn("Supabase save failed (non-blocking)", { message: dbError.message }); }
    } catch (dbError: any) {
      logger.warn("Supabase save failed (non-blocking)", { message: dbError.message });
    }

    return NextResponse.json({
      id, columns: parsed.columns, rows: parsed.rows,
      rowCount: parsed.rowCount, summary: parsed.summary, semanticRoles: semProfile,
      sheets: (parsed as any).sheets || null,
    });
  } catch (error) {
    logger.error("Upload failed", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: error instanceof Error ? error.message : "parse failed" }, { status: 500 });
  }
}

function XLSX_enc3(r: number, c: number): string {
  var col = String.fromCharCode(65 + c);
  return col + (r + 1);
}

export async function DELETE(request: NextRequest) {
  try {
    var url = new URL(request.url);
    var id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
    await deleteDataset(id);
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: "delete failed" }, { status: 500 }); }
}

export async function GET(request: NextRequest) {
  try {
    var url = new URL(request.url);
    var id = url.searchParams.get("id");
    var latest = url.searchParams.get("latest");
    var list = url.searchParams.get("list");
    if (list === "true") { var datasets = await listDatasets(); return NextResponse.json({ datasets }); }
    if (id) { var ds = await getDataset(id); if (!ds) return NextResponse.json({ error: "not found" }, { status: 404 }); return NextResponse.json(ds); }
    if (latest === "true") { var lds = await getLatestDataset(); if (!lds) return NextResponse.json(null); return NextResponse.json(lds); }
    return NextResponse.json({ error: "missing param" }, { status: 400 });
  } catch (error) {
    logger.error("GET error", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
