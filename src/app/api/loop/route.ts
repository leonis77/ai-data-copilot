import { NextRequest, NextResponse } from "next/server";
import {
  listAnalysisRuns,
  listDecisions,
  listActionTasksBatch,
  saveExecution,
  updateExecutionStatus,
  saveOutcome,
  listExecutionsBatch,
  listOutcomesBatch,
  updateDecisionStatus,
  updateActionTaskStatus,
  getActionTask,
  getDecision,
  getExecution,
  reconcileDecisionStatus,
  cancelPendingActionTasks,
} from "@/lib/loop/db";
import type { Decision, ActionTask } from "@/lib/loop/types";
import { validateLoopPostAction } from "@/lib/schemas";
import { ApiErrorCode, apiError, zodErrorToDetails } from "@/lib/errors";
import { logger, withRequestId } from "@/lib/logger";
import { readJsonBody } from "@/lib/api-utils";
import { authenticateRequest } from "@/lib/auth";
import { applyRateLimitAsync, rateLimitResponse } from "@/lib/rate-limit";

// ═══ GET /api/loop?datasetId=... ═══

export async function GET(request: NextRequest) {
  const rid = "req_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  let authResult: { ok: boolean; user?: { id: string } } = { ok: false };
  let datasetId: string | null = null;
  try {
    authResult = await authenticateRequest(request.headers.get("authorization"));
    if (!authResult.ok) {
      return NextResponse.json(apiError(ApiErrorCode.AUTH_FAILED, "未授权访问"), { status: 401 });
    }
    const userId = authResult.user!.id;

    const rateResult = await applyRateLimitAsync(request, { strategy: "loop" });
    if (!rateResult.allowed) {
      return rateLimitResponse(rateResult);
    }

    const url = new URL(request.url);
    datasetId = url.searchParams.get("datasetId");
    if (!datasetId) {
      return NextResponse.json({ error: "missing datasetId" }, { status: 400 });
    }

    const runs = await listAnalysisRuns(userId, datasetId, 5);
    const decisions = await listDecisions(userId, datasetId, 5);

    // Batch fetch: collect all IDs first, then query each table once
    const decisionIds = decisions.map(d => d.id);
    const tasksByDecision = await listActionTasksBatch(userId, decisionIds);

    const allTaskIds: string[] = [];
    for (const tasks of Object.values(tasksByDecision)) {
      for (const t of tasks) allTaskIds.push(t.id);
    }
    const executionsByTask = await listExecutionsBatch(userId, allTaskIds);

    const allExecutionIds: string[] = [];
    for (const execs of Object.values(executionsByTask)) {
      for (const e of execs) allExecutionIds.push(e.id);
    }
    const outcomesByExecution = await listOutcomesBatch(userId, allExecutionIds);

    // Assemble response shape matching frontend expectation
    const tasksByDecisionArray = decisions.map(d => {
      const tasks = tasksByDecision[d.id] || [];
      const executions: Record<string, any[]> = {};
      const outcomes: Record<string, any[]> = {};
      for (const t of tasks) {
        const taskExecs = executionsByTask[t.id] || [];
        if (taskExecs.length > 0) executions[t.id] = taskExecs;
        for (const ex of taskExecs) {
          const exOutcomes = outcomesByExecution[ex.id] || [];
          if (exOutcomes.length > 0) outcomes[t.id] = (outcomes[t.id] || []).concat(exOutcomes);
        }
      }
      return { decision: d, actionTasks: tasks, executions, outcomes };
    });

    return NextResponse.json({
      datasetId,
      analysisRuns: runs,
      decisions: tasksByDecisionArray,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error("Loop API GET failed", { requestId: rid, userId: authResult.user?.id, datasetId, message: msg, stack });
    return NextResponse.json(
      { error: msg, recoverable: true },
      { status: 500 }
    );
  }
}

// ═══ POST /api/loop  (execution + outcome + decision status) ═══

export async function POST(request: NextRequest) {
  const rid = "req_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  return withRequestId(rid, async function () {
    // Auth guard
    const authResult = await authenticateRequest(request.headers.get("authorization"));
    if (!authResult.ok) {
      return NextResponse.json(apiError(ApiErrorCode.AUTH_FAILED, "未授权访问，请先登录"), { status: 401 });
    }
    const userId = authResult.user!.id;

    try {
      const raw = await readJsonBody(request);
      if (raw instanceof Response) return raw;
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
        // Pre-check: action_task must exist in DB to satisfy FK constraint
        const task = await getActionTask(userId, body.actionTaskId);
        if (!task) {
          return NextResponse.json(apiError(ApiErrorCode.INVALID_BODY, "actionTask not found: " + body.actionTaskId, { recoverable: true }), { status: 404 });
        }
        const decision = await getDecision(userId, task.decisionId);
        if (!decision) {
          return NextResponse.json(apiError(ApiErrorCode.INVALID_BODY, "decision not found: " + task.decisionId, { recoverable: true }), { status: 404 });
        }
        if (decision.status !== "approved") {
          return NextResponse.json(apiError(ApiErrorCode.INVALID_BODY, "该决策尚未批准，不能开始执行", { recoverable: true, details: { decisionId: decision.id, status: decision.status } }), { status: 409 });
        }
        const existingExecution = await getExecution(userId, body.id);
        if (existingExecution && (existingExecution.actionTaskId !== body.actionTaskId || existingExecution.status !== "running")) {
          return NextResponse.json(apiError(ApiErrorCode.INVALID_BODY, "执行记录 ID 已被其他执行占用", { recoverable: true, details: { executionId: body.id } }), { status: 409 });
        }
        if (task.status === "completed" || task.status === "cancelled") {
          return NextResponse.json(apiError(ApiErrorCode.INVALID_BODY, "该行动任务已经结束，不能重复执行", { recoverable: true, details: { actionTaskId: body.actionTaskId, status: task.status } }), { status: 409 });
        }
        if (task.status === "in_progress") {
          if (existingExecution) return NextResponse.json({ ok: true, executionId: body.id });
          return NextResponse.json(apiError(ApiErrorCode.INVALID_BODY, "该行动任务正在执行，不能重复开始", { recoverable: true, details: { actionTaskId: body.actionTaskId, status: task.status } }), { status: 409 });
        }

        // Claim the task before inserting the execution. This makes the CAS the
        // concurrency gate and prevents losing requests from leaving orphan rows.
        const taskStarted = await updateActionTaskStatus(userId, body.actionTaskId, "in_progress", undefined, "pending");
        if (!taskStarted) {
          const currentTask = await getActionTask(userId, body.actionTaskId);
          const committedExecution = await getExecution(userId, body.id);
          if (currentTask?.status === "in_progress" && committedExecution && committedExecution.actionTaskId === body.actionTaskId && committedExecution.status === "running") {
            return NextResponse.json({ ok: true, executionId: body.id });
          }
          logger.warn("start_execution task claim failed", { requestId: rid, userId, actionTaskId: body.actionTaskId, executionId: body.id });
          return NextResponse.json(apiError(ApiErrorCode.INVALID_BODY, "该行动任务已被其他执行请求占用，请刷新后重试", { recoverable: true, details: { actionTaskId: body.actionTaskId } }), { status: 409 });
        }

        const saved = await saveExecution(userId, {
          id: body.id,
          actionTaskId: body.actionTaskId,
          status: "running",
          executedBy: body.executedBy || undefined,
        });
        if (!saved) {
          // A lost response after insert is recovered by re-reading the row.
          const committedExecution = await getExecution(userId, body.id);
          if (!committedExecution || committedExecution.actionTaskId !== body.actionTaskId || committedExecution.status !== "running") {
            const restored = await updateActionTaskStatus(userId, body.actionTaskId, "pending", undefined, "in_progress");
            logger.warn("start_execution save failed", { requestId: rid, userId, actionTaskId: body.actionTaskId, executionId: body.id, taskRestored: restored });
            return NextResponse.json(apiError(ApiErrorCode.INTERNAL_ERROR, "保存执行记录失败", { recoverable: true, details: { actionTaskId: body.actionTaskId, taskRestored: restored } }), { status: 500 });
          }
        }
        return NextResponse.json({ ok: true, executionId: body.id });
      }

      if (action === "complete_execution") {
        const execution = await getExecution(userId, body.executionId);
        if (!execution) {
          return NextResponse.json(apiError(ApiErrorCode.INVALID_BODY, "execution not found: " + body.executionId, { recoverable: true }), { status: 404 });
        }
        const task = await getActionTask(userId, execution.actionTaskId);
        if (!task) {
          return NextResponse.json(apiError(ApiErrorCode.INVALID_BODY, "action task not found: " + execution.actionTaskId, { recoverable: true }), { status: 404 });
        }
        const requestedTaskStatus = body.status === "completed" ? "completed" : "cancelled";
        if (execution.status !== "running") {
          // Completion is retry-safe after a lost response. If the execution already
          // reached the requested terminal state, repair/reconcile its companion task.
          if (execution.status === body.status && task.status === requestedTaskStatus) {
            if (body.status === "completed" && !await reconcileDecisionStatus(userId, task.decisionId)) {
              return NextResponse.json(apiError(ApiErrorCode.INTERNAL_ERROR, "更新决策状态失败", { recoverable: true, details: { decisionId: task.decisionId } }), { status: 500 });
            }
            return NextResponse.json({ ok: true });
          }
          if (task.status === "in_progress" && execution.status === body.status) {
            const repaired = await updateActionTaskStatus(userId, task.id, requestedTaskStatus, undefined, "in_progress");
            if (!repaired) {
              return NextResponse.json(apiError(ApiErrorCode.INTERNAL_ERROR, "更新行动任务状态失败", { recoverable: true, details: { executionId: body.executionId, taskId: task.id } }), { status: 500 });
            }
            if (body.status === "completed" && !await reconcileDecisionStatus(userId, task.decisionId)) {
              return NextResponse.json(apiError(ApiErrorCode.INTERNAL_ERROR, "更新决策状态失败", { recoverable: true, details: { decisionId: task.decisionId } }), { status: 500 });
            }
            return NextResponse.json({ ok: true });
          }
          return NextResponse.json(apiError(ApiErrorCode.INVALID_BODY, "该执行记录已经结束，不能重复更新", { recoverable: true, details: { executionId: body.executionId, status: execution.status } }), { status: 409 });
        }
        if (task.status !== "in_progress") {
          return NextResponse.json(apiError(ApiErrorCode.INVALID_BODY, "行动任务不在执行中，无法完成该执行", { recoverable: true, details: { taskId: task.id, status: task.status } }), { status: 409 });
        }
        const ok = await updateExecutionStatus(userId, body.executionId, body.status, body.result || null, "running");
        const taskStatus = body.status === "completed" ? "completed" : "cancelled";
        if (!ok) {
          // An acknowledged=false CAS can still have committed. Re-read both
          // records before reporting failure, and repair the missing half without
          // ever moving an already-terminal record backwards.
          const currentExecution = await getExecution(userId, body.executionId);
          const currentTask = await getActionTask(userId, task.id);
          if (currentExecution?.status === body.status && currentTask?.status === taskStatus) {
            if (body.status === "completed" && !await reconcileDecisionStatus(userId, task.decisionId)) {
              return NextResponse.json(apiError(ApiErrorCode.INTERNAL_ERROR, "更新决策状态失败", { recoverable: true, details: { decisionId: task.decisionId } }), { status: 500 });
            }
            return NextResponse.json({ ok: true });
          }
          if (currentExecution?.status === "running" && currentTask?.status === taskStatus) {
            const executionRepaired = await updateExecutionStatus(userId, body.executionId, body.status, body.result || null, "running");
            if (executionRepaired) {
              if (body.status === "completed" && !await reconcileDecisionStatus(userId, task.decisionId)) {
                return NextResponse.json(apiError(ApiErrorCode.INTERNAL_ERROR, "更新决策状态失败", { recoverable: true, details: { decisionId: task.decisionId } }), { status: 500 });
              }
              return NextResponse.json({ ok: true });
            }
          }
          logger.warn("complete_execution update failed", { requestId: rid, userId, executionId: body.executionId });
          return NextResponse.json(apiError(ApiErrorCode.INTERNAL_ERROR, "更新执行状态失败", { recoverable: true, details: { executionId: body.executionId } }), { status: 500 });
        }
        const taskUpdated = await updateActionTaskStatus(userId, task.id, taskStatus, undefined, "in_progress");
        if (!taskUpdated) {
          // Keep terminal execution state monotonic. A false CAS may mean the
          // task update committed but its response was lost; never roll it back.
          const currentExecution = await getExecution(userId, body.executionId);
          const currentTask = await getActionTask(userId, task.id);
          if (currentExecution?.status === body.status && currentTask?.status === taskStatus) {
            if (body.status === "completed" && !await reconcileDecisionStatus(userId, task.decisionId)) {
              return NextResponse.json(apiError(ApiErrorCode.INTERNAL_ERROR, "更新决策状态失败", { recoverable: true, details: { decisionId: task.decisionId } }), { status: 500 });
            }
            return NextResponse.json({ ok: true });
          }
          logger.warn("complete_execution task update failed", { requestId: rid, userId, executionId: body.executionId, taskId: task.id });
          return NextResponse.json(apiError(ApiErrorCode.INTERNAL_ERROR, "更新行动任务状态失败", { recoverable: true, details: { executionId: body.executionId, taskId: task.id, executionState: body.status } }), { status: 500 });
        }
        if (body.status === "completed") {
          const decisionReconciled = await reconcileDecisionStatus(userId, task.decisionId);
          if (!decisionReconciled) {
            logger.warn("complete_execution decision reconciliation failed", { requestId: rid, userId, executionId: body.executionId, decisionId: task.decisionId });
            return NextResponse.json(apiError(ApiErrorCode.INTERNAL_ERROR, "更新决策状态失败", { recoverable: true, details: { decisionId: task.decisionId } }), { status: 500 });
          }
        }
        return NextResponse.json({ ok: true });
      }

      if (action === "save_outcome") {
        var improvement = body.afterValue - body.beforeValue;
        var improvementPercent = body.beforeValue !== 0 ? Math.round((improvement / Math.abs(body.beforeValue)) * 10000) / 100 : 0;
        const ok = await saveOutcome(userId, {
          id: body.id,
          executionId: body.executionId,
          metric: body.metric,
          beforeValue: body.beforeValue,
          afterValue: body.afterValue,
          improvement,
          improvementPercent,
        });
        if (!ok) {
          logger.warn("save_outcome failed", { requestId: rid, userId, executionId: body.executionId, outcomeId: body.id });
          return NextResponse.json(apiError(ApiErrorCode.INTERNAL_ERROR, "保存结果失败", { recoverable: true, details: { executionId: body.executionId } }), { status: 500 });
        }
        return NextResponse.json({ ok: true, outcomeId: body.id });
      }

      if (action === "update_decision_status") {
        if (body.status !== "approved" && body.status !== "rejected") {
          return NextResponse.json(apiError(ApiErrorCode.INVALID_BODY, "决策只能被批准或驳回；完成状态由执行闭环自动维护", { recoverable: true, details: { decisionId: body.decisionId, status: body.status } }), { status: 409 });
        }
        const currentDecision = await getDecision(userId, body.decisionId);
        if (!currentDecision) {
          return NextResponse.json(apiError(ApiErrorCode.INVALID_BODY, "decision not found: " + body.decisionId, { recoverable: true }), { status: 404 });
        }
        if (currentDecision.status === body.status) {
          if (body.status === "rejected") {
            const tasksCancelled = await cancelPendingActionTasks(userId, body.decisionId);
            if (!tasksCancelled) {
              return NextResponse.json(apiError(ApiErrorCode.INTERNAL_ERROR, "取消关联任务失败", { recoverable: true, details: { decisionId: body.decisionId } }), { status: 500 });
            }
          }
          return NextResponse.json({ ok: true, decisionId: body.decisionId, status: body.status });
        }
        if (currentDecision.status !== "pending") {
          return NextResponse.json(apiError(ApiErrorCode.INVALID_BODY, "该决策已处理，不能再次修改", { recoverable: true, details: { decisionId: body.decisionId, status: currentDecision.status } }), { status: 409 });
        }
        const expectedStatus: Decision["status"] = "pending";
        const ok = await updateDecisionStatus(userId, body.decisionId, body.status, body.notes || undefined, expectedStatus);
        if (!ok) {
          const afterRace = await getDecision(userId, body.decisionId);
          if (afterRace?.status === body.status) {
            if (body.status === "rejected") {
              const recovered = await cancelPendingActionTasks(userId, body.decisionId);
              if (!recovered) return NextResponse.json(apiError(ApiErrorCode.INTERNAL_ERROR, "取消关联任务失败", { recoverable: true, details: { decisionId: body.decisionId } }), { status: 500 });
            }
            return NextResponse.json({ ok: true, decisionId: body.decisionId, status: body.status });
          }
          if (afterRace && afterRace.status !== "pending") {
            return NextResponse.json(apiError(ApiErrorCode.INVALID_BODY, "该决策已被其他请求处理", { recoverable: true, details: { decisionId: body.decisionId, status: afterRace.status } }), { status: 409 });
          }
          logger.warn("update_decision_status failed", { requestId: rid, userId, decisionId: body.decisionId });
          return NextResponse.json(apiError(ApiErrorCode.INTERNAL_ERROR, "更新决策状态失败", { recoverable: true, details: { decisionId: body.decisionId } }), { status: 500 });
        }
        if (body.status === "rejected") {
          const tasksCancelled = await cancelPendingActionTasks(userId, body.decisionId);
          if (!tasksCancelled) {
            logger.warn("update_decision_status task cancellation failed", { requestId: rid, userId, decisionId: body.decisionId });
            return NextResponse.json(apiError(ApiErrorCode.INTERNAL_ERROR, "取消关联任务失败", { recoverable: true, details: { decisionId: body.decisionId } }), { status: 500 });
          }
        }
        return NextResponse.json({ ok: true, decisionId: body.decisionId, status: body.status });
      }

      if (action === "update_action_task_status") {
        return NextResponse.json(apiError(ApiErrorCode.INVALID_BODY, "行动任务状态由执行闭环自动维护", { recoverable: true, details: { taskId: body.taskId, status: body.status } }), { status: 409 });
      }

      return NextResponse.json(apiError(ApiErrorCode.INVALID_BODY, "unknown action", { recoverable: true }), { status: 400 });
    } catch (error) {
      logger.error("Loop API failed", { requestId: rid, message: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        apiError(ApiErrorCode.INTERNAL_ERROR, "操作失败，请稍后重试", { recoverable: true }),
        { status: 500 }
      );
    }
  });
}
