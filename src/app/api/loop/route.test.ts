import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuthenticateRequest = vi.hoisted(() => vi.fn());
const mockGetActionTask = vi.hoisted(() => vi.fn());
const mockGetDecision = vi.hoisted(() => vi.fn());
const mockGetExecution = vi.hoisted(() => vi.fn());
const mockSaveExecution = vi.hoisted(() => vi.fn());
const mockUpdateExecutionStatus = vi.hoisted(() => vi.fn());
const mockUpdateActionTaskStatus = vi.hoisted(() => vi.fn());
const mockUpdateDecisionStatus = vi.hoisted(() => vi.fn());
const mockCancelPendingActionTasks = vi.hoisted(() => vi.fn());
const mockReconcileDecisionStatus = vi.hoisted(() => vi.fn());
const mockSaveOutcome = vi.hoisted(() => vi.fn());
const mockValidateLoopPostAction = vi.hoisted(() => vi.fn((raw: any) => raw));

vi.mock("@/lib/auth", () => ({
  authenticateRequest: mockAuthenticateRequest,
}));

vi.mock("@/lib/rate-limit", () => ({
  applyRateLimitAsync: vi.fn(() => Promise.resolve({ allowed: true })),
  rateLimitResponse: vi.fn(),
}));

vi.mock("@/lib/api-utils", () => ({
  readJsonBody: vi.fn((request: any) => request.body),
}));

vi.mock("@/lib/schemas", () => ({
  validateLoopPostAction: mockValidateLoopPostAction,
}));

vi.mock("@/lib/errors", () => ({
  ApiErrorCode: {
    AUTH_FAILED: "AUTH_FAILED",
    INVALID_BODY: "INVALID_BODY",
    VALIDATION_FAILED: "VALIDATION_FAILED",
    INTERNAL_ERROR: "INTERNAL_ERROR",
  },
  apiError: (code: string, message: string, details?: unknown) => ({
    error: { code, message, details },
  }),
  zodErrorToDetails: vi.fn(() => []),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
  withRequestId: vi.fn((_id: string, handler: () => Promise<Response>) => handler()),
}));

vi.mock("@/lib/loop/db", () => ({
  listAnalysisRuns: vi.fn(),
  listDecisions: vi.fn(),
  listActionTasksBatch: vi.fn(),
  listExecutionsBatch: vi.fn(),
  listOutcomesBatch: vi.fn(),
  getActionTask: mockGetActionTask,
  getDecision: mockGetDecision,
  getExecution: mockGetExecution,
  saveExecution: mockSaveExecution,
  updateExecutionStatus: mockUpdateExecutionStatus,
  updateActionTaskStatus: mockUpdateActionTaskStatus,
  updateDecisionStatus: mockUpdateDecisionStatus,
  cancelPendingActionTasks: mockCancelPendingActionTasks,
  reconcileDecisionStatus: mockReconcileDecisionStatus,
  saveOutcome: mockSaveOutcome,
}));

import { POST } from "@/app/api/loop/route";

function makeRequest(body: Record<string, unknown>) {
  return {
    body,
    headers: { get: vi.fn(() => "Bearer test-token") },
  } as any;
}

