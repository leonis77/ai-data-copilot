import { NextRequest, NextResponse } from "next/server";

// PDF generation is now handled client-side via html2pdf.js
// This route is kept for potential future server-side generation needs
export async function POST(request: NextRequest) {
  return NextResponse.json({ message: "PDF generation moved to client-side" });
}