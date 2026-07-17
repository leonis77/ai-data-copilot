import { NextRequest, NextResponse } from "next/server";
import { logger, withRequestId } from "@/lib/logger";
import { ApiErrorCode, apiError } from "@/lib/errors";
import { z } from "zod";

const MetricEventSchema = z.object({
  type: z.string().min(1),
  name: z.string().optional(),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  tags: z.record(z.string(), z.unknown()).optional(),
  sessionId: z.string().optional(),
  timestamp: z.string().optional(),
});

const ObservabilityIngestSchema = z.object({
  events: z.array(MetricEventSchema).min(1).max(100),
});

export type MetricEvent = z.infer<typeof MetricEventSchema>;

export async function POST(request: NextRequest) {
  const rid = "req_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  return withRequestId(rid, async function () {
    try {
      const raw = await request.json().catch(function () { return null; });
      if (!raw || typeof raw !== "object") {
        return NextResponse.json(apiError(ApiErrorCode.INVALID_BODY, "请求体必须是 JSON 对象", { recoverable: true }), { status: 400 });
      }

      let parsed: { events: MetricEvent[] };
      try {
        parsed = ObservabilityIngestSchema.parse(raw);
      } catch (e: any) {
        return NextResponse.json(apiError(ApiErrorCode.VALIDATION_FAILED, e?.message || "参数校验失败", { recoverable: true, details: e?.issues }), { status: 400 });
      }

      const counts = { page_view: 0, api_call: 0, pipeline_result: 0, user_action: 0, error: 0, performance: 0 };
      for (const ev of parsed.events) {
        const type = ev.type || "";
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
      return NextResponse.json({ ok: true, received: parsed.events.length, counts });
    } catch (e) {
      logger.warn("observability ingest failed", { requestId: rid, message: e instanceof Error ? e.message : String(e) });
      return NextResponse.json(
        apiError(ApiErrorCode.INTERNAL_ERROR, "ingest failed", { recoverable: true }),
        { status: 500 }
      );
    }
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, status: "observability endpoint active" });
}
