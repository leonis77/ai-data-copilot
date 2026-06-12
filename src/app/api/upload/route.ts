import { NextRequest, NextResponse } from "next/server";
import { parseFile } from "@/lib/parser";
import { saveDataset, getLatestDataset, getDataset, listDatasets, deleteDataset } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileData } = await request.json();
    if (!fileName || !fileData) return NextResponse.json({ error: "missing file" }, { status: 400 });
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") return NextResponse.json({ error: "unsupported format" }, { status: 400 });
    const buffer = Buffer.from(fileData, "base64");
    const parsed = parseFile(new Uint8Array(buffer), fileName);
    // Ensure Chinese characters are correctly decoded
    parsed.rows = parsed.rows.map(function(row: any): any {
      var fixed: any = {};
      for (var k in row) {
        var v = row[k];
        if (typeof v === "string" && v.length > 0 && !/[一-鿿]/.test(v)) {
          try { var d = Buffer.from(v, "latin1").toString("utf8"); if (/[一-鿿]/.test(d)) v = d; } catch (e) {}
        }
        fixed[k] = v;
      }
      return fixed;
    });
    const id = "ds_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    await saveDataset({ id, name: "dataset_" + Date.now(), originalName: fileName, columns: parsed.columns, rows: parsed.rows, summary: parsed.summary });
    var fr = parsed.rows.map(function(row: Record<string, unknown>): Record<string, unknown> {
      var o: Record<string, unknown> = {};
      for (var k in row) { var v: unknown = row[k]; o[k] = v; }
      return o;
    });
    return NextResponse.json({ id, columns: parsed.columns, rows: fr, rowCount: parsed.rowCount, summary: parsed.summary });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "parse failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    var { searchParams } = new URL(request.url);
    var id = searchParams.get("id");
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
