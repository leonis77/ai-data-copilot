import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// Lightweight observability endpoint for frontend metrics/log shipping.
// Accepts JSON body: { events: MetricEvent[] }
// No auth required in this phase; metrics are non-sensitive operational data.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(function () { return null; });
    if (!body || !Array.isArray((body as any).events)) {
      return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
    }
    const events = (body as any).events as Array<Record<string, unknown>>;
    const counts = { page_view: 0, api_call: 0, pipeline_result: 0, user_action: 0, error: 0, performance: 0 };
    for (const ev of events) {
      const type = String(ev.type || "");
      if (type in counts) counts[type as keyof typeof counts]++;
      logger.debug("frontend.metric", {
        type,
        name: ev.name,
        value: ev.value,
        tags: ev.tags,
        sessionId: ev.sessionId,
        timestamp: ev.timestamp,
      });
    }
    return NextResponse.json({ ok: true, received: events.length, counts });
  } catch (e) {
    logger.warn("observability ingest failed", { message: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ ok: false, error: "ingest failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, status: "observability endpoint active" });
}
