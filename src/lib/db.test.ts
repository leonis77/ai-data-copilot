import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateClient = vi.hoisted(function () {
  return vi.fn();
});

vi.mock("@supabase/supabase-js", function () {
  return { createClient: mockCreateClient };
});

import { saveDataset } from "@/lib/db";

describe("saveDataset — schema drift recovery", () => {
  beforeEach(function () {
    mockCreateClient.mockReset();
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
  });

  it("retries without optional semantic_roles when the column is missing", async () => {
    const upsert = vi.fn()
      .mockResolvedValueOnce({
        error: {
          code: "PGRST204",
          message: "Could not find the 'semantic_roles' column of 'datasets' in the schema cache",
          details: "",
        },
      })
      .mockResolvedValueOnce({ error: null });
    const select = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [{ id: "dataset-1" }], error: null }),
      }),
    });
    const client = {
      from: vi.fn(function (table: string) {
        if (table === "datasets") {
          return { upsert, select };
        }
        return {};
      }),
    };
    mockCreateClient.mockReturnValue(client);

    await saveDataset("user-1", {
      id: "dataset-1",
      name: "dataset-1",
      originalName: "orders.csv",
      columns: ["商品"],
      rows: [{ 商品: "A" }],
      summary: "summary",
      semanticRoles: { columns: [] },
      platform: "taobao",
    });

    expect(upsert).toHaveBeenCalledTimes(2);
    const firstPayload = upsert.mock.calls[0][0];
    const retryPayload = upsert.mock.calls[1][0];
    expect(firstPayload.semantic_roles).toEqual({ columns: [] });
    expect(retryPayload.semantic_roles).toBeUndefined();
    expect(retryPayload.id).toBe("dataset-1");
    expect(retryPayload.user_id).toBe("user-1");
  });
});
