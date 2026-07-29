/**
 * Schema validation 单测
 *
 * 覆盖：
 * - UploadRequestBodySchema
 * - AgentRequestBodySchema
 * - InlineDatasetSchema
 * - AgentApiResponseSchema（decision_chain / insufficient_data / fallback / error）
 * - LoopPostAction schema
 */

import { describe, it, expect } from "vitest";
import {
  validateUploadRequest,
  validateAgentRequest,
  validateAgentResponse,
  validateLoopPostAction,
} from "@/lib/schemas";

describe("validateUploadRequest", () => {
  it("合法请求应通过校验", () => {
    const result = validateUploadRequest({
      fileName: "test.xlsx",
      fileData: "UEsDBBQABgAIAAAAIQD0",
      source: "upload",
    });
    expect(result.fileName).toBe("test.xlsx");
    expect(result.source).toBe("upload");
  });

  it("不支持的文件扩展名应抛出", () => {
    expect(function () {
      validateUploadRequest({ fileName: "test.txt", fileData: "UEsDBBQABgAIAAAAIQD0" });
    }).toThrow();
  });

  it("base64 含非法字符应抛出", () => {
    expect(function () {
      validateUploadRequest({ fileName: "test.xlsx", fileData: "not-valid-base64!!!" });
    }).toThrow();
  });

  it("fileName 过长应抛出", () => {
    expect(function () {
      validateUploadRequest({ fileName: "a".repeat(1025), fileData: "UEsDBBQABgAIAAAAIQD0" });
    }).toThrow();
  });
});

describe("validateAgentRequest", () => {
  it("合法请求应通过校验", () => {
    const result = validateAgentRequest({
      input: "分析这些数据",
      datasetId: "ds_123",
      relatedDatasetIds: ["ds_456"],
    });
    expect(result.input).toBe("分析这些数据");
    expect(result.datasetId).toBe("ds_123");
    expect(result.relatedDatasetIds).toEqual(["ds_456"]);
  });

  it("缺少 input 应抛出", () => {
    expect(function () {
      validateAgentRequest({ datasetId: "ds_123" });
    }).toThrow();
  });

  it("input 过长（>4000 字符）应抛出", () => {
    expect(function () {
      validateAgentRequest({ input: "a".repeat(4001), datasetId: "ds_123" });
    }).toThrow();
  });

  it("relatedDatasetIds 超过 20 个应抛出", () => {
    expect(function () {
      validateAgentRequest({
        input: "分析",
        datasetId: "ds_123",
        relatedDatasetIds: Array.from({ length: 21 }, function (_, i) { return "ds_" + i; }),
      });
    }).toThrow();
  });
});

describe("validateAgentResponse — decision_chain", () => {
  it("合法的 decision_chain 响应应通过校验", () => {
    const response = {
      type: "decision_chain",
      content: "分析完成",
      crossPlatform: [],
      metrics: {
        products: [],
        store: {},
        profit: [],
      },
      diagnoses: [],
      evidenceCards: [],
      applicableRules: [],
      aiExplanation: {
        summary: "AI 解释",
        reasoningChain: [],
        confidence: 0.8,
      },
      actions: [],
      meta: {
        industry: { name: "ecommerce", confidence: 0.9 },
        knowledgeCoverage: "sufficient",
        freshnessScore: 80,
        webSearchTriggered: false,
        pipelineLatency: 1200,
      },
    };
    expect(() => validateAgentResponse(response)).not.toThrow();
  });

  it("合法的 insufficient_data 响应应通过校验", () => {
    const response = {
      type: "insufficient_data",
      content: "数据不足",
      limitations: ["缺少商品名称列"],
      recoverable: true,
    };
    expect(() => validateAgentResponse(response)).not.toThrow();
  });

  it("合法的 fallback agent 响应应通过校验", () => {
    const response = {
      type: "query",
      content: "降级分析",
      degraded: true,
      fallbackReason: "decision_pipeline_unavailable",
    };
    expect(() => validateAgentResponse(response)).not.toThrow();
  });

  it("合法的 agent_error 响应应通过校验", () => {
    const response = {
      type: "agent_error",
      content: "出错了",
      error: { code: "AGENT_FAILED", message: "失败", recoverable: true },
    };
    expect(() => validateAgentResponse(response)).not.toThrow();
  });

  it("错误 type 应抛出", () => {
    expect(function () {
      validateAgentResponse({ type: "unknown", content: "test" });
    }).toThrow();
  });
});

describe("validateLoopPostAction", () => {
  it("start_execution 应通过校验", () => {
    const result = validateLoopPostAction({
      action: "start_execution",
      id: "exec_1",
      actionTaskId: "task_1",
      executedBy: "user_1",
    });
    expect(result.action).toBe("start_execution");
  });

  it("save_outcome 应通过校验", () => {
    const result = validateLoopPostAction({
      action: "save_outcome",
      id: "outcome_1",
      executionId: "exec_1",
      metric: "月利润",
      beforeValue: 1000,
      afterValue: 1500,
    });
    expect(result.action).toBe("save_outcome");
  });

  it("update_decision_status 应通过校验", () => {
    const result = validateLoopPostAction({
      action: "update_decision_status",
      decisionId: "dec_1",
      status: "approved",
    });
    expect(result.action).toBe("update_decision_status");
    expect(result.status).toBe("approved");
  });

  it("未知 action 应抛出", () => {
    expect(function () {
      validateLoopPostAction({ action: "unknown" } as any);
    }).toThrow();
  });
});
