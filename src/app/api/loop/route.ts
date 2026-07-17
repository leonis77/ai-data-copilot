import { NextRequest, NextResponse } from "next/server";
import {
  listAnalysisRuns,
  listDecisions,
  listActionTasks,
  saveExecution,
  updateExecutionStatus,
  saveOutcome,
  listOutcomes,
  listExecutions,
  updateDecisionStatus,
  updateActionTaskStatus,
} from "@/lib/loop/db";
import type { Decision, ActionTask } from "@/lib/loop/types";
import { validateLoopPostAction } from "@/lib/schemas";
import { ApiErrorCode, apiError, zodErrorToDetails } from "@/lib/errors";
import { logger, withRequestId } from "@/lib/logger";

// ═══ GET /api/loop?datasetId=... ═══

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const datasetId = url.searchParams.get("datasetId");
    if (!datasetId) {
      return NextResponse.json({ error: "missing datasetId" }, { status: 400 });
    }

    const runs = await listAnalysisRuns(datasetId, 5);
    const decisions = await listDecisions(datasetId, 5);
    const tasksByDecision: Array<{
      decision: any;
      actionTasks: any[];
      executions?: Record<string, any[]>;
      outcomes?: Record<string, any[]>;
    }> = [];
    for (const d of decisions) {
      const tasks = await listActionTasks(d.id);
      const executions: Record<string, any[]> = {};
      const outcomes: Record<string, any[]> = {};
      for (const t of tasks) {
        const exes = await listExecutions(t.id);
        if (exes.length > 0) {
          executions[t.id] = exes;
          // Fetch outcomes for the latest execution
          const outs = await listOutcomes(exes[0].id);
          if (outs.length > 0) outcomes[t.id] = outs;
        }
      }
      tasksByDecision.push({ decision: d, actionTasks: tasks, executions, outcomes });
    }

    return NextResponse.json({
      datasetId,
      analysisRuns: runs,
      decisions: tasksByDecision,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ═══ POST /api/loop  (execution + outcome + decision status) ═══

export async function POST(request: NextRequest) {
  const rid = "req_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  return withRequestId(rid, async function () {
    try {
      const raw = await request.json().catch(function () { return null; });
      if (!raw || typeof raw !== "object") {
        return NextResponse.json(apiError(ApiErrorCode.INVALID_BODY, "请求体必须是 JSON 对象", { recoverable: true }), { status: 400 });
      }

      let body: any;
      try {
        body = validateLoopPostAction(raw);
      } catch (e: any) {
        return NextResponse.json(apiError(ApiErrorCode.VALIDATION_FAILED, e?.message || "参数校验失败", { recoverable: true, details: zodErrorToDetails(e) }), { status: 400 });
      }

      var action = body.action;

      if (action === "start_execution") {
        await saveExecution({
          id: body.id,
          actionTaskId: body.actionTaskId,
          status: "running",
          executedBy: body.executedBy || undefined,
        });
        return NextResponse.json({ ok: true, executionId: body.id });
      }

      if (action === "complete_execution") {
        await updateExecutionStatus(body.executionId, body.status, body.result || null);
        return NextResponse.json({ ok: true });
      }

      if (action === "save_outcome") {
        var improvement = body.afterValue - body.beforeValue;
        var improvementPercent = body.beforeValue !== 0 ? Math.round((improvement / Math.abs(body.beforeValue)) * 10000) / 100 : 0;
        await saveOutcome({
          id: body.id,
          executionId: body.executionId,
          metric: body.metric,
          beforeValue: body.beforeValue,
          afterValue: body.afterValue,
          improvement,
          improvementPercent,
        });
        return NextResponse.json({ ok: true, outcomeId: body.id });
      }

      if (action === "update_decision_status") {
        await updateDecisionStatus(body.decisionId, body.status, body.notes || undefined);
        return NextResponse.json({ ok: true, decisionId: body.decisionId, status: body.status });
      }

      if (action === "update_action_task_status") {
        await updateActionTaskStatus(body.taskId, body.status, body.notes || undefined);
        return NextResponse.json({ ok: true, taskId: body.taskId, status: body.status });
      }

      return NextResponse.json(apiError(ApiErrorCode.INVALID_BODY, "unknown action", { recoverable: true }), { status: 400 });
    } catch (error) {
      logger.error("Loop API failed", { requestId: rid, message: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        apiError(ApiErrorCode.INTERNAL_ERROR, error instanceof Error ? error.message : "loop failed", { recoverable: true }),
        { status: 500 }
      );
    }
  });
}
