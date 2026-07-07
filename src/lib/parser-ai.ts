import { getClient, withRetry } from "@/lib/agent/llm";
import { logger } from "@/lib/logger";

export interface AIStructure {
  headerRow: number;
  skipRows: number[];
  columnTypes: Record<string, "number" | "date" | "category" | "text" | "id">;
  confidence: number;
}

/*
 * Send a lightweight preview of sheet data to DeepSeek
 * AI returns the exact header row and column types
 */
export async function analyzeSheetStructure(
  sheetName: string,
  preview: string[][],
  mergeInfo: string[],
  totalRows: number
): Promise<AIStructure | null> {
  if (!process.env.DEEPSEEK_API_KEY) {
    logger.info("No DeepSeek key, skipping AI structure analysis");
    return null;
  }

  var prompt = "You are an Excel structure analyzer. Given a preview of the first 10 rows of a spreadsheet, identify the header row and column types.\n\n";
  prompt += "Sheet name: " + sheetName + "\n";
  prompt += "Total rows: " + totalRows + "\n";
  if (mergeInfo.length > 0) prompt += "Merged cells: " + mergeInfo.join("; ") + "\n";
  prompt += "\nPreview (first 10 rows):\n";
  for (var i = 0; i < preview.length; i++) {
    prompt += "Row " + i + ": " + JSON.stringify(preview[i].filter(function(c) { return c !== ""; })) + "\n";
  }
  prompt += "\nOutput JSON ONLY: {\"headerRow\":<number>,\"skipRows\":[<numbers>],\"columnTypes\":{\"<col>\":\"number|date|category|text|id\"},\"confidence\":<0-1>}\n";
  prompt += "Rules: headerRow is the row with column names. skipRows are annotation rows to skip BEFORE the header. columnTypes map column name to its type.";

  try {
    var client = getClient();
    var res = await withRetry(function() {
      return client.chat.completions.create({
        model: "deepseek-v4-flash",
        messages: [{ role: "system", content: "You are an Excel structure analyzer. Output JSON only, no explanation." }, { role: "user", content: prompt }],
        temperature: 0, max_tokens: 500,
      });
    }, 1, "parser-ai");

    var text = res.choices[0]?.message?.content || "";
    var cleaned = text.replace(/```json|```/g, "").trim();
    var result = JSON.parse(cleaned);

    if (typeof result.headerRow === "number" && result.columnTypes) {
      logger.info("AI structure analysis success", { sheetName: sheetName, headerRow: result.headerRow, confidence: result.confidence });
      return {
        headerRow: result.headerRow,
        skipRows: Array.isArray(result.skipRows) ? result.skipRows : [],
        columnTypes: result.columnTypes,
        confidence: typeof result.confidence === "number" ? result.confidence : 0.8,
      };
    }
    return null;
  } catch (e) {
    logger.warn("AI structure analysis failed, will use rule engine", { message: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

/*
 * Extract a lightweight text preview from a sheet (no smart parsing)
 * Returns: 2D string array of first 10 rows x 10 cols
 * Also returns merge cell info for the AI context
 */
export function previewSheet(
  sheetData: Record<string, any>[],
  sheetName: string,
  rawSheet: any,
  range: any
): { preview: string[][]; mergeInfo: string[]; totalRows: number } {
  var preview: string[][] = [];
  var mergeInfo: string[] = [];

  // Extract merge cell info
  var merges = rawSheet["!merges"] || [];
  for (var i = 0; i < merges.length; i++) {
    var m = merges[i];
    var cell = rawSheet[["A","B","C","D","E","F","G","H","I","J"][m.s.c] + (m.s.r + 1)] || rawSheet[Object.keys(rawSheet).find(function(k) { return k !== "!ref" && k !== "!merges"; }) || ""];
    var val = cell ? String(cell.v || "").substring(0, 40) : "?";
    mergeInfo.push("(" + m.s.r + "," + m.s.c + ")->(" + m.e.r + "," + m.e.c + "): " + val);
  }

  // Extract first 10 rows as text
  for (var r = range.s.r; r <= Math.min(range.s.r + 9, range.e.r); r++) {
    var row: string[] = [];
    for (var c = range.s.c; c <= Math.min(range.s.c + 9, range.e.c); c++) {
      var cl = rawSheet[XLSX_enc(r, c)];
      row.push(cl && cl.v !== undefined && cl.v !== null ? String(cl.v).substring(0, 50).trim() : "");
    }
    preview.push(row);
  }

  return { preview: preview, mergeInfo: mergeInfo, totalRows: range.e.r - range.s.r };
}

// Helper: encode cell reference for xlsx library
function XLSX_enc(r: number, c: number): string {
  var col = String.fromCharCode(65 + c);
  return col + (r + 1);
}