describe("POST /api/loop — execution state machine", () => {
  beforeEach(() => {
    mockAuthenticateRequest.mockReset();
    mockAuthenticateRequest.mockReturnValue({ ok: true, user: { id: "user-1" } });
    mockValidateLoopPostAction.mockImplementation((raw: any) => raw);
    mockGetActionTask.mockReset();
    mockGetDecision.mockReset();
    mockGetExecution.mockReset();
    mockGetExecution.mockResolvedValue(null);
    mockSaveExecution.mockReset();
    mockUpdateExecutionStatus.mockReset();
    mockUpdateActionTaskStatus.mockReset();
    mockUpdateDecisionStatus.mockReset();
    mockCancelPendingActionTasks.mockReset();
    mockReconcileDecisionStatus.mockReset();
    mockSaveOutcome.mockReset();
    mockGetActionTask.mockResolvedValue({ id: "task-1", decisionId: "decision-1", status: "pending" });
    mockGetDecision.mockResolvedValue({ id: "decision-1", status: "approved" });
    mockGetExecution.mockResolvedValue({ id: "exec-1", actionTaskId: "task-1", status: "running", result: null, executedAt: "" });
    mockSaveExecution.mockResolvedValue(true);
    mockUpdateExecutionStatus.mockResolvedValue(true);
    mockUpdateActionTaskStatus.mockResolvedValue(true);
    mockUpdateDecisionStatus.mockResolvedValue(true);
    mockCancelPendingActionTasks.mockResolvedValue(true);
    mockReconcileDecisionStatus.mockResolvedValue(true);
    mockSaveOutcome.mockResolvedValue(true);
  });

  it("starts an execution and advances its task to in_progress", async () => {
    mockGetExecution.mockResolvedValue(null);
    const response = await POST(makeRequest({
      action: "start_execution",
      id: "exec-1",
      actionTaskId: "task-1",
      executedBy: "user",
    }));

    expect(response.status).toBe(200);
    expect(mockSaveExecution).toHaveBeenCalledWith("user-1", expect.objectContaining({
      id: "exec-1",
      actionTaskId: "task-1",
      status: "running",
    }));
    expect(mockUpdateActionTaskStatus).toHaveBeenCalledWith("user-1", "task-1", "in_progress", undefined, "pending");
  });

  it("completes execution, advances the task, and reconciles its decision", async () => {
    mockGetExecution.mockResolvedValue({ id: "exec-1", actionTaskId: "task-1", status: "running", result: null, executedAt: "" });
    mockGetActionTask.mockResolvedValue({ id: "task-1", decisionId: "decision-1", status: "in_progress" });

    const response = await POST(makeRequest({
      action: "complete_execution",
      executionId: "exec-1",
      status: "completed",
      result: "已完成",
    }));

    expect(response.status).toBe(200);
    expect(mockUpdateExecutionStatus).toHaveBeenCalledWith("user-1", "exec-1", "completed", "已完成", "running");
    expect(mockUpdateActionTaskStatus).toHaveBeenCalledWith("user-1", "task-1", "completed", undefined, "in_progress");
    expect(mockReconcileDecisionStatus).toHaveBeenCalledWith("user-1", "decision-1");
  });

  it("does not report success when task transition fails after execution update", async () => {
    mockGetExecution.mockResolvedValue({ id: "exec-1", actionTaskId: "task-1", status: "running", result: null, executedAt: "" });
    mockGetActionTask
      .mockResolvedValueOnce({ id: "task-1", decisionId: "decision-1", status: "in_progress" })
      .mockResolvedValueOnce({ id: "task-1", decisionId: "decision-1", status: "in_progress" });
    mockUpdateActionTaskStatus.mockResolvedValue(false);

    const response = await POST(makeRequest({
      action: "complete_execution",
      executionId: "exec-1",
      status: "completed",
    }));

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error.message).toContain("任务状态");
    expect(mockReconcileDecisionStatus).not.toHaveBeenCalled();
  });

  it("rejects duplicate starts while a task is already in progress", async () => {
    mockGetExecution.mockResolvedValue(null);
    mockGetActionTask.mockResolvedValue({ id: "task-1", decisionId: "decision-1", status: "in_progress" });

    const response = await POST(makeRequest({
      action: "start_execution",
      id: "exec-2",
      actionTaskId: "task-1",
    }));

    expect(response.status).toBe(409);
    expect(mockSaveExecution).not.toHaveBeenCalled();
  });

  it("rejects starts until the parent decision is approved", async () => {
    mockGetExecution.mockResolvedValue(null);
    mockGetDecision.mockResolvedValue({ id: "decision-1", status: "pending" });

    const response = await POST(makeRequest({
      action: "start_execution",
      id: "exec-1",
      actionTaskId: "task-1",
    }));

    expect(response.status).toBe(409);
    expect(mockSaveExecution).not.toHaveBeenCalled();
  });

  it("rejects direct decision completion bypasses", async () => {
    const response = await POST(makeRequest({
      action: "update_decision_status",
      decisionId: "decision-1",
      status: "completed",
    }));

    expect(response.status).toBe(409);
    expect(mockUpdateDecisionStatus).not.toHaveBeenCalled();
  });

  it("rejects direct task status bypasses", async () => {
    const response = await POST(makeRequest({
      action: "update_action_task_status",
      taskId: "task-1",
      status: "completed",
    }));

    expect(response.status).toBe(409);
    expect(mockUpdateActionTaskStatus).not.toHaveBeenCalled();
  });

  it("cancels pending tasks when a decision is rejected", async () => {
    mockGetDecision.mockResolvedValue({ id: "decision-1", status: "pending" });
    const response = await POST(makeRequest({
      action: "update_decision_status",
      decisionId: "decision-1",
      status: "rejected",
    }));

    expect(response.status).toBe(200);
    expect(mockUpdateDecisionStatus).toHaveBeenCalledWith("user-1", "decision-1", "rejected", undefined, "pending");
    expect(mockCancelPendingActionTasks).toHaveBeenCalledWith("user-1", "decision-1");
  });

  it("treats a same-id running start retry as idempotent", async () => {
    mockGetActionTask.mockResolvedValue({ id: "task-1", decisionId: "decision-1", status: "in_progress" });
    mockGetExecution.mockResolvedValue({ id: "exec-1", actionTaskId: "task-1", status: "running" });

    const response = await POST(makeRequest({
      action: "start_execution",
      id: "exec-1",
      actionTaskId: "task-1",
    }));

    expect(response.status).toBe(200);
    expect(mockSaveExecution).not.toHaveBeenCalled();
  });

  it("repairs a terminal execution retry and reconciles its decision", async () => {
    mockGetExecution.mockResolvedValue({ id: "exec-1", actionTaskId: "task-1", status: "completed" });
    mockGetActionTask.mockResolvedValue({ id: "task-1", decisionId: "decision-1", status: "in_progress" });

    const response = await POST(makeRequest({
      action: "complete_execution",
      executionId: "exec-1",
      status: "completed",
    }));

    expect(response.status).toBe(200);
    expect(mockUpdateActionTaskStatus).toHaveBeenCalledWith("user-1", "task-1", "completed", undefined, "in_progress");
    expect(mockReconcileDecisionStatus).toHaveBeenCalledWith("user-1", "decision-1");
  });

  it("recovers when the execution CAS committed but returned false", async () => {
    mockGetExecution
      .mockResolvedValueOnce({ id: "exec-1", actionTaskId: "task-1", status: "running" })
      .mockResolvedValueOnce({ id: "exec-1", actionTaskId: "task-1", status: "completed" });
    mockGetActionTask
      .mockResolvedValueOnce({ id: "task-1", decisionId: "decision-1", status: "in_progress" })
      .mockResolvedValueOnce({ id: "task-1", decisionId: "decision-1", status: "completed" });
    mockUpdateExecutionStatus.mockResolvedValue(false);

    const response = await POST(makeRequest({
      action: "complete_execution",
      executionId: "exec-1",
      status: "completed",
    }));

    expect(response.status).toBe(200);
    expect(mockReconcileDecisionStatus).toHaveBeenCalledWith("user-1", "decision-1");
  });

  it("retries task cancellation for an already rejected decision", async () => {
    mockGetDecision.mockResolvedValue({ id: "decision-1", status: "rejected" });

    const response = await POST(makeRequest({
      action: "update_decision_status",
      decisionId: "decision-1",
      status: "rejected",
    }));

    expect(response.status).toBe(200);
    expect(mockUpdateDecisionStatus).not.toHaveBeenCalled();
    expect(mockCancelPendingActionTasks).toHaveBeenCalledWith("user-1", "decision-1");
  });

  it("returns conflict when an opposite decision update wins the CAS", async () => {
    mockGetDecision
      .mockResolvedValueOnce({ id: "decision-1", status: "pending" })
      .mockResolvedValueOnce({ id: "decision-1", status: "rejected" });
    mockUpdateDecisionStatus.mockResolvedValue(false);

    const response = await POST(makeRequest({
      action: "update_decision_status",
      decisionId: "decision-1",
      status: "approved",
    }));

    expect(response.status).toBe(409);
  });

  it("saves an outcome only through the completed execution path", async () => {
    mockGetExecution.mockResolvedValue({ id: "exec-1", actionTaskId: "task-1", status: "completed" });

    const response = await POST(makeRequest({
      action: "save_outcome",
      id: "outcome-1",
      executionId: "exec-1",
      metric: "月利润",
      beforeValue: 10,
      afterValue: 15,
    }));

    expect(response.status).toBe(200);
    expect(mockSaveOutcome).toHaveBeenCalledWith("user-1", expect.objectContaining({
      id: "outcome-1",
      executionId: "exec-1",
      improvement: 5,
    }));
  });
});
