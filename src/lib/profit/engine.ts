/**
 * ProcureWise 利润计算引擎 v1.0
 *
 * 2026年四大平台真实费率配置 + 达人佣金分级计算
 *
 * 数据来源铁律：所有费率数据来源于四大平台官方公告（2026年7月最新）
 *   - 天猫商家中心 (sell.tmall.com)
 *   - 京东商家中心 (shop.jd.com)
 *   - 拼多多商家后台 (mms.pinduoduo.com)
 *   - 抖音电商学习中心 (school.jinritemai.com)
 *
 * 核心能力：
 *   1. 四平台独立费率引擎（佣金/月费/运费险/退货损耗/结算周期）
 *   2. 抖音达人A/B/C/D级佣金分级计算（2026年6月生效）
 *   3. 拼多多财税合规成本建模（未开票冻结30%资金）
 *   4. 千川·乘方投流优惠联动（投流→佣金0.6%）
 *   5. 真实利润 = 售价 - 平台扣费 - 达人佣金 - 进货成本 - 运费 - 广告费 - 退货损耗
 */

// ═══════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════

export interface PlatformFeeConfig {
  platformKey: string;
  platformName: string;
  /** 佣金率范围 */
  commissionRateMin: number;
  commissionRateMax: number;
  commissionRateTypical: number;
  /** 月固定费用（元） */
  monthlyFixedFee: number;
  /** 年费（元） */
  annualFee: number;
  annualFeeNote: string;
  /** 保证金范围（元） */
  depositMin: number;
  depositMax: number;
  /** 运费险比例 */
  shippingInsuranceRate: number;
  /** 达人佣金（抖音专属） */
  influencerCommissionRate?: number;
  influencerGradeRates?: {
    A: number;
    B_plus: number;
    C: number;
    D: number;
  };
  /** 退货率范围 */
  returnRateMin: number;
  returnRateMax: number;
  /** 结算周期 */
  settlementDays: string;
  /** 2026年政策要点 */
  policy2026: string;
  /** 元数据 */
  lastUpdated: string;
  dataSource: string;
}

export interface ProductProfitInput {
  productName: string;
  platform: "tmall" | "taobao" | "jd" | "pdd" | "douyin";
  /** 售价（元） */
  sellPrice: number;
  /** 进货成本（元） */
  purchaseCost: number;
  /** 月销量 */
  monthlySales: number;
  /** 运费（元/件） */
  shippingCost?: number;
  /** 广告费分摊（元/件） */
  adCostPerItem?: number;
  /** 退货率（用户实际数据） */
  actualReturnRate?: number;
  /** 抖音达人等级 */
  influencerGrade?: "A" | "B_plus" | "C" | "D";
  /** 是否使用千川·乘方投流（抖音专属） */
  useQianchuan?: boolean;
  /** 拼多多是否已开票 */
  pddInvoiced?: boolean;
}

export interface CostBreakdown {
  commissionFee: number;
  fixedFeePerItem: number;
  shippingInsurance: number;
  influencerCommission: number;
  shippingCost: number;
  adCost: number;
  returnLoss: number;
  taxComplianceCost: number;
  totalCost: number;
}

export interface ProfitResult {
  productName: string;
  platform: string;
  platformKey: string;
  sellPrice: number;
  purchaseCost: number;
  /** 成本明细 */
  costs: CostBreakdown;
  /** 真实利润（元/件） */
  netProfitPerItem: number;
  /** 总利润（月） */
  netProfitMonthly: number;
  /** 利润率 */
  profitMargin: number;
  /** ROI */
  roi: number;
  /** AI判决 */
  verdict: "buy_more" | "hold" | "reduce" | "drop";
  verdictConfidence: number;
  verdictReason: string;
}

// ═══════════════════════════════════════════════
// 2026年四大平台真实费率配置
// ═══════════════════════════════════════════════

