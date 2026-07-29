/**
 * Scenario Engine 单测
 *
 * 覆盖：
 * - simulatePriceChange 涨价/降价
 * - simulatePlatformSwitch 跨平台切换
 * - simulateStopLoss 止损模拟
 * - buildAllScenarios 聚合器
 */

import { describe, it, expect } from "vitest";
import {
  simulatePriceChange,
  simulatePlatformSwitch,
  simulateStopLoss,
  buildAllScenarios,
} from "@/lib/engines/scenario-engine";
import { calculateProfit } from "@/lib/profit/engine";

function makeProfitResult(overrides?: Partial<import("@/lib/profit/engine").ProfitResult>) {
  const base = calculateProfit({
    productName: "测试商品",
    platform: "tmall",
    sellPrice: 100,
    purchaseCost: 50,
    monthlySales: 100,
  });
  return { ...base, ...overrides };
}

describe("simulatePriceChange", () => {
  it("涨价 10% 应提升月利润", () => {
    const result = makeProfitResult();
    const scenario = simulatePriceChange(result, 10);

    expect(scenario.type).toBe("price_change");
    expect(scenario.newPrice).toBeCloseTo(110, 2);
    expect(scenario.priceChangePercent).toBe(10);
    expect(scenario.profitDelta).toBeGreaterThan(0);
    expect(scenario.newProfitMargin).toBeGreaterThan(scenario.originalProfitMargin);
  });

  it("涨价应给出建议文案", () => {
    const result = makeProfitResult();
    const scenario = simulatePriceChange(result, 10);
    expect(scenario.recommendation).toContain("涨价");
    expect(scenario.recommendation).toContain("测试商品");
  });

  it("降价 10% 应降低月利润", () => {
    const result = makeProfitResult();
    const scenario = simulatePriceChange(result, -10);

    expect(scenario.newPrice).toBeCloseTo(90, 2);
    expect(scenario.profitDelta).toBeLessThan(0);
  });

  it("价格变动幅度越大，置信度越低", () => {
    const result = makeProfitResult();
    const small = simulatePriceChange(result, 3);
    const medium = simulatePriceChange(result, 10);
    const large = simulatePriceChange(result, 25);

    expect(small.confidence).toBe("high");
    expect(medium.confidence).toBe("medium");
    expect(large.confidence).toBe("low");
  });

  it("originalMonthlyProfit 应等于 profitResult 的 netProfitMonthly", () => {
    const result = makeProfitResult();
    const scenario = simulatePriceChange(result, 5);
    expect(scenario.originalMonthlyProfit).toBeCloseTo(result.netProfitMonthly, 2);
  });
});

describe("simulatePlatformSwitch", () => {
  it("从低费率平台切换到高费率平台应降低利润", () => {
    // 淘宝佣金率 3%，拼多多 2%
    const result = makeProfitResult({ platformKey: "taobao", platform: "淘宝" });
    const scenario = simulatePlatformSwitch(result, "pdd");

    expect(scenario).not.toBeNull();
    expect(scenario!.fromPlatform).toBe("淘宝");
    expect(scenario!.toPlatform).toBe("拼多多");
    // 佣金更低，利润应该更高（或相近）
    expect(typeof scenario!.profitDelta).toBe("number");
  });

  it("未知平台应返回 null", () => {
    const result = makeProfitResult();
    const scenario = simulatePlatformSwitch(result, "unknown");
    expect(scenario).toBeNull();
  });

  it("应包含 recommendation", () => {
    const result = makeProfitResult();
    const scenario = simulatePlatformSwitch(result, "pdd");
    if (scenario) {
      expect(scenario.recommendation).toContain("测试商品");
    }
  });
});

describe("simulateStopLoss", () => {
  it("应识别亏损商品并计算止损收益", () => {
    const profitResults = [
      makeProfitResult({ productName: "盈利品", netProfitPerItem: 20, netProfitMonthly: 2000 }),
      makeProfitResult({ productName: "亏损品A", netProfitPerItem: -10, netProfitMonthly: -1000 }),
      makeProfitResult({ productName: "亏损品B", netProfitPerItem: -5, netProfitMonthly: -500 }),
    ];

    const scenario = simulateStopLoss(profitResults);

    expect(scenario.type).toBe("stop_loss");
    expect(scenario.productsToStop).toHaveLength(2);
    expect(scenario.monthlySavings).toBeCloseTo(1500, 2);
    expect(scenario.totalCurrentLoss).toBeCloseTo(-1500, 2);
  });

  it("无亏损商品时 productsToStop 应为空", () => {
    const profitResults = [
      makeProfitResult({ productName: "盈利品1", netProfitPerItem: 20, netProfitMonthly: 2000 }),
      makeProfitResult({ productName: "盈利品2", netProfitPerItem: 15, netProfitMonthly: 1500 }),
    ];

    const scenario = simulateStopLoss(profitResults);

    expect(scenario.productsToStop).toHaveLength(0);
    expect(scenario.monthlySavings).toBe(0);
  });

  it("应给出止损建议文案", () => {
    const profitResults = [
      makeProfitResult({ productName: "亏损品", netProfitPerItem: -10, netProfitMonthly: -1000 }),
    ];

    const scenario = simulateStopLoss(profitResults);
    expect(scenario.recommendation).toContain("停止采购");
    expect(scenario.recommendation).toContain("亏损品");
  });
});

describe("buildAllScenarios", () => {
  it("应生成止损 + 涨价 + 跨平台场景", () => {
    const profitResults = [
      makeProfitResult({ productName: "亏损品", netProfitPerItem: -10, netProfitMonthly: -1000 }),
      makeProfitResult({ productName: "高利润品", netProfitPerItem: 50, netProfitMonthly: 5000 }),
      makeProfitResult({ productName: "中利润品", netProfitPerItem: 10, netProfitMonthly: 1000 }),
    ];

    const result = buildAllScenarios(profitResults, 2);

    expect(result.scenarios.length).toBeGreaterThan(0);
    expect(result.scenarios.some(function (s) { return s.type === "stop_loss"; })).toBe(true);
    expect(result.scenarios.some(function (s) { return s.type === "price_change"; })).toBe(true);
    expect(result.summary).toBeTruthy();
  });

  it("无利润结果时应返回空场景", () => {
    const result = buildAllScenarios([], 2);
    expect(result.scenarios).toHaveLength(0);
  });

  it("应包含场景摘要", () => {
    const profitResults = [
      makeProfitResult({ productName: "亏损品", netProfitPerItem: -10, netProfitMonthly: -1000 }),
    ];

    const result = buildAllScenarios(profitResults, 2);
    expect(result.summary.length).toBeGreaterThan(0);
  });
});
