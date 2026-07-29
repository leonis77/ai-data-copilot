/**
 * Industry Benchmark 单测
 */

import { describe, it, expect } from "vitest";
import { detectCategory, matchBenchmark, listAvailableBenchmarks, getCategoryKnowledgeRefs } from "@/lib/rag/industry-benchmark";
import { calculateProfit } from "@/lib/profit/engine";

describe("detectCategory", () => {
  it("应正确识别服装类商品", () => {
    expect(detectCategory("2026新款连衣裙")).toBe("clothing");
    expect(detectCategory("男士运动鞋跑步鞋")).toBe("clothing");
  });

  it("应正确识别3C数码类商品", () => {
    expect(detectCategory("无线蓝牙耳机Pro")).toBe("electronics");
    expect(detectCategory("手机充电器快充")).toBe("electronics");
  });

  it("应正确识别美妆类商品", () => {
    expect(detectCategory("补水面膜")).toBe("beauty");
  });

  it("未知品类应返回 null", () => {
    expect(detectCategory("random product")).toBeNull();
    expect(detectCategory("")).toBeNull();
  });
});

describe("matchBenchmark", () => {
  it("应匹配到对应品类的基准", () => {
    const result = calculateProfit({
      productName: "无线蓝牙耳机",
      platform: "jd",
      sellPrice: 199,
      purchaseCost: 80,
      monthlySales: 100,
    });
    const benchmark = matchBenchmark(result);
    expect(benchmark).not.toBeNull();
    expect(benchmark.title).toContain("3C数码");
    expect(benchmark.metrics.length).toBeGreaterThan(0);
  });

  it("应包含毛利率、净利率、退货率、广告费率指标", () => {
    const result = calculateProfit({
      productName: "补水面膜",
      platform: "tmall",
      sellPrice: 89,
      purchaseCost: 20,
      monthlySales: 200,
    });
    const benchmark = matchBenchmark(result);
    expect(benchmark).not.toBeNull();
    const metricNames = benchmark.metrics.map((m: any) => m.name);
    expect(metricNames).toContain("毛利率");
    expect(metricNames).toContain("净利率");
  });

  it("未知品类应返回 null", () => {
    const result = calculateProfit({
      productName: "random unknown product",
      platform: "tmall",
      sellPrice: 100,
      purchaseCost: 50,
      monthlySales: 100,
    });
    expect(matchBenchmark(result)).toBeNull();
  });

  it("应包含来源和置信度", () => {
    const result = calculateProfit({
      productName: "零食坚果",
      platform: "pdd",
      sellPrice: 29.9,
      purchaseCost: 15,
      monthlySales: 500,
    });
    const benchmark = matchBenchmark(result);
    expect(benchmark).not.toBeNull();
    expect(benchmark.source).toBeTruthy();
    expect(benchmark.confidence).toBeGreaterThan(0);
  });
});

describe("listAvailableBenchmarks", () => {
  it("应返回所有品类基准", () => {
    const benchmarks = listAvailableBenchmarks();
    expect(benchmarks.length).toBeGreaterThan(0);
    expect(benchmarks.some((b: any) => b.category === "electronics")).toBe(true);
  });
});

describe("getCategoryKnowledgeRefs", () => {
  it("服装类商品应返回服装知识条目", () => {
    const refs = getCategoryKnowledgeRefs("2026新款连衣裙");
    expect(refs).toEqual(["benchmark_category_clothing"]);
  });

  it("食品类商品应返回食品知识条目", () => {
    const refs = getCategoryKnowledgeRefs("坚果零食大礼包");
    expect(refs).toEqual(["benchmark_category_food"]);
  });

  it("未知品类应返回空数组", () => {
    const refs = getCategoryKnowledgeRefs("random unknown product");
    expect(refs).toEqual([]);
  });

  it("3C 商品应返回电子知识条目", () => {
    const refs = getCategoryKnowledgeRefs("无线蓝牙耳机Pro");
    expect(refs).toEqual(["benchmark_category_electronics"]);
  });
});
