import { NextRequest, NextResponse } from "next/server";
import { parseFile } from "@/lib/parser";
import { saveDataset, getLatestDataset, getDataset, listDatasets } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileData } = await request.json();
    if (!fileName || !fileData) return NextResponse.json({ error: "missing file" }, { status: 400 });
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") return NextResponse.json({ error: "unsupported format" }, { status: 400 });
    const buffer = Buffer.from(fileData, "base64");
    const parsed = parseFile(new Uint8Array(buffer), fileName);
    const id = "ds_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    await saveDataset({ id, name: "dataset_" + Date.now(), originalName: fileName, columns: parsed.columns, rows: parsed.rows, summary: parsed.summary });
    return NextResponse.json({ id, columns: parsed.columns, rows: parsed.rows, rowCount: parsed.rowCount, summary: parsed.summary });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "parse failed" }, { status: 500 });
  }
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
