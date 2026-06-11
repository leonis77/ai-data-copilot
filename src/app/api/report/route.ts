export const dynamic = "force-static";
import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const columns = body.columns || [];
    const rows = body.rows || [];
    const analysis = body.analysis || null;
    const datasetName = body.datasetName || "数据集";

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Cover page
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
    doc.text(`数据集: ${datasetName}`, 105, 120, { align: "center" });
    doc.text(`生成时间: ${new Date().toLocaleString("zh-CN")}`, 105, 130, { align: "center" });
    doc.text(`记录数: ${rows.length} | 字段数: ${columns.length}`, 105, 140, { align: "center" });

    // Page 2: Data preview (first 50 rows)
    doc.addPage();
    doc.setFillColor(11, 15, 23);
    doc.rect(0, 0, 210, 297, "F");

    doc.setTextColor(99, 102, 241);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("数据明细（前50条）", 15, 25);

    const displayRows = rows.slice(0, 50).map((row: Record<string, unknown>) =>
      columns.map((c: string) => String(row[c] ?? ""))
    );

    (doc as any).autoTable({
      startY: 35,
      head: [columns],
      body: displayRows,
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
      alternateRowStyles: { fillColor: [20, 28, 44] },
    });

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

      let y = 40;
      const a = analysis as Record<string, unknown>;

      if (a.summary) {
        doc.setFont("helvetica", "bold");
        doc.text("总结", 15, y);
        doc.setFont("helvetica", "normal");
        y += 10;
        const lines = doc.splitTextToSize(a.summary as string, 180);
        for (const line of lines) { doc.text(line, 15, y); y += 7; }
        y += 5;
      }

      const sections = [
        { title: "洞察", key: "insights" },
        { title: "风险", key: "risks" },
        { title: "建议", key: "suggestions" },
      ];

      for (const sec of sections) {
        const items = a[sec.key];
        if (Array.isArray(items) && items.length > 0) {
          doc.setFont("helvetica", "bold");
          doc.text(sec.title, 15, y);
          doc.setFont("helvetica", "normal");
          y += 10;
          for (const item of items) {
            doc.text(`\u2022 ${item}`, 20, y);
            y += 7;
          }
          y += 3;
        }
      }
    }

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