/**
 * Industry Benchmark Lookup
 *
 * 根据商品利润数据匹配行业基准，返回可对比的参考值。
 *
 * 匹配策略：
 * 1. 从 KNOWLEDGE 中筛选 category === "industry_benchmark" 的条目
 * 2. 根据商品名/平台匹配最相关的 benchmark
 * 3. 返回结构化对比数据
 */

import { KNOWLEDGE } from "@/lib/rag/knowledge";
import type { ProfitResult } from "@/lib/profit/engine";

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export interface BenchmarkMatch {
  /** 匹配的基准条目 ID */
  benchmarkId: string;
  /** 基准标题 */
  title: string;
  /** 基准内容摘要 */
  summary: string;
  /** 来源 */
  source: string;
  /** 置信度 */
  confidence: number;
  /** 具体指标对比 */
  metrics: BenchmarkMetric[];
}

export interface BenchmarkMetric {
  /** 指标名称 */
  name: string;
  /** 你的值 */
  userValue: number;
  /** 行业基准值（可能是范围） */
  benchmarkValue: number | [number, number];
  /** 对比结果：better / within / worse */
  status: "better" | "within" | "worse";
  /** 对比说明 */
  message: string;
}

// ═══════════════════════════════════════════════
// Category Detection from Product Name
// ═══════════════════════════════════════════════

var CATEGORY_KEYWORDS: Record<string, string[]> = {
  clothing: ["服装", "衣服", "T恤", "衬衫", "裤子", "裙子", "连衣裙", "外套", "风衣", "羽绒服", "棉服", "卫衣", "毛衣", "针织衫", "大衣", "西装", "夹克", "运动裤", "牛仔裤", "休闲裤", "运动鞋", "跑步鞋", "板鞋", "凉鞋", "拖鞋", "帽子", "围巾", "手套", "袜子", "内衣", "睡衣", "家居服", "泳衣", "瑜伽服", "健身服", "冲锋衣", "防晒衣", "polo衫", "领带", "皮带", "箱包", "双肩包", "手提包", "钱包", "服饰", "clothing", "shirt", "pants", "dress", "shoes", "sneaker", "jacket", "coat", "hat", "bag", "backpack"],
  beauty: ["美妆", "护肤", "化妆品", "口红", "粉底", "面膜", "精华", "乳液", "面霜", "眼霜", "防晒霜", "隔离", "腮红", "眼影", "睫毛膏", "眉笔", "卸妆", "护手霜", "身体乳", "香水", "彩妆", "beauty", "skincare", "makeup", "cosmetic", "serum", "toner"],
  electronics: ["手机", "电脑", "笔记本", "平板", "耳机", "充电器", "数据线", "手机壳", "键盘", "鼠标", "3C", "数码", "电子", "台式机", "显示器", "摄像头", "音箱", "智能手表", "手环", "平板电脑", "路由器", "移动电源", "充电宝", "存储卡", "U盘", "投影仪", "打印机", "扫描仪", "electronics", "phone", "tablet", "headphone", "charger", "laptop", "monitor", "camera", "speaker"],
  food: ["食品", "零食", "饮料", "奶粉", "坚果", "饼干", "糖果", "巧克力", "面包", "方便面", "蛋糕", "糕点", "蜜饯", "果干", "肉干", "海苔", "麦片", "冲饮", "咖啡", "茶叶", "蜂蜜", "调味品", "酱料", "食用油", "大米", "面粉", "速食", "火腿肠", "辣条", "果冻", "布丁", "food", "snack", "drink", "milk", "coffee", "tea"],
  home: ["家居", "收纳", "毛巾", "床单", "枕头", "餐具", "保温杯", "灯具", "装饰", "垃圾桶", "保鲜盒", "衣架", "鞋柜", "书架", "洗衣液", "垃圾袋", "保鲜袋", "棉签", "纸巾", "抽纸", "卷纸", "湿巾", "home", "kitchen", "storage", "towel"],
  maternal: ["母婴", "婴儿", "奶粉", "尿不湿", "童装", "童鞋", "玩具", "积木", "娃娃", "maternal", "baby", "toy", "diaper"],
  sports: ["运动鞋", "瑜伽", "跑步", "篮球", "足球", "羽毛球", "乒乓球", "游泳", "帐篷", "登山", "骑行", "钓鱼", "滑雪", "sports", "fitness", "yoga", "running", "dumbbell", "tent", "sleeping-bag"],
  jewelry: ["珠宝", "戒指", "项链", "手链", "耳环", "钻石", "黄金", "银饰", "手表", "翡翠", "珍珠", "宝石", "jewelry", "ring", "necklace", "bracelet", "earring"],
  appliance: ["冰箱", "洗衣机", "空调", "电视", "微波炉", "烤箱", "电饭煲", "吸尘器", "风扇", "饮水机", "热水器", "电吹风", "剃须刀", "电动牙刷", "挂烫机", "appliance", "refrigerator", "washer", "microwave", "oven", "vacuum"],
};

/**
 * 从商品名称推断品类
 *
 * 注意：中文关键词按"字命中"匹配（如 "裙" 命中 "连衣裙"），
 * 英文/Latin 关键词按子串匹配。这是因为中文词没有天然空格边界，
 * 逐字命中比固定子串召回率更高。
 */
const CJK_REGEX = /[一-鿿]/;

export function detectCategory(productName: string): string | null {
  const name = productName.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      const lowered = kw.toLowerCase();

      // CJK 命中逻辑
      const cjkChars = Array.from(lowered).filter(function(ch) { return CJK_REGEX.test(ch); });
      if (cjkChars.length > 0) {
        // 多字 CJK 词（≥2字）：子串匹配，保证 "裙子"→"连衣裙"
        // 单字 CJK 词：只匹配商品名开头，防止 "手" 误命中 "手机"/"手套"
        if (
          cjkChars.length >= 2
            ? name.includes(cjkChars.join(""))
            : name.startsWith(cjkChars[0])
        ) {
          return category;
        }
        // 含 CJK 的词不走纯拉丁子串匹配
        continue;
      }

      // 纯拉丁关键词：长度≥3 用子串匹配（2 字母词如 "pc" 仍可能误匹配）
      // 长度 2 的纯拉丁词用 \b 单词边界避免 "s" 匹配进 "Pro" / "shoes"
      if (lowered.length >= 3) {
        if (name.includes(lowered)) {
          return category;
        }
      } else if (lowered.length === 2) {
        // "pc" 这种短词需要 \b 边界；否则 "s" 会匹配进 "Pro"
        var re = new RegExp("\\b" + lowered.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
        if (re.test(name)) {
          return category;
        }
      }
      // 长度 1 的纯拉丁关键词跳过，防止 "s" / "p" / "c" 单字母误匹配
    }
  }

  return null;
}

// ═══════════════════════════════════════════════
// Benchmark Data (structured)
// ═══════════════════════════════════════════════

interface CategoryBenchmark {
  category: string;
  benchmarkId: string;
  title: string;
  grossMarginRange: [number, number];
  netMarginRange: [number, number];
  returnRateRange: [number, number];
  adSpendRatioRange: [number, number];
  source: string;
  confidence: number;
}

