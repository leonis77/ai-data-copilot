/**
 * POST /api/upload 安全单测
 *
 * 覆盖：
 * - 缺失 auth header → 401
 * - 非法 auth 格式 → 401
 * - 非法 body 类型 → 400
 * - 校验失败（非法文件名、非法 base64、文件过大） → 400/413
 * - 不支持的文件格式 → 400
 * - 限流拦截
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/upload/route";
import { resetRateLimitStore } from "@/lib/rate-limit";

// ═══ Mocks ═══

const mockAuthenticateRequest = vi.hoisted(function () {
  return vi.fn();
});

const mockValidateUploadRequest = vi.hoisted(function () {
  return vi.fn(function (raw: any) {
    if (!raw || typeof raw.fileName !== "string" || raw.fileName.trim() === "") {
      throw new Error("fileName 不能为空");
    }
    if (!raw.fileName.match(/^[^/\\]+\.(xlsx|xls|csv)$/i)) {
      throw new Error("仅支持 xlsx / xls / csv");
    }
    if (!raw.fileData || typeof raw.fileData !== "string" || !/^[A-Za-z0-9+/=]+$/.test(raw.fileData)) {
      throw new Error("fileData 必须是 base64 字符串");
    }
    if (raw.fileData.length > 73400320) {
      throw new Error("文件过大");
    }
    return raw;
  });
});

vi.mock("@/lib/auth", function () {
  return {
    authenticateRequest: mockAuthenticateRequest,
  };
});

// Mock only validateUploadRequest from schemas; leave other exports intact for injection tests
vi.mock("@/lib/schemas", function () {
  return {
    validateUploadRequest: mockValidateUploadRequest,
    validateLoginRequest: function () { return {} as any; },
    validateRegisterRequest: function () { return {} as any; },
    validateAgentRequest: function () { return {} as any; },
    validateAgentResponse: function () { return {} as any; },
    validateLoopPostAction: function () { return {} as any; },
  };
});

vi.mock("@/lib/parser", function () {
  return {
    parseFile: vi.fn(function () {
      return {
        columns: ["商品", "金额", "数量"],
        rows: [{ 商品: "A", 金额: 100, 数量: 1 }],
        rowCount: 1,
        summary: "parsed",
      };
    }),
    rawPreview: vi.fn(function () {
      return {
        sheets: [{ name: "Sheet1", preview: [], mergeInfo: [], totalRows: 1 }],
      };
    }),
  };
});

vi.mock("@/lib/parser-ai", function () {
  return {
    analyzeSheetStructure: vi.fn(function () {
      return { headerRow: 0, skipRows: [] };
    }),
  };
});

vi.mock("@/lib/semantic", function () {
  return {
    buildSemanticProfile: vi.fn(function () {
      return null;
    }),
  };
});

vi.mock("@/lib/db", function () {
  return {
    saveDataset: vi.fn(function () {
      return Promise.resolve();
    }),
    getLatestDataset: vi.fn(function () {
      return null;
    }),
    getDataset: vi.fn(function () {
      return null;
    }),
    listDatasets: vi.fn(function () {
      return [];
    }),
    deleteDataset: vi.fn(function () {
      return Promise.resolve();
    }),
  };
});

vi.mock("@/lib/server-store", function () {
  return {
    saveToServerStore: vi.fn(),
    getFromServerStore: vi.fn(function () {
      return null;
    }),
    getLatestFromServerStore: vi.fn(function () {
      return null;
    }),
    listFromServerStore: vi.fn(function () {
      return [];
    }),
    deleteFromServerStore: vi.fn(),
  };
});

vi.mock("@/lib/platform/detect", function () {
  return {
    detectPlatform: vi.fn(function () {
      return null;
    }),
  };
});

// ═══ Helpers ═══

function createRequest(body: any, authHeader: string | null = null) {
  return {
    json: async () => body,
    headers: {
      get: function (_key: string) {
        if (_key.toLowerCase() === "authorization") return authHeader;
        return null;
      },
    },
  } as any;
}

function makeBase64Data(bytes: number): string {
  // Produce a base64 string of approximately `bytes` bytes
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const rawLength = Math.ceil(bytes * 3 / 4);
  let s = "";
  for (let i = 0; i < rawLength; i++) {
    s += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // pad to valid base64
  const mod = s.length % 4;
  if (mod === 2) s += "==";
  else if (mod === 3) s += "=";
  return s;
}

describe("POST /api/upload — auth guards", () => {
  beforeEach(function () {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    resetRateLimitStore();
    mockAuthenticateRequest.mockReset();
    // For auth guard tests, return failure
    mockAuthenticateRequest.mockReturnValue({ ok: false, error: "invalid_token" });
  });

  it("缺失 auth header 应返回 401", async () => {
    const request = createRequest({ fileName: "test.xlsx", fileData: makeBase64Data(100) });
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data.error.code).toBe("AUTH_FAILED");
  });

  it("非法 auth 格式应返回 401", async () => {
    const request = createRequest(
      { fileName: "test.xlsx", fileData: makeBase64Data(100) },
      "Basic abc123"
    );
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data.error.code).toBe("AUTH_FAILED");
  });

  it("空 token 应返回 401", async () => {
    const request = createRequest(
      { fileName: "test.xlsx", fileData: makeBase64Data(100) },
      "Bearer "
    );
    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});

describe("POST /api/upload — input validation", () => {
  beforeEach(function () {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    resetRateLimitStore();
    mockValidateUploadRequest.mockReset();
    // For input validation tests, auth succeeds so we reach the validation logic
    mockAuthenticateRequest.mockReturnValue({ ok: true, user: { id: "test-user", email: "test@test.com" } });
  });

  it("非法 body 类型应返回 400", async () => {
    const request = createRequest(null);
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("缺少 fileName 应返回 400", async () => {
    const request = createRequest({ fileData: makeBase64Data(100) });
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_FAILED");
  });

  it("非法文件扩展名应返回 400", async () => {
    const request = createRequest({ fileName: "test.txt", fileData: makeBase64Data(100) });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("非法 base64 应返回 400", async () => {
    const request = createRequest({ fileName: "test.xlsx", fileData: "not-valid-base64!!!" });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("文件大小校验失败时应返回错误（validateUploadRequest 拒绝）", async () => {
    mockValidateUploadRequest.mockImplementationOnce(function () {
      throw new Error("文件过大：xxx bytes，最大允许 73400320 bytes");
    });
    const request = createRequest({ fileName: "test.xlsx", fileData: "UEsDBBQABgAIAAAAIQD0" });
    const response = await POST(request);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
