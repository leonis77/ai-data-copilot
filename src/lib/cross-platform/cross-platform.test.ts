/**
 * Cross-platform matching 单测
 *
 * 覆盖：
 * - Jaccard 相似度计算
 * - 商品匹配（精确/模糊）
 * - 跨平台利润对比构建
 */

import { describe, it, expect } from "vitest";
import { jaccardSimilarity, tokenize, matchProductsAcrossPlatforms, buildCrossPlatformComparison } from "@/lib/cross-platform";
import type { ProductIdentity, ProfitResult } from "@/lib/cross-platform";

describe("jaccardSimilarity", () => {
  it("相同文本相似度应为 1", () => {
    expect(jaccardSimilarity("无线蓝牙耳机", "无线蓝牙耳机")).toBe(1);
  });

  it("完全不同文本相似度应为 0", () => {
    expect(jaccardSimilarity("苹果", "香蕉")).toBe(0);
  });

  it("部分重叠文本应有中等相似度", () => {
    const sim = jaccardSimilarity("无线蓝牙耳机Pro", "无线蓝牙耳机Max");
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });

  it("空集合应返回 0", () => {
    expect(jaccardSimilarity("", "abc")).toBe(0);
    expect(jaccardSimilarity("abc", "")).toBe(0);
  });
});

describe("matchProductsAcrossPlatforms", () => {
  const products: ProductIdentity[] = [
    { id: "p1", name: "无线蓝牙耳机Pro", platform: "tmall", price: 199, monthlySales: 100 },
    { id: "p2", name: "无线蓝牙耳机Max", platform: "pdd", price: 169, monthlySales: 200 },
    { id: "p3", name: "苹果手机壳", platform: "tmall", price: 29, monthlySales: 50 },
    { id: "p4", name: "数据线Type-C", platform: "jd", price: 19, monthlySales: 300 },
  ];

  it("相似名称应被匹配到同一组", () => {
    const matches = matchProductsAcrossPlatforms(products, 0.30);
    const headphoneMatch = matches.find(function (m) {
      return m.products.some(function (p) { return p.name.includes("蓝牙耳机"); });
    });
    expect(headphoneMatch).toBeDefined();
    expect(headphoneMatch!.products.length).toBeGreaterThanOrEqual(2);
  });

  it("不相似名称不应被匹配", () => {
    const matches = matchProductsAcrossPlatforms(products, 0.30);
    const phoneCaseMatch = matches.find(function (m) {
      return m.products.some(function (p) { return p.name.includes("手机壳"); }) &&
        m.products.some(function (p) { return p.name.includes("数据线"); });
    });
    expect(phoneCaseMatch).toBeUndefined();
  });

  it("匹配组应标注平台", () => {
    const matches = matchProductsAcrossPlatforms(products, 0.30);
    const hasMultiPlatform = matches.some(function (m) {
      const platforms = new Set(m.products.map(function (p) { return p.platform; }));
      return platforms.size > 1;
    });
    expect(hasMultiPlatform).toBe(true);
  });
});

describe("buildCrossPlatformComparison", () => {
  const mockProfitResults: ProfitResult[] = [
    {
      productName: "测试品",
      platform: "天猫",
      platformKey: "tmall",
      sellPrice: 199,
      purchaseCost: 80,
      monthlySales: 100,
      costs: {
        commissionFee: 10, fixedFeePerItem: 0, shippingInsurance: 2,
        influencerCommission: 0, shippingCost: 3, adCost: 0,
        returnLoss: 4, taxComplianceCost: 0, totalCost: 99,
      },
      netProfitPerItem: 100, netProfitMonthly: 10000, profitMargin: 50.23,
      roi: 125, verdict: "buy_more", verdictConfidence: 0.85,
      verdictReason: "高利润",
    },
    {
      productName: "测试品",
      platform: "拼多多",
      platformKey: "pdd",
      sellPrice: 169,
      purchaseCost: 75,
      monthlySales: 200,
      costs: {
        commissionFee: 3.38, fixedFeePerItem: 0, shippingInsurance: 0.85,
        influencerCommission: 0, shippingCost: 3, adCost: 0,
        returnLoss: 8.45, taxComplianceCost: 0.25, totalCost: 90.93,
      },
      netProfitPerItem: 78.07, netProfitMonthly: 15614, profitMargin: 46.21,
      roi: 104.09, verdict: "buy_more", verdictConfidence: 0.85,
      verdictReason: "高利润",
    },
  ];

  it("应正确识别最佳/最差平台", () => {
    const match = {
      groupId: "g1",
      products: [
        { id: "p1", name: "测试品", platform: "tmall", price: 199, monthlySales: 100 },
        { id: "p2", name: "测试品", platform: "pdd", price: 169, monthlySales: 200 },
      ],
      avgSimilarity: 0.8,
      confidence: "high" as const,
    };
    const comparison = buildCrossPlatformComparison(match, mockProfitResults);
    expect(comparison).not.toBeNull();
    expect(comparison!.bestPlatform).toBe("天猫");
    expect(comparison!.worstPlatform).toBe("拼多多");
  });

  it("应正确计算价差", () => {
    const match = {
      groupId: "g1",
      products: [
        { id: "p1", name: "测试品", platform: "tmall", price: 199, monthlySales: 100 },
        { id: "p2", name: "测试品", platform: "pdd", price: 169, monthlySales: 200 },
      ],
      avgSimilarity: 0.8,
      confidence: "high" as const,
    };
    const comparison = buildCrossPlatformComparison(match, mockProfitResults);
    expect(comparison).not.toBeNull();
    expect(comparison!.priceSpread).toBeCloseTo(30, 2);
    expect(comparison!.priceSpreadRatio).toBeGreaterThan(0);
  });
});
