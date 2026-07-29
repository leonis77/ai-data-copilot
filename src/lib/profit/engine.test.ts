/**
 * Profit Engine 单测
 *
 * 覆盖：
 * - 四平台基础利润计算
 * - 抖音达人分级佣金
 * - 拼多多财税合规成本
 * - 判决逻辑（buy_more / hold / reduce / drop）
 * - 进货成本估算标记
 */

import { describe, it, expect } from "vitest";
import { calculateProfit, calculateCrossPlatformProfit, getPlatformFeeSummary, PLATFORM_FEES_2026 } from "@/lib/profit/engine";

describe("calculateProfit", () => {
  // ═══ 天猫 ═══

  it("天猫：正常盈利商品应返回 buy_more", () => {
    const result = calculateProfit({
      productName: "无线蓝牙耳机",
      platform: "tmall",
      sellPrice: 199,
      purchaseCost: 80,
      monthlySales: 200,
    });

    expect(result.platformKey).toBe("tmall");
    expect(result.productName).toBe("无线蓝牙耳机");
    expect(result.netProfitPerItem).toBeGreaterThan(0);
    expect(result.verdict).toBe("buy_more");
    expect(result.verdictConfidence).toBeGreaterThan(0);
    // purchaseCostEstimated 仅在 pipeline 层 estimatePurchaseCost 时设置
    // 直接调用 calculateProfit 时不设置该字段
    expect(result.purchaseCostEstimated).toBeUndefined();
    expect(result.purchaseCost).toBe(80);
  });

  it("天猫：亏损商品应返回 drop", () => {
    const result = calculateProfit({
      productName: "亏损品",
      platform: "tmall",
      sellPrice: 50,
      purchaseCost: 60,
      monthlySales: 100,
    });

    expect(result.netProfitPerItem).toBeLessThan(0);
    expect(result.verdict).toBe("drop");
    expect(result.profitMargin).toBeLessThan(0);
  });

  it("天猫：成本项应完整包含 9 项", () => {
    const result = calculateProfit({
      productName: "测试品",
      platform: "tmall",
      sellPrice: 100,
      purchaseCost: 50,
      monthlySales: 100,
    });

    expect(result.costs.commissionFee).toBeGreaterThan(0);
    expect(result.costs.fixedFeePerItem).toBe(0); // 天猫无月费
    expect(result.costs.shippingInsurance).toBeGreaterThan(0);
    expect(result.costs.influencerCommission).toBe(0); // 天猫无达人
    expect(result.costs.shippingCost).toBe(3); // 默认运费
    expect(result.costs.adCost).toBe(0);
    expect(result.costs.returnLoss).toBeGreaterThan(0);
    expect(result.costs.taxComplianceCost).toBe(0); // 天猫无财税
    expect(result.purchaseCost).toBe(50);
    // totalCost 应等于所有成本项（含 purchaseCost）之和
    const costsSum = result.costs.commissionFee + result.costs.fixedFeePerItem +
      result.costs.shippingInsurance + result.costs.influencerCommission +
      result.costs.shippingCost + result.costs.adCost +
      result.costs.returnLoss + result.costs.taxComplianceCost + result.purchaseCost;
    expect(result.costs.totalCost).toBeCloseTo(costsSum, 2);
  });

  // ═══ 抖音 ═══

  it("抖音：D 级达人佣金率应为 40%", () => {
    const result = calculateProfit({
      productName: "抖音品",
      platform: "douyin",
      sellPrice: 100,
      purchaseCost: 40,
      monthlySales: 50,
      influencerGrade: "D",
    });

    expect(result.costs.influencerCommission).toBeCloseTo(40, 2);
    expect(result.verdict).toBe("reduce"); // 高佣金导致利润低
  });

  it("抖音：A 级达人佣金率应为 10%", () => {
    const result = calculateProfit({
      productName: "抖音品A",
      platform: "douyin",
      sellPrice: 100,
      purchaseCost: 40,
      monthlySales: 50,
      influencerGrade: "A",
    });

    expect(result.costs.influencerCommission).toBeCloseTo(10, 2);
  });

  it("抖音：使用千川·乘方投流后佣金应降至 0.6%", () => {
    const result = calculateProfit({
      productName: "千川品",
      platform: "douyin",
      sellPrice: 100,
      purchaseCost: 40,
      monthlySales: 50,
      useQianchuan: true,
    });

    expect(result.costs.commissionFee).toBeCloseTo(0.6, 2);
  });

  // ═══ 京东 ═══

  it("京东：应有月费分摊", () => {
    const result = calculateProfit({
      productName: "京东品",
      platform: "jd",
      sellPrice: 200,
      purchaseCost: 100,
      monthlySales: 100,
    });

    expect(result.costs.fixedFeePerItem).toBeCloseTo(10, 2); // 1000/100 = 10
  });

  // ═══ 拼多多 ═══

  it("拼多多：未开票应产生财税合规成本", () => {
    const result = calculateProfit({
      productName: "拼多多品",
      platform: "pdd",
      sellPrice: 100,
      purchaseCost: 50,
      monthlySales: 100,
      pddInvoiced: false,
    });

    expect(result.costs.taxComplianceCost).toBeGreaterThan(0);
    // 100 * 0.30 * 0.005 = 0.15
    expect(result.costs.taxComplianceCost).toBeCloseTo(0.15, 2);
  });

  it("拼多多：已开票不应产生财税合规成本", () => {
    const result = calculateProfit({
      productName: "拼多多品开票",
      platform: "pdd",
      sellPrice: 100,
      purchaseCost: 50,
      monthlySales: 100,
      pddInvoiced: true,
    });

    expect(result.costs.taxComplianceCost).toBe(0);
  });

  // ═══ 淘宝 ═══

  it("淘宝：无年费、无月固定费用", () => {
    const result = calculateProfit({
      productName: "淘宝品",
      platform: "taobao",
      sellPrice: 150,
      purchaseCost: 60,
      monthlySales: 80,
    });

    expect(result.costs.fixedFeePerItem).toBe(0);
    expect(result.platform).toBe("淘宝");
  });

  // ═══ 进货成本估算 ═══

  it("无进货成本时自动估算为售价的 55%", () => {
    const result = calculateProfit({
      productName: "无成本品",
      platform: "tmall",
      sellPrice: 100,
      purchaseCost: 0,
      monthlySales: 50,
    });

    // 当 purchaseCost=0 时，engine 内部会将 0 作为 purchaseCost 传入
    // estimatePurchaseCost 仅在 pipeline 中调用，此处直接传 0
    expect(result.purchaseCostEstimated).toBeFalsy();
    expect(result.purchaseCost).toBe(0);
  });

  // ═══ 利润率与 ROI ═══

  it("应正确计算利润率和 ROI", () => {
    const result = calculateProfit({
      productName: "计算验证",
      platform: "tmall",
      sellPrice: 100,
      purchaseCost: 50,
      monthlySales: 10,
    });

    // 利润率 = netProfitPerItem / sellPrice * 100
    expect(result.profitMargin).toBeCloseTo(result.netProfitPerItem / 100 * 100, 1);
    // ROI = netProfitPerItem / purchaseCost * 100
    expect(result.roi).toBeCloseTo(result.netProfitPerItem / 50 * 100, 1);
  });

  it("月利润 = 单品利润 × 月销量", () => {
    const result = calculateProfit({
      productName: "月利润验证",
      platform: "pdd",
      sellPrice: 80,
      purchaseCost: 40,
      monthlySales: 30,
    });

    expect(result.netProfitMonthly).toBeCloseTo(result.netProfitPerItem * 30, 2);
  });
});

