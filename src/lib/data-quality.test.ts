/**
 * Data Quality Report 单测
 */

import { describe, it, expect } from "vitest";
import { computeDataQuality } from "@/lib/data-quality";

describe("computeDataQuality", () => {
  it("完整电商数据应获高分", () => {
    const columns = ["商品名称", "售价", "数量", "平台", "订单日期", "成本"];
    const rows = [
      { "商品名称": "A", "售价": 100, "数量": 2, "平台": "天猫", "订单日期": "2026-01-01", "成本": 50 },
      { "商品名称": "B", "售价": 200, "数量": 1, "平台": "天猫", "订单日期": "2026-01-02", "成本": 80 },
    ];
    const report = computeDataQuality(columns, rows, 2);
    expect(report.overallScore).toBeGreaterThanOrEqual(60);
    expect(report.acceptable).toBe(true);
    expect(report.dimensions.fieldCompleteness.score).toBeGreaterThanOrEqual(60);
    expect(report.dimensions.numericValidity.score).toBeGreaterThanOrEqual(80);
    // "平台" 是通用列名，不特指某个电商平台，platformConfidence 可能低于 100
    expect(report.dimensions.platformConfidence.score).toBeGreaterThanOrEqual(30);
  });

  it("空数据应获低分", () => {
    const report = computeDataQuality([], [], 0);
    expect(report.overallScore).toBeLessThan(20);
    expect(report.acceptable).toBe(false);
  });

  it("仅有列名无数据应低分", () => {
    const report = computeDataQuality(["A", "B", "C"], [], 10);
    expect(report.overallScore).toBeLessThan(40);
    expect(report.acceptable).toBe(false);
  });

  it("缺失关键字段应扣分", () => {
    const columns = ["备注", "描述", "说明"];
    const rows = [{ "备注": "test" }];
    const report = computeDataQuality(columns, rows, 1);
    expect(report.dimensions.fieldCompleteness.score).toBeLessThan(40);
    expect(report.dimensions.fieldCompleteness.suggestion).toBeTruthy();
  });

  it("数值列含非标准值应扣分", () => {
    const columns = ["商品名称", "售价", "数量"];
    const rows = [
      { "商品名称": "A", "售价": "100元", "数量": "2件" },
      { "商品名称": "B", "售价": "暂无", "数量": "" },
    ];
    const report = computeDataQuality(columns, rows, 2);
    expect(report.dimensions.numericValidity.score).toBeLessThan(100);
  });

  it("淘宝列名应识别平台", () => {
    const columns = ["宝贝标题", "淘宝订单号", "买家实付", "数量"];
    const rows = [{ "宝贝标题": "A", "淘宝订单号": "123", "买家实付": 100, "数量": 1 }];
    const report = computeDataQuality(columns, rows, 1);
    expect(report.dimensions.platformConfidence.score).toBe(100);
    expect(report.dimensions.platformConfidence.message).toContain("淘宝");
  });

  it("抖音列名应识别平台", () => {
    const columns = ["抖音订单号", "达人佣金", "千川花费"];
    const rows = [{ "抖音订单号": "123", "达人佣金": 10, "千川花费": 5 }];
    const report = computeDataQuality(columns, rows, 1);
    expect(report.dimensions.platformConfidence.score).toBe(100);
    expect(report.dimensions.platformConfidence.message).toContain("抖音");
  });

  it("通用阿里字段不应误判为天猫", () => {
    const columns = ["买家会员号", "买家实际支付", "订单状态"];
    const rows = [{ "买家会员号": "M001", "买家实际支付": 100, "订单状态": "已完成" }];
    const report = computeDataQuality(columns, rows, 1);
    expect(report.dimensions.platformConfidence.score).toBeLessThan(100);
  });

  it("采样覆盖率应反映采样比例", () => {
    const columns = ["商品", "价格"];
    const rows = Array.from({ length: 10 }, function (_, i) { return { "商品": "A" + i, "价格": 100 + i }; });
    const report = computeDataQuality(columns, rows, 1000);
    expect(report.dimensions.samplingCoverage.score).toBeLessThan(20);
    expect(report.dimensions.samplingCoverage.message).toContain("10/1000");
  });

  it("应返回 detectedRoles 和 platform", () => {
    const columns = ["商品名称", "售价", "数量"];
    const rows = [{ "商品名称": "A", "售价": 100, "数量": 2 }];
    const report = computeDataQuality(columns, rows, 1);
    expect(report.summary.detectedRoles.length).toBeGreaterThan(0);
    expect(report.summary.platform).toBeNull(); // 无平台标识
    expect(report.summary.rowCount).toBe(1);
    expect(report.summary.columnCount).toBe(3);
  });
});