export const PLATFORM_FEES_2026: Record<string, PlatformFeeConfig> = {
  tmall: {
    platformKey: "tmall",
    platformName: "天猫",
    commissionRateMin: 0.005, commissionRateMax: 0.10, commissionRateTypical: 0.05,
    monthlyFixedFee: 0, annualFee: 0,
    annualFeeNote: "2026年新商免年费（原3万/6万两档），达标可返还",
    depositMin: 10000, depositMax: 150000,
    shippingInsuranceRate: 0.01,
    returnRateMin: 0.03, returnRateMax: 0.08,
    settlementDays: "确认收货后",
    policy2026: "新商红利年：免年费+300万激励+20项普惠权益，但'服务即增长'—服务分低的店铺获取流量困难",
    lastUpdated: "2026-07-06",
    dataSource: "天猫商家中心2026年费率公告",
  },
  taobao: {
    platformKey: "taobao",
    platformName: "淘宝",
    commissionRateMin: 0.02, commissionRateMax: 0.05, commissionRateTypical: 0.03,
    monthlyFixedFee: 0, annualFee: 0,
    annualFeeNote: "C店无年费",
    depositMin: 1000, depositMax: 10000,
    shippingInsuranceRate: 0.0075,
    returnRateMin: 0.03, returnRateMax: 0.08,
    settlementDays: "确认收货后（约7-15天）",
    policy2026: "强化内容化和直播，部分类目有流量扶持",
    lastUpdated: "2026-07-06",
    dataSource: "淘宝商家中心2026年规则",
  },
  jd: {
    platformKey: "jd",
    platformName: "京东",
    commissionRateMin: 0.02, commissionRateMax: 0.10, commissionRateTypical: 0.06,
    monthlyFixedFee: 1000, annualFee: 12000,
    annualFeeNote: "部分类目月费500元或免费",
    depositMin: 30000, depositMax: 100000,
    shippingInsuranceRate: 0, // 含物流体系
    returnRateMin: 0.02, returnRateMax: 0.05,
    settlementDays: "POP:T+1~2天 / 自营:30-60天协商",
    policy2026: "降佣+返佣并举，部分类目返佣至广告账户。POP结算快，自营资金压力大",
    lastUpdated: "2026-07-06",
    dataSource: "京东商家中心2026年规则",
  },
  pdd: {
    platformKey: "pdd",
    platformName: "拼多多",
    commissionRateMin: 0.006, commissionRateMax: 0.05, commissionRateTypical: 0.02,
    monthlyFixedFee: 0, annualFee: 0,
    annualFeeNote: "无年费",
    depositMin: 1000, depositMax: 2000,
    shippingInsuranceRate: 0.005,
    returnRateMin: 0.05, returnRateMax: 0.15,
    settlementDays: "确认收货后（约7-15天）",
    policy2026: "百亿补贴门槛降低（不再要求全网最低价），但财税合规趋严：未开票→冻结30%资金",
    lastUpdated: "2026-07-06",
    dataSource: "拼多多商家后台2026年规则中心",
  },
  douyin: {
    platformKey: "douyin",
    platformName: "抖音",
    commissionRateMin: 0.006, commissionRateMax: 0.05, commissionRateTypical: 0.02,
    monthlyFixedFee: 0, annualFee: 0,
    annualFeeNote: "0元入驻，34个一级类目保证金最高降85%",
    depositMin: 500, depositMax: 50000,
    shippingInsuranceRate: 0.02,
    influencerCommissionRate: 0.20,
    influencerGradeRates: {
      A: 0.10,
      B_plus: 0.15,
      C: 0.20,
      D: 0.40,
    },
    returnRateMin: 0.08, returnRateMax: 0.20,
    settlementDays: "体验分≥4.4:4天 / <4.4:10天 / 新手期:14-30天",
    policy2026: "'工具换优惠'模式：使用千川·乘方推广→佣金降至0.6%；达人分级制→超六成达人获A/B+级，D级达人成本翻倍",
    lastUpdated: "2026-07-06",
    dataSource: "抖音电商2026年6月达人服务费分级制公告",
  },
};

// ═══════════════════════════════════════════════
// 利润计算核心
// ═══════════════════════════════════════════════

/**
 * 计算单个商品在指定平台的真实利润
 */