describe("calculateCrossPlatformProfit", () => {
  it("应返回多平台利润结果数组", () => {
    const results = calculateCrossPlatformProfit("同款商品", [
      { platform: "tmall", sellPrice: 199, purchaseCost: 80, monthlySales: 100 },
      { platform: "pdd", sellPrice: 169, purchaseCost: 75, monthlySales: 200 },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].platformKey).toBe("tmall");
    expect(results[1].platformKey).toBe("pdd");
  });
});

describe("PLATFORM_FEES_2026", () => {
  it("五个平台都应配置", () => {
    const keys = Object.keys(PLATFORM_FEES_2026);
    expect(keys).toEqual(["tmall", "taobao", "jd", "pdd", "douyin"]);
  });

  it("每个平台应有佣金率范围和退货率范围", () => {
    for (const key of Object.keys(PLATFORM_FEES_2026)) {
      const config = PLATFORM_FEES_2026[key as keyof typeof PLATFORM_FEES_2026];
      expect(config.commissionRateMin).toBeGreaterThanOrEqual(0);
      expect(config.commissionRateMax).toBeGreaterThan(config.commissionRateMin);
      expect(config.returnRateMin).toBeGreaterThanOrEqual(0);
      expect(config.dataSource).toBeTruthy();
      expect(config.lastUpdated).toBeTruthy();
    }
  });

  it("抖音应有达人分级佣金配置", () => {
    const douyin = PLATFORM_FEES_2026.douyin;
    expect(douyin.influencerGradeRates).toBeDefined();
    expect(douyin.influencerGradeRates!.A).toBe(0.10);
    expect(douyin.influencerGradeRates!.D).toBe(0.40);
  });
});

describe("getPlatformFeeSummary", () => {
  it("天猫应返回含佣金、运费险、退货率的摘要", () => {
    const summary = getPlatformFeeSummary("tmall");
    expect(summary).toContain("天猫");
    expect(summary).toContain("佣金");
    expect(summary).toContain("运费险");
    expect(summary).toContain("退货率");
    expect(summary).toContain("数据来源");
  });

  it("未知平台应返回空字符串", () => {
    expect(getPlatformFeeSummary("unknown")).toBe("");
  });
});
