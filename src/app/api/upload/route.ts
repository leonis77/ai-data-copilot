import { NextRequest, NextResponse } from "next/server";
import { parseFile } from "@/lib/parser";
import { saveDataset, getLatestDataset, getDataset, listDatasets, deleteDataset } from "@/lib/db";

function fixEncoding(value: unknown): unknown {
  // Force to string
  if (value === null || value === undefined) return value;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value;
  const val = String(value);
  if (!val) return val;
  // Already has CJK?
  for (let i = 0; i < val.length; i++) {
    const c = val.charCodeAt(i);
    if ((c >= 0x4E00 && c <= 0x9FFF) || (c >= 0x3400 && c <= 0x4DBF)) return val;
  }
  // Multi-pass decode
  let current = val;
  for (let p = 0; p < 5; p++) {
    try {
      const bytes = Buffer.from(current, "latin1");
      const next = bytes.toString("utf8");
      if (next === current) break;
      for (let i = 0; i < next.length; i++) {
        const c = next.charCodeAt(i);
        if ((c >= 0x4E00 && c <= 0x9FFF)) return next;
      }
      current = next;
    } catch(e) { break; }
  }
  return val;
}

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileData, sheetName } = await request.json();
    if (!fileName || !fileData) return NextResponse.json({ error: "missing file" }, { status: 400 });
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") return NextResponse.json({ error: "unsupported format" }, { status: 400 });
    const buffer = Buffer.from(fileData, "base64");
    const parsed = parseFile(new Uint8Array(buffer), fileName, sheetName);

    // Fix encoding: JSON roundtrip with replacer
    const fixedRows = JSON.parse(JSON.stringify(parsed.rows, function(key, value) {
      return fixEncoding(value);
    }));

    const id = "ds_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    await saveDataset({ id, name: "dataset_" + Date.now(), originalName: fileName, columns: parsed.columns, rows: fixedRows, summary: parsed.summary });
    return NextResponse.json({ id, columns: parsed.columns, rows: fixedRows, rowCount: parsed.rowCount, summary: parsed.summary, sheets: (parsed as any).sheets || null });
  } catch (error) {
    console.error("Upload error:", error);
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