export function calculateProfit(input: ProductProfitInput): ProfitResult {
  const feeConfig = PLATFORM_FEES_2026[input.platform];
  if (!feeConfig) {
    throw new Error(`Unknown platform: ${input.platform}. Supported: tmall, taobao, jd, pdd, douyin`);
  }

  const shippingCost = input.shippingCost ?? 3; // 默认运费3元
  const adCost = input.adCostPerItem ?? 0;
  const actualReturnRate = input.actualReturnRate ?? feeConfig.returnRateMin;

  // 1. 平台佣金
  let commissionRate = feeConfig.commissionRateTypical;
  // 抖音：使用千川·乘方 → 佣金0.6%
  if (input.platform === "douyin" && input.useQianchuan) {
    commissionRate = 0.006;
  }
  const commissionFee = input.sellPrice * commissionRate;

  // 2. 固定费用分摊到单品
  let fixedFeePerItem = 0;
  if (feeConfig.monthlyFixedFee > 0 && input.monthlySales > 0) {
    fixedFeePerItem = feeConfig.monthlyFixedFee / input.monthlySales;
  }

  // 3. 运费险
  const shippingInsurance = input.sellPrice * feeConfig.shippingInsuranceRate;

  // 4. 达人佣金（抖音专属）
  let influencerCommission = 0;
  if (input.platform === "douyin" && feeConfig.influencerGradeRates) {
    const grade = input.influencerGrade || "C"; // 默认C级
    const gradeRate = feeConfig.influencerGradeRates[grade];
    influencerCommission = input.sellPrice * gradeRate;
  }

  // 5. 退货损耗
  const returnLoss = input.sellPrice * actualReturnRate;

  // 6. 财税合规成本（拼多多专属）
  let taxComplianceCost = 0;
  if (input.platform === "pdd" && !input.pddInvoiced) {
    // 未开票冻结30%资金 → 隐性资金成本 = 冻结金额 × 月资金成本率 × 周转月数
    // 简化为：月流水 × 30% × 0.5%
    taxComplianceCost = input.sellPrice * 0.30 * 0.005;
  }

  // 总成本
  const totalCost = commissionFee + fixedFeePerItem + shippingInsurance
    + influencerCommission + shippingCost + adCost + returnLoss
    + taxComplianceCost + input.purchaseCost;

  // 真实利润
  const netProfitPerItem = input.sellPrice - totalCost;
  const profitMargin = input.sellPrice > 0 ? netProfitPerItem / input.sellPrice : 0;
  const netProfitMonthly = netProfitPerItem * input.monthlySales;
  const roi = input.purchaseCost > 0 ? netProfitPerItem / input.purchaseCost : 0;

  // AI判决
  const { verdict, verdictConfidence, verdictReason } = computeVerdict(
    netProfitPerItem, profitMargin, roi, input,
  );

  return {
    productName: input.productName,
    platform: feeConfig.platformName,
    platformKey: feeConfig.platformKey,
    sellPrice: input.sellPrice,
    purchaseCost: input.purchaseCost,
    costs: {
      commissionFee: Math.round(commissionFee * 100) / 100,
      fixedFeePerItem: Math.round(fixedFeePerItem * 100) / 100,
      shippingInsurance: Math.round(shippingInsurance * 100) / 100,
      influencerCommission: Math.round(influencerCommission * 100) / 100,
      shippingCost,
      adCost,
      returnLoss: Math.round(returnLoss * 100) / 100,
      taxComplianceCost: Math.round(taxComplianceCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
    },
    netProfitPerItem: Math.round(netProfitPerItem * 100) / 100,
    netProfitMonthly: Math.round(netProfitMonthly * 100) / 100,
    profitMargin: Math.round(profitMargin * 10000) / 100,
    roi: Math.round(roi * 10000) / 100,
    verdict,
    verdictConfidence,
    verdictReason,
  };
}

/**
 * 批量计算（同一商品在多个平台的利润对比）
 */
export function calculateCrossPlatformProfit(
  productName: string,
  platforms: Omit<ProductProfitInput, "productName">[],
): ProfitResult[] {
  return platforms.map(p => calculateProfit({ productName, ...p }));
}

/**
 * AI判决逻辑
 */
function computeVerdict(
  netProfitPerItem: number,
  profitMargin: number,
  roi: number,
  input: ProductProfitInput,
): { verdict: ProfitResult["verdict"]; verdictConfidence: number; verdictReason: string } {
  // 亏损品 → 砍掉或减量
  if (netProfitPerItem < 0) {
    if (profitMargin < -0.10) {
      return {
        verdict: "drop",
        verdictConfidence: 0.90,
        verdictReason: `单品亏损¥${Math.abs(Math.round(netProfitPerItem * 100) / 100)}（利润率${Math.round(profitMargin * 100)}%），建议立即停止采购或大幅提价`,
      };
    }
    return {
      verdict: "reduce",
      verdictConfidence: 0.75,
      verdictReason: `单品微亏¥${Math.abs(Math.round(netProfitPerItem * 100) / 100)}，建议减量观察或调整售价/降低成本`,
    };
  }

  // 高利润品 → 加量
  if (profitMargin > 0.20 && roi > 0.30) {
    return {
      verdict: "buy_more",
      verdictConfidence: 0.85,
      verdictReason: `利润率${Math.round(profitMargin * 100)}%，ROI ${Math.round(roi * 100)}%，高利润品建议加量采购`,
    };
  }

  // 中等利润 → 维持
  if (profitMargin > 0.05) {
    return {
      verdict: "hold",
      verdictConfidence: 0.70,
      verdictReason: `利润率${Math.round(profitMargin * 100)}%，属于健康区间，维持现有采购策略`,
    };
  }

  // 低利润 → 减量
  return {
    verdict: "reduce",
    verdictConfidence: 0.60,
    verdictReason: `利润率仅${Math.round(profitMargin * 100)}%，低于健康水平，建议评估优化空间`,
  };
}

// ═══════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════

/** 获取平台费率摘要（用于AI prompt注入） */
export function getPlatformFeeSummary(platform: string): string {
  const config = PLATFORM_FEES_2026[platform];
  if (!config) return "";

  let summary = `**${config.platformName}**：佣金${config.commissionRateMin * 100}-${config.commissionRateMax * 100}%（典型${config.commissionRateTypical * 100}%）`;
  if (config.monthlyFixedFee > 0) summary += `，月费¥${config.monthlyFixedFee}`;
  if (config.annualFee > 0) summary += `，年费¥${config.annualFee}`;
  summary += `，运费险${config.shippingInsuranceRate * 100}%`;

  if (config.influencerGradeRates) {
    summary += `\n  达人佣金分级：A级${config.influencerGradeRates.A * 100}%+返现、B+级${config.influencerGradeRates.B_plus * 100}%、C级${config.influencerGradeRates.C * 100}%、D级${config.influencerGradeRates.D * 100}%`;
  }

  summary += `\n  退货率范围：${config.returnRateMin * 100}-${config.returnRateMax * 100}%，结算：${config.settlementDays}`;
  summary += `\n  2026年政策：${config.policy2026}`;
  summary += `\n  数据来源：${config.dataSource}（更新于${config.lastUpdated}）`;

  return summary;
}

/** 获取所有平台的费率摘要（用于AI system prompt） */
export function getAllPlatformFeeSummary(): string {
  return Object.keys(PLATFORM_FEES_2026)
    .map(key => getPlatformFeeSummary(key))
    .join("\n\n");
}

/** 计算抖音达人分级对利润的影响 */
export function calculateInfluencerImpact(
  sellPrice: number,
  monthlySales: number,
): Array<{ grade: string; commission: number; netProfit: number; label: string }> {
  const config = PLATFORM_FEES_2026.douyin;
  if (!config.influencerGradeRates) return [];

  return Object.entries(config.influencerGradeRates).map(([grade, rate]) => {
    const commission = sellPrice * rate;
    const netProfit = sellPrice - commission;
    const label = grade === "A" ? "A级·10%+返现（推荐）" :
      grade === "B_plus" ? "B+级·15%" :
      grade === "C" ? "C级·20%（基准）" :
      "D级·40%（⚠️ 避免使用）";
    return { grade, commission: Math.round(commission * 100) / 100, netProfit: Math.round(netProfit * 100) / 100, label };
  });
}
