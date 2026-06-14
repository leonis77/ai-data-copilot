import { NextRequest, NextResponse } from "next/server";
import { parseFile } from "@/lib/parser";
import { logger } from "@/lib/logger";
import { saveDataset, getLatestDataset, getDataset, listDatasets, deleteDataset } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileData, sheetName } = await request.json();
    if (!fileName || !fileData) return NextResponse.json({ error: "missing file" }, { status: 400 });
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") return NextResponse.json({ error: "unsupported format" }, { status: 400 });
    if (fileData.length > 70 * 1024 * 1024) return NextResponse.json({ error: "file too large (max 50MB)" }, { status: 413 });
    const buffer = Buffer.from(fileData, "base64");
    const parsed = parseFile(new Uint8Array(buffer), fileName, sheetName);

    const id = "ds_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    const saveRows = parsed.rows.slice(0, 500);
    try {
      await saveDataset({ id, name: "dataset_" + Date.now(), originalName: fileName, columns: parsed.columns, rows: saveRows, summary: parsed.summary });
    } catch (dbError: any) {
      logger.error("Supabase save failed, returning data-only", { message: dbError.message });
    }
    return NextResponse.json({ id, columns: parsed.columns, rows: parsed.rows, rowCount: parsed.rowCount, summary: parsed.summary, sheets: (parsed as any).sheets || null });
  } catch (error) {
    logger.error("Upload failed", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: error instanceof Error ? error.message : "parse failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
    await deleteDataset(id);
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: "delete failed" }, { status: 500 }); }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const latest = searchParams.get("latest");
    const list = searchParams.get("list");
    if (list === "true") {
      const datasets = await listDatasets();
      return NextResponse.json({ datasets });
    }
    if (id) {
      const ds = await getDataset(id);
      if (!ds) return NextResponse.json({ error: "not found" }, { status: 404 });
      return NextResponse.json(ds);
    }
    if (latest === "true") {
      const ds = await getLatestDataset();
      if (!ds) return NextResponse.json(null);
      return NextResponse.json(ds);
    }
    return NextResponse.json({ error: "missing param" }, { status: 400 });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
