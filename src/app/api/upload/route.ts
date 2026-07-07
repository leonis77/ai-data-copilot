import { NextRequest, NextResponse } from "next/server";
import { parseFile, rawPreview } from "@/lib/parser";
import { analyzeSheetStructure } from "@/lib/parser-ai";
import { logger } from "@/lib/logger";
import { buildSemanticProfile } from "@/lib/semantic";
import { saveDataset, getLatestDataset, getDataset, listDatasets, deleteDataset } from "@/lib/db";
import { saveToServerStore, getFromServerStore, getLatestFromServerStore } from "@/lib/server-store";

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

    // Platform detection from column names
    var platform = detectPlatformFromColumns(parsed.columns);

    // Save to Supabase (non-blocking)
    var semProfile: any = null;
    try { semProfile = buildSemanticProfile("", parsed.columns, parsed.rows.slice(0, 50)); } catch (e) { logger.warn("Semantic profile failed"); }

    var id = "ds_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    var saveRows = parsed.rows.slice(0, 500);

    // Save to in-memory server store FIRST (synchronous, works without Supabase)
    try {
      saveToServerStore({
        id,
        name: "dataset_" + Date.now(),
        originalName: fileName,
        columns: parsed.columns,
        rows: saveRows,
        rowCount: parsed.rows.length,
        summary: parsed.summary,
        createdAt: new Date().toISOString(),
        semanticRoles: semProfile || undefined,
        platform: platform || undefined,
      });
      logger.info("Dataset saved to in-memory store", { id, rows: saveRows.length, platform });
    } catch (storeErr: any) {
      logger.warn("In-memory store save failed", { message: storeErr.message });
    }

    // Save to Supabase (non-blocking - runs in background, failures are logged)
    try {
      await saveDataset({
        id, name: "dataset_" + Date.now(), originalName: fileName,
        columns: parsed.columns, rows: saveRows, summary: parsed.summary,
        platform: platform || undefined, semanticRoles: semProfile || undefined,
      });
    } catch (dbError: any) {
      logger.warn("Supabase save failed (non-blocking)", { message: dbError.message });
    }

    return NextResponse.json({
      id, columns: parsed.columns, rows: parsed.rows,
      rowCount: parsed.rowCount, summary: parsed.summary, semanticRoles: semProfile,
      platform: platform || null,
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

/** 从列名检测所属平台 */
function detectPlatformFromColumns(columns: string[]): string {
  if (columns.some(function(c: string) { return /tmall|天猫|淘宝|taobao|买家会员|买家实际支付/i.test(c); })) return "tmall";
  if (columns.some(function(c: string) { return /京东|jd|自营|pop/i.test(c); })) return "jd";
  if (columns.some(function(c: string) { return /拼多多|pdd|拼团|百亿补贴/i.test(c); })) return "pdd";
  if (columns.some(function(c: string) { return /抖音|douyin|达人|直播|千川|罗盘/i.test(c); })) return "douyin";
  return "";
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

    if (list === "true") {
      // Merge in-memory store + Supabase datasets, dedupe by id
      var supabaseDatasets = await listDatasets();
      var seenIds = new Set((supabaseDatasets || []).map(function(d: any) { return d.id; }));
      // Add in-memory datasets not already in Supabase results
      var memLatest = getLatestFromServerStore();
      if (memLatest && !seenIds.has(memLatest.id)) {
        supabaseDatasets.unshift({
          id: memLatest.id, name: memLatest.name, originalName: memLatest.originalName,
          rowCount: memLatest.rowCount, columns: memLatest.columns, createdAt: memLatest.createdAt,
          semanticRoles: memLatest.semanticRoles || null, platform: memLatest.platform || null,
        });
        seenIds.add(memLatest.id);
      }
      return NextResponse.json({ datasets: supabaseDatasets });
    }

    if (id) {
      // Check in-memory store first (fast path, works within same function instance)
      var memDs = getFromServerStore(id);
      if (memDs) {
        return NextResponse.json({
          id: memDs.id, name: memDs.name, original_name: memDs.originalName,
          columns: memDs.columns, rows: memDs.rows, row_count: memDs.rowCount,
          summary: memDs.summary, created_at: memDs.createdAt, semantic_roles: memDs.semanticRoles || null,
          platform: memDs.platform || null,
        });
      }
      // Fall back to Supabase
      var ds = await getDataset(id);
      if (!ds) return NextResponse.json({ error: "not found" }, { status: 404 });
      return NextResponse.json(ds);
    }

    if (latest === "true") {
      // Check in-memory store first
      var memLatestDs = getLatestFromServerStore();
      if (memLatestDs) {
        return NextResponse.json({
          id: memLatestDs.id, name: memLatestDs.name, original_name: memLatestDs.originalName,
          columns: memLatestDs.columns, rows: memLatestDs.rows, row_count: memLatestDs.rowCount,
          summary: memLatestDs.summary, created_at: memLatestDs.createdAt, semantic_roles: memLatestDs.semanticRoles || null,
          platform: memLatestDs.platform || null,
        });
      }
      var lds = await getLatestDataset();
      if (!lds) return NextResponse.json(null);
      return NextResponse.json(lds);
    }

    return NextResponse.json({ error: "missing param" }, { status: 400 });
  } catch (error) {
    logger.error("GET error", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
