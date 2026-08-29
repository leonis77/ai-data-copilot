import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuthenticateRequest = vi.hoisted(function () {
  return vi.fn();
});
const mockValidateAgentRequest = vi.hoisted(function () {
  return vi.fn();
});
const mockExecuteDecisionPipeline = vi.hoisted(function () {
  return vi.fn();
});
const mockSaveDataset = vi.hoisted(function () {
  return vi.fn();
});
const mockSaveAnalysisRun = vi.hoisted(function () {
  return vi.fn();
});
const mockSaveDecision = vi.hoisted(function () {
  return vi.fn();
});
const mockSaveActionTask = vi.hoisted(function () {
  return vi.fn();
});
const mockCleanupAgentPersistence = vi.hoisted(function () {
  return vi.fn();
});

vi.mock("@/lib/auth", function () {
  return { authenticateRequest: mockAuthenticateRequest };
});
vi.mock("@/lib/schemas", function () {
  return { validateAgentRequest: mockValidateAgentRequest };
});
vi.mock("@/lib/rate-limit", function () {
  return {
    applyRateLimitAsync: vi.fn(function () { return Promise.resolve({ allowed: true }); }),
    rateLimitResponse: vi.fn(),
  };
});
vi.mock("@/lib/api-utils", function () {
  return {
    readJsonBody: vi.fn(function (request: any) { return request.body; }),
  };
});
vi.mock("@/lib/db", function () {
  return {
    getDataset: vi.fn(function () { return Promise.resolve(null); }),
    listDatasets: vi.fn(function () { return Promise.resolve([]); }),
    saveDataset: mockSaveDataset,
  };
});
vi.mock("@/lib/server-store", function () {
  return {
    getFromServerStore: vi.fn(function () { return null; }),
    listFromServerStore: vi.fn(function () { return []; }),
  };
});
vi.mock("@/lib/parser", function () {
  return {
    computeStats: vi.fn(function () {
      return { stats: {}, distributions: {} };
    }),
  };
});
vi.mock("@/lib/semantic", function () {
  return {
    detectRelations: vi.fn(function () { return []; }),
    detectRoles: vi.fn(function () { return []; }),
  };
});
vi.mock("@/lib/platform/detect", function () {
  return { detectPlatform: vi.fn(function () { return null; }) };
});
vi.mock("@/lib/rag", function () {
  return {
    injectKnowledgeV3: vi.fn(function () {
      return Promise.resolve({
        knowledgeBlock: "",
        stats: { injected: 0, warned: 0, rejected: 0, freshnessScore: 0, industry: "", industryConfidence: 0, webSearchTriggered: false, webSearchResults: 0 },
      });
    }),
    injectKnowledge: vi.fn(function () { return { knowledgeBlock: "" }; }),
  };
});
vi.mock("@/lib/pipeline/decision-pipeline", function () {
  return { executeDecisionPipeline: mockExecuteDecisionPipeline };
});
vi.mock("@/lib/loop", function () {
  return {
    saveAnalysisRun: mockSaveAnalysisRun,
    saveDecision: mockSaveDecision,
    saveActionTask: mockSaveActionTask,
    cleanupAgentPersistence: mockCleanupAgentPersistence,
    extractDecisionSummary: vi.fn(function () {
      return {
        summary: "summary",
        verdict: "hold",
        confidence: 0.8,
        productNames: [],
        evidenceCardIndices: [],
        expectedProfitImpact: 1,
        riskLevel: "low",
      };
    }),
  };
});
vi.mock("@/lib/agent", function () {
  return { routeAgent: vi.fn() };
});

import { POST } from "@/app/api/agent/route";

function makeChain() {
  return {
    metrics: { products: [], store: {}, profit: [], crossPlatform: [] },
    diagnoses: [],
    evidenceCards: [],
    applicableRules: [],
    aiExplanation: { summary: "summary", reasoningChain: [], confidence: 0.8 },
    actions: [
      {
        title: "调整库存",
        description: "降低滞销库存",
        priority: "P1",
        evidenceRefs: [],
        diagnosisRef: "diagnosis-1",
        ruleIds: [],
        expectedProfitImpact: 1,
        riskLevel: "low",
      },
      {
        title: "优化采购",
        description: "减少低周转采购",
        priority: "P2",
        evidenceRefs: [],
        diagnosisRef: "diagnosis-2",
        ruleIds: [],
        expectedProfitImpact: 1,
        riskLevel: "low",
      },
    ],
    meta: {
      industry: { name: "电商" },
      knowledgeCoverage: "",
      freshnessScore: 80,
      webSearchTriggered: false,
      pipelineLatency: 12,
    },
  };
}

function makeRequest() {
  const body = {
    input: "分析经营状况",
    datasetId: "dataset-1",
    inlineDatasets: {
      "dataset-1": { columns: ["商品"], rows: [{ 商品: "A" }] },
    },
  };
  return {
    body,
    headers: { get: vi.fn(function () { return "Bearer test-token"; }) },
  } as any;
}

describe("POST /api/agent — closed-loop persistence", () => {
  beforeEach(function () {
    mockAuthenticateRequest.mockReset();
    mockAuthenticateRequest.mockReturnValue({ ok: true, user: { id: "user-1" } });
    mockValidateAgentRequest.mockReset();
    mockValidateAgentRequest.mockImplementation(function (body: any) { return body; });
    mockExecuteDecisionPipeline.mockReset();
    mockExecuteDecisionPipeline.mockResolvedValue(makeChain());
    mockSaveDataset.mockReset();
    mockSaveDataset.mockResolvedValue(undefined);
    mockSaveAnalysisRun.mockReset();
    mockSaveAnalysisRun.mockResolvedValue(true);
    mockSaveDecision.mockReset();
    mockSaveDecision.mockResolvedValue(true);
    mockSaveActionTask.mockReset();
    mockSaveActionTask
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    mockCleanupAgentPersistence.mockReset();
    mockCleanupAgentPersistence.mockResolvedValue(undefined);
  });

  it("must not return an executable actionTaskId when task persistence fails", async () => {
    const response = await POST(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.type).toBe("decision_chain");
    expect(data.actions[0].actionTaskId).toBeUndefined();
    expect(data.actions[1].actionTaskId).toBeUndefined();
    expect(mockSaveActionTask).toHaveBeenCalledTimes(2);
    expect(mockCleanupAgentPersistence).toHaveBeenCalledTimes(1);
  });
});
