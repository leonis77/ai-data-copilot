import { NextRequest, NextResponse } from "next/server";
import { getLatestDataset, getAnalysis } from "@/lib/db";
import { computeStats } from "@/lib/parser";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export async function POST(request: NextRequest) {
  try {
    const ds = getLatestDataset();
    if (!ds) {
      return NextResponse.json({ error: "未找到数据" }, { status: 400 });
    }

    const columns = ds.columns;
    const rows = ds.rows;
    const stats = computeStats(rows, columns);
    const analysis = getAnalysis(ds.id);

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const rowToArray = (row: Record<string, unknown>, cols: string[]) =>
      cols.map((c) => String(row[c] ?? ""));

    // Title page
    doc.setFillColor(11, 15, 23);
    doc.rect(0, 0, 210, 297, "F");

    doc.setTextColor(99, 102, 241);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("AI Data Copilot", 105, 80, { align: "center" });

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("智能数据分析报告", 105, 98, { align: "center" });

    doc.setFontSize(10);
    doc.text(`数据集: ${ds.originalName}`, 105, 120, { align: "center" });
    doc.text(`生成时间: ${new Date().toLocaleString("zh-CN")}`, 105, 130, { align: "center" });
    doc.text(`记录数: ${stats.rowCount} | 字段数: ${stats.columnCount}`, 105, 140, { align: "center" });

    // Page 2: Data Summary
    doc.addPage();
    doc.setFillColor(11, 15, 23);
    doc.rect(0, 0, 210, 297, "F");

    doc.setTextColor(99, 102, 241);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("数据概览", 15, 25);

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    let y = 40;
    for (const [col, s] of Object.entries(stats.stats)) {
      doc.text(
        `${col}: 平均 ${s.avg.toFixed(2)}, 最小 ${s.min}, 最大 ${s.max}, 总计 ${s.sum.toFixed(2)}`,
        15, y
      );
      y += 8;
    }

    // Page 3: AI Analysis
    if (analysis) {
      doc.addPage();
      doc.setFillColor(11, 15, 23);
      doc.rect(0, 0, 210, 297, "F");

      doc.setTextColor(99, 102, 241);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("AI 分析", 15, 25);

      doc.setTextColor(148, 163, 184);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");

      y = 40;
      doc.setFont("helvetica", "bold");
      doc.text("总结", 15, y);
      doc.setFont("helvetica", "normal");
      y += 10;

      const summaryLines = doc.splitTextToSize(analysis.summary || "", 180);
      for (const line of summaryLines) {
        doc.text(line, 15, y);
        y += 7;
        if (y > 280) { doc.addPage(); y = 25; }
      }

      y += 8;
      const insights = JSON.parse(analysis.insights || "[]");
      if (insights.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("洞察", 15, y);
        doc.setFont("helvetica", "normal");
        y += 10;
        for (const insight of insights) {
          doc.text(`\u2022 ${insight}`, 20, y);
          y += 7;
        }
      }

      y += 5;
      const risks = JSON.parse(analysis.risks || "[]");
      if (risks.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("风险", 15, y);
        doc.setFont("helvetica", "normal");
        y += 10;
        for (const risk of risks) {
          doc.text(`\u2022 ${risk}`, 20, y);
          y += 7;
        }
      }

      y += 5;
      const suggestions = JSON.parse(analysis.suggestions || "[]");
      if (suggestions.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("建议", 15, y);
        doc.setFont("helvetica", "normal");
        y += 10;
        for (const suggestion of suggestions) {
          doc.text(`\u2022 ${suggestion}`, 20, y);
          y += 7;
        }
      }
    }

    // Page 4+: Data Table (first 50 rows)
    doc.addPage();
    doc.setFillColor(11, 15, 23);
    doc.rect(0, 0, 210, 297, "F");

    doc.setTextColor(99, 102, 241);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("数据明细（前50条）", 15, 25);

    const displayRows = rows.slice(0, 50);
    const tableData = displayRows.map((row) => rowToArray(row, columns));

    (doc as any).autoTable({
      startY: 35,
      head: [columns],
      body: tableData,
      theme: "grid",
      styles: {
        fontSize: 7,
        cellPadding: 2,
        textColor: [148, 163, 184],
        fillColor: [17, 24, 39],
        lineColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [99, 102, 241],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [20, 28, 44],
      },
    });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="AI_Data_Copilot_Report_${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json({ error: "生成报告失败" }, { status: 500 });
  }
}