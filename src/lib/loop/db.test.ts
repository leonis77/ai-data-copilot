import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateClient = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

var db: typeof import("@/lib/loop/db");

function makeExecutionClient(insertResult: unknown) {
  const insert = vi.fn().mockResolvedValue(insertResult);
  const select = vi.fn().mockResolvedValue({ data: [{ id: "exec-1" }], error: null });
  const thirdEq = vi.fn().mockReturnValue({ select });
  const secondEq = vi.fn().mockReturnValue({ select, eq: thirdEq });
  const firstEq = vi.fn().mockReturnValue({ eq: secondEq, select });
  const update = vi.fn().mockReturnValue({ eq: firstEq });
  return { client: { from: vi.fn(() => ({ insert, update })) }, insert };
}

describe("loop persistence — user-scoped execution records", () => {
  beforeEach(async () => {
    vi.resetModules();
    mockCreateClient.mockReset();
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
    db = await import("@/lib/loop/db");
  });

  it("writes user_id with every execution", async () => {
    const { client, insert } = makeExecutionClient({ error: null });
    mockCreateClient.mockReturnValue(client);

    expect(await db.saveExecution("user-1", {
      id: "exec-1",
      actionTaskId: "task-1",
      status: "running",
      executedBy: "user",
    })).toBe(true);

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      id: "exec-1",
      action_task_id: "task-1",
      user_id: "user-1",
    }));
  });

  it("fails closed when the execution user_id column is unavailable", async () => {
    const { client } = makeExecutionClient({
      error: { code: "PGRST204", message: "Could not find the 'user_id' column" },
    });
    mockCreateClient.mockReturnValue(client);

    expect(await db.saveExecution("user-1", {
      id: "exec-1",
      actionTaskId: "task-1",
      status: "running",
    })).toBe(false);
  });

  it("returns false when an update affects no user-scoped row", async () => {
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue({ from: vi.fn(() => ({ update })) });

    expect(await db.updateExecutionStatus("user-1", "exec-1", "completed")).toBe(false);
  });

  it("rejects an outcome until the execution is completed", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: "exec-1", action_task_id: "task-1", status: "running" },
      error: null,
    });
    mockCreateClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single }),
          }),
        }),
      })),
    });

    expect(await db.saveOutcome("user-1", {
      id: "outcome-1",
      executionId: "exec-1",
      metric: "月利润",
      beforeValue: 1,
      afterValue: 2,
      improvement: 1,
      improvementPercent: 100,
    })).toBe(false);
  });
});
