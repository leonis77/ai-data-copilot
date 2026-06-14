import { NextRequest, NextResponse } from "next/server";
import { getDataset } from "@/lib/db";
import { computeStats } from "@/lib/parser";
import { logger } from "@/lib/logger";
import { routeAgent } from "@/lib/agent";
import { injectKnowledge } from "@/lib/rag";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = body.input || "";
    const datasetId = body.datasetId || "";

    const ds = await getDataset(datasetId);
    if (!ds) return NextResponse.json({ error: "dataset not found" }, { status: 400 });

    const cols: string[] = Array.isArray(ds.columns) ? ds.columns : JSON.parse(ds.columns as string);
    const rows: any[] = Array.isArray(ds.rows) ? ds.rows : [];
    const stats = computeStats(rows, cols);

    let dataSummary = "Dataset: " + (ds.original_name || "") + "\n";
    dataSummary += "Rows: " + rows.length + ", Cols: " + cols.length + "\n";
    dataSummary += "All columns: " + cols.join(", ") + "\n";

    const numericStats = Object.entries(stats.stats).slice(0, 8);
    if (numericStats.length > 0) {
      dataSummary += "\nNumeric stats:\n";
      for (const [col, s] of numericStats) {
        dataSummary += "  " + col + " - avg: " + (s as any).avg.toFixed(2) + ", min: " + (s as any).min + ", max: " + (s as any).max + "\n";
      }
    }

    const distKeys = Object.keys(stats.distributions).slice(0, 4);
    if (distKeys.length > 0) {
      dataSummary += "\nDistribution:\n";
      for (const dk of distKeys) {
        const top5 = Object.entries(stats.distributions[dk]).slice(0, 5)
          .map(([k, v]) => k + "(" + v + ")").join(", ");
        dataSummary += "  " + dk + ": " + top5 + "\n";
      }
    }

    if (rows.length > 0) {
      const sample = rows.slice(0, 3);
      dataSummary += "\nSample rows: " + JSON.stringify(sample).substring(0, 800);
    }

    // E-commerce context detection - use only ASCII patterns
    const hasAmount = cols.some((c: string) => /amount|price|pay|total|money|sum|payment|revenue/i.test(c));
    const hasTime = cols.some((c: string) => /time|date|order|create|timestamp|day|month/i.test(c));
    const hasProduct = cols.some((c: string) => /product|name|title|item|goods|sku|desc/i.test(c));

    let ecomCtx = "";
    if (hasAmount && hasTime && hasProduct) {
      ecomCtx = "[E-commerce Order Data] You are analyzing e-commerce order data. Focus on: sales trends, best-selling products, average order value, refund anomalies, product concentration. Provide business-valuable analysis.\n\n";
    }

    const ctx = {
      dataSummary: ecomCtx + dataSummary,
      columns: cols,
      rowCount: rows.length,
      stats: stats,
      datasetName: ds.original_name || ds.name || "Unnamed Dataset",
    };

    let enrichedInput = input;
    try {
      const ragContext = await injectKnowledge(input, dataSummary);
      if (ragContext) {
        enrichedInput = input + "\n\n[E-commerce Reference Knowledge]\n" + ragContext;
      }
    } catch(e) { logger.warn("RAG inject failed, continuing", { message: e instanceof Error ? e.message : String(e) }); }

    const result = await routeAgent(enrichedInput || "Please analyze this data", ctx);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Agent API failed", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "agent failed" }, { status: 500 });
  }
}
