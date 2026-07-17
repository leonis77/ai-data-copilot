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
} from "@/lib/loop/db";

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

// ═══ POST /api/loop  (execution + outcome) ═══

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(function () { return null; });
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }

    var action = String(body.action || "");
    if (action === "start_execution") {
      var id = String(body.id || "");
      var actionTaskId = String(body.actionTaskId || "");
      if (!id || !actionTaskId) {
        return NextResponse.json({ error: "id and actionTaskId required" }, { status: 400 });
      }
      await saveExecution({
        id,
        actionTaskId,
        status: "running",
        executedBy: body.executedBy || undefined,
      });
      return NextResponse.json({ ok: true, executionId: id });
    }

    if (action === "complete_execution") {
      var executionId = String(body.executionId || "");
      var status = String(body.status || "completed");
      if (!executionId) {
        return NextResponse.json({ error: "executionId required" }, { status: 400 });
      }
      await updateExecutionStatus(executionId, status as any, body.result || null);
      return NextResponse.json({ ok: true });
    }

    if (action === "save_outcome") {
      var outcomeId = String(body.id || "");
      var executionId2 = String(body.executionId || "");
      var metric = String(body.metric || "");
      var beforeValue = Number(body.beforeValue || 0);
      var afterValue = Number(body.afterValue || 0);
      if (!outcomeId || !executionId2 || !metric) {
        return NextResponse.json({ error: "id, executionId, metric required" }, { status: 400 });
      }
      var improvement = afterValue - beforeValue;
      var improvementPercent = beforeValue !== 0 ? Math.round((improvement / Math.abs(beforeValue)) * 10000) / 100 : 0;
      await saveOutcome({
        id: outcomeId,
        executionId: executionId2,
        metric,
        beforeValue,
        afterValue,
        improvement,
        improvementPercent,
      });
      return NextResponse.json({ ok: true, outcomeId: outcomeId });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
