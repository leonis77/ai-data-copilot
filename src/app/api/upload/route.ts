import { NextRequest, NextResponse } from "next/server";
import { parseFile } from "@/lib/parser";
import { saveDataset, getLatestDataset, getDataset } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileData } = await request.json();

    if (!fileName || !fileData) {
      return NextResponse.json({ error: "缺少文件名或数据" }, { status: 400 });
    }

    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") {
      return NextResponse.json({ error: "不支持的格式，请上传 .xlsx / .xls / .csv 文件" }, { status: 400 });
    }

    const buffer = Buffer.from(fileData, "base64");
    const parsed = parseFile(new Uint8Array(buffer), fileName);

    const id = `ds_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await saveDataset({
      id,
      name: `dataset_${Date.now()}`,
      originalName: fileName,
      columns: parsed.columns,
      rows: parsed.rows,
      summary: parsed.summary,
    });

    return NextResponse.json({
      id,
      columns: parsed.columns,
      rowCount: parsed.rowCount,
      summary: parsed.summary,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "解析失败" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latest = searchParams.get("latest");
    const id = searchParams.get("id");

    if (id) {
      const ds = getDataset(id);
      if (!ds) return NextResponse.json({ error: "数据集不存在" }, { status: 404 });
      return NextResponse.json(ds);
    }

    if (latest === "true") {
      const ds = await getLatestDataset();
      if (!ds) return NextResponse.json(null);
      const full = await getDataset(ds.id as string);
      return NextResponse.json(full);
    }

    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  } catch (error) {
    console.error("Get data error:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