var CATEGORY_BENCHMARKS: CategoryBenchmark[] = [
  {
    category: "clothing",
    benchmarkId: "benchmark_category_clothing",
    title: "服装鞋包类目",
    grossMarginRange: [40, 65],
    netMarginRange: [16, 39],
    returnRateRange: [15, 25],
    adSpendRatioRange: [15, 25],
    source: "天猫服饰行业报告2026",
    confidence: 0.80,
  },
  {
    category: "beauty",
    benchmarkId: "benchmark_category_beauty",
    title: "美妆个护类目",
    grossMarginRange: [50, 70],
    netMarginRange: [20, 42],
    returnRateRange: [5, 10],
    adSpendRatioRange: [20, 35],
    source: "天猫美妆行业报告2026",
    confidence: 0.78,
  },
  {
    category: "electronics",
    benchmarkId: "benchmark_category_electronics",
    title: "3C数码类目",
    grossMarginRange: [10, 25],
    netMarginRange: [4, 15],
    returnRateRange: [2, 5],
    adSpendRatioRange: [10, 20],
    source: "京东3C行业报告2026",
    confidence: 0.80,
  },
  {
    category: "food",
    benchmarkId: "benchmark_category_food",
    title: "食品饮料类目",
    grossMarginRange: [20, 40],
    netMarginRange: [8, 24],
    returnRateRange: [1, 3],
    adSpendRatioRange: [10, 20],
    source: "天猫食品行业报告2026",
    confidence: 0.75,
  },
  {
    category: "home",
    benchmarkId: "benchmark_category_home",
    title: "家居日用类目",
    grossMarginRange: [30, 50],
    netMarginRange: [12, 30],
    returnRateRange: [3, 8],
    adSpendRatioRange: [12, 22],
    source: "天猫家居行业报告2026",
    confidence: 0.75,
  },
  {
    category: "maternal",
    benchmarkId: "benchmark_category_maternal",
    title: "母婴用品类目",
    grossMarginRange: [25, 45],
    netMarginRange: [10, 27],
    returnRateRange: [3, 6],
    adSpendRatioRange: [15, 25],
    source: "天猫母婴行业报告2026",
    confidence: 0.78,
  },
  {
    category: "sports",
    benchmarkId: "benchmark_category_sports",
    title: "运动户外类目",
    grossMarginRange: [35, 55],
    netMarginRange: [14, 33],
    returnRateRange: [5, 10],
    adSpendRatioRange: [15, 25],
    source: "天猫运动户外行业报告2026",
    confidence: 0.75,
  },
  {
    category: "jewelry",
    benchmarkId: "benchmark_category_jewelry",
    title: "珠宝饰品类目",
    grossMarginRange: [45, 70],
    netMarginRange: [18, 42],
    returnRateRange: [8, 15],
    adSpendRatioRange: [10, 20],
    source: "天猫珠宝行业报告2026",
    confidence: 0.75,
  },
  {
    category: "appliance",
    benchmarkId: "benchmark_category_appliance",
    title: "家电类目",
    grossMarginRange: [15, 35],
    netMarginRange: [6, 21],
    returnRateRange: [3, 7],
    adSpendRatioRange: [8, 18],
    source: "京东家电行业报告2026",
    confidence: 0.75,
  },
];

// ═══════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════

/**
 * 为单个商品利润结果匹配行业基准
 */
export function matchBenchmark(profitResult: ProfitResult): BenchmarkMatch | null {
  const category = detectCategory(profitResult.productName);
  if (!category) return null;

  const benchmark = CATEGORY_BENCHMARKS.find(function(b) { return b.category === category; });
  if (!benchmark) return null;

  // 计算用户的实际毛利率（售价 - 进货成本）/ 售价
  const userGrossMargin = profitResult.sellPrice > 0
    ? ((profitResult.sellPrice - profitResult.purchaseCost) / profitResult.sellPrice) * 100
    : 0;

  // 用户净利率
  const userNetMargin = profitResult.profitMargin;

  // 广告费率（占售价比例）
  const userAdRatio = profitResult.sellPrice > 0
    ? (profitResult.costs.adCost / profitResult.sellPrice) * 100
    : 0;

  // 退货损失率
  const userReturnRate = profitResult.sellPrice > 0
    ? (profitResult.costs.returnLoss / profitResult.sellPrice) * 100
    : 0;

  const metrics: BenchmarkMetric[] = [
    {
      name: "毛利率",
      userValue: Math.round(userGrossMargin * 100) / 100,
      benchmarkValue: benchmark.grossMarginRange,
      status: classifyMetric(userGrossMargin, benchmark.grossMarginRange),
      message: buildMarginMessage(userGrossMargin, benchmark.grossMarginRange, "毛利率"),
    },
    {
      name: "净利率",
      userValue: Math.round(userNetMargin * 100) / 100,
      benchmarkValue: benchmark.netMarginRange,
      status: classifyMetric(userNetMargin, benchmark.netMarginRange),
      message: buildMarginMessage(userNetMargin, benchmark.netMarginRange, "净利率"),
    },
    {
      name: "退货率",
      userValue: Math.round(userReturnRate * 100) / 100,
      benchmarkValue: benchmark.returnRateRange,
      status: userReturnRate > benchmark.returnRateRange[1] ? "worse" : userReturnRate < benchmark.returnRateRange[0] ? "better" : "within",
      message: userReturnRate > benchmark.returnRateRange[1]
        ? "退货率高于行业均值，建议检查商品质量和详情页描述"
        : userReturnRate < benchmark.returnRateRange[0]
          ? "退货率低于行业均值，表现优秀"
          : "退货率在行业正常范围内",
    },
    {
      name: "广告费率",
      userValue: Math.round(userAdRatio * 100) / 100,
      benchmarkValue: benchmark.adSpendRatioRange,
      status: userAdRatio > benchmark.adSpendRatioRange[1] ? "worse" : userAdRatio < benchmark.adSpendRatioRange[0] ? "better" : "within",
      message: userAdRatio > benchmark.adSpendRatioRange[1]
        ? "广告费率高于行业均值，建议优化投放效率"
        : userAdRatio < benchmark.adSpendRatioRange[0]
          ? "广告费率低于行业均值，投放效率优秀"
          : "广告费率在行业正常范围内",
    },
  ];

  return {
    benchmarkId: benchmark.benchmarkId,
    title: benchmark.title + "行业基准对比",
    summary: "基于" + benchmark.source + "数据（置信度" + Math.round(benchmark.confidence * 100) + "%）",
    source: benchmark.source,
    confidence: benchmark.confidence,
    metrics,
  };
}

/**
 * 判断用户值 vs 基准范围的关系
 */
function classifyMetric(userValue: number, range: [number, number]): "better" | "within" | "worse" {
  if (userValue < range[0]) return "better";
  if (userValue > range[1]) return "worse";
  return "within";
}

/**
 * 构建利润率对比文案
 */
function buildMarginMessage(userValue: number, range: [number, number], label: string): string {
  if (userValue < range[0]) {
    return label + "低于行业均值（" + range[0] + "%-" + range[1] + "%），有优化空间";
  }
  if (userValue > range[1]) {
    return label + "高于行业均值（" + range[0] + "%-" + range[1] + "%），表现优秀";
  }
  return label + "在行业正常范围内（" + range[0] + "%-" + range[1] + "%）";
}

/**
 * 获取所有可用的品类基准列表
 */
export function listAvailableBenchmarks(): Array<{ category: string; title: string; confidence: number }> {
  return CATEGORY_BENCHMARKS.map(function(b) {
    return {
      category: b.category,
      title: b.title,
      confidence: b.confidence,
    };
  });
}

/**
 * 品类 → 知识库条目 ID 映射
 *
 * 用于 decision-pipeline 的 findRelatedKnowledgeRefs：
 * 根据商品品类自动引用对应的行业基准知识条目，
 * 使 EvidenceCard 的 knowledgeRefs / knowledgeConfidence 更完整。
 */
var CATEGORY_KNOWLEDGE_IDS: Record<string, string> = {
  clothing:   "benchmark_category_clothing",
  beauty:     "benchmark_category_beauty",
  electronics:"benchmark_category_electronics",
  food:       "benchmark_category_food",
  home:       "benchmark_category_home",
  maternal:   "benchmark_category_maternal",
  sports:     "benchmark_category_sports",
  jewelry:    "benchmark_category_jewelry",
  appliance:  "benchmark_category_appliance",
};

/**
 * 根据商品名推断品类并返回对应的知识库条目 ID 列表
 */
export function getCategoryKnowledgeRefs(productName: string): string[] {
  const category = detectCategory(productName);
  if (!category) return [];
  const refId = CATEGORY_KNOWLEDGE_IDS[category];
  return refId ? [refId] : [];
}
