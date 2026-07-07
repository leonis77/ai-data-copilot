/**
 * 行业检测引擎 v1.0
 *
 * 从用户上传的数据中检测行业（列名+品类名+价格区间），
 * 用于：1) 智能WebSearch触发判断 2) AI prompt行业上下文注入 3) 知识覆盖度评估
 *
 * 覆盖行业分类（基于四大平台类目体系交叉）：
 *   - 3c_digital: 手机/电脑/数码配件
 *   - apparel: 服装/鞋包/配饰
 *   - beauty: 美妆/个护
 *   - food: 食品/饮料/生鲜
 *   - home: 家居/日用/家纺
 *   -母婴: 母婴/玩具
 *   - sports: 运动/户外
 *   - jewelry: 珠宝/饰品/手表
 *   - appliance: 家电
 *   - industrial: 工业品/五金/紧固件
 *   - medical: 医疗器械/保健
 *   - auto: 汽车配件/用品
 *   - pet: 宠物用品
 *   - books: 图书/音像
 *   - other: 其他/未识别
 */

export interface IndustryResult {
  /** 检测到的行业代码 */
  industry: string;
  /** 行业中文名 */
  name: string;
  /** 置信度 0-1 */
  confidence: number;
  /** 检测依据 */
  evidence: string[];
  /** 是否为主流品类（知识库有覆盖的品类） */
  isMainstream: boolean;
}

// 行业关键词库（列名/品类词 → 行业映射）
const INDUSTRY_PATTERNS: Record<string, { name: string; keywords: string[]; priceRange: [number, number] }> = {
  "3c_digital": {
    name: "3C数码",
    keywords: ["手机", "电脑", "笔记本", "平板", "耳机", "充电器", "数据线", "手机壳", "键盘", "鼠标",
      "phone", "laptop", "tablet", "earphone", "charger", "cable", "keyboard", "mouse", "monitor"],
    priceRange: [20, 8000],
  },
  "apparel": {
    name: "服装鞋包",
    keywords: ["服装", "衣服", "T恤", "衬衫", "裤子", "裙子", "外套", "羽绒服", "鞋", "运动鞋", "靴子",
      "包", "背包", "女包", "配饰", "帽子", "围巾", "袜子", "内衣",
      "clothing", "shirt", "pants", "dress", "shoes", "sneakers", "boots", "bag", "hat", "socks"],
    priceRange: [15, 2000],
  },
  "beauty": {
    name: "美妆个护",
    keywords: ["美妆", "护肤", "化妆品", "口红", "粉底", "面膜", "精华", "乳液", "防晒", "洗面奶",
      "香水", "眼影", "卸妆", "化妆", "美容",
      "cosmetic", "skincare", "lipstick", "foundation", "mask", "serum", "lotion", "sunscreen", "perfume"],
    priceRange: [10, 1500],
  },
  "food": {
    name: "食品饮料",
    keywords: ["食品", "零食", "饮料", "茶叶", "咖啡", "坚果", "饼干", "糖果", "巧克力", "牛奶",
      "大米", "调味品", "食用油", "生鲜", "水果", "蔬菜", "肉类", "海鲜",
      "food", "snack", "drink", "tea", "coffee", "nut", "cookie", "candy", "chocolate", "milk"],
    priceRange: [3, 500],
  },
  "home": {
    name: "家居日用",
    keywords: ["家居", "家具", "床上用品", "枕头", "被子", "收纳", "清洁", "拖把", "垃圾桶",
      "厨房", "餐具", "杯子", "保温杯", "刀具", "锅", "灯具", "装饰",
      "home", "furniture", "bedding", "pillow", "storage", "kitchen", "cup", "lamp", "decoration"],
    priceRange: [5, 3000],
  },
  "maternal_baby": {
    name: "母婴用品",
    keywords: ["母婴", "婴儿", "宝宝", "奶粉", "尿不湿", "纸尿裤", "奶瓶", "童装", "童鞋",
      "玩具", "积木", "娃娃", "早教", "孕妇",
      "baby", "diaper", "milk powder", "bottle", "toy", "pregnant", "maternity"],
    priceRange: [10, 2000],
  },
  "sports": {
    name: "运动户外",
    keywords: ["运动", "健身", "瑜伽", "跑步", "篮球", "足球", "羽毛球", "乒乓球", "游泳",
      "户外", "帐篷", "登山", "骑行", "钓鱼", "滑雪",
      "sport", "fitness", "yoga", "running", "basketball", "football", "camping", "fishing", "ski"],
    priceRange: [20, 5000],
  },
  "jewelry": {
    name: "珠宝饰品",
    keywords: ["珠宝", "戒指", "项链", "手链", "耳环", "手镯", "钻石", "黄金", "银饰",
      "手表", "翡翠", "珍珠", "宝石",
      "jewelry", "ring", "necklace", "bracelet", "earring", "diamond", "gold", "silver", "watch", "gem"],
    priceRange: [30, 50000],
  },
  "appliance": {
    name: "家用电器",
    keywords: ["家电", "冰箱", "洗衣机", "空调", "电视", "微波炉", "烤箱", "电饭煲", "吸尘器",
      "风扇", "取暖器", "净化器", "饮水机", "热水器",
      "refrigerator", "washer", "air conditioner", "TV", "microwave", "oven", "vacuum", "fan", "heater", "purifier"],
    priceRange: [100, 15000],
  },
  "industrial": {
    name: "工业品/五金",
    keywords: ["螺栓", "螺母", "螺丝", "螺钉", "垫圈", "轴承", "弹簧", "阀门", "法兰", "管件",
      "五金", "工具", "扳手", "钳子", "电钻", "锯", "焊接", "紧固件", "密封件",
      "bolt", "nut", "screw", "washer", "bearing", "spring", "valve", "flange", "tool", "wrench", "drill",
      "工业", "机械", "配件", "零件", "加工", "模具",
      "industrial", "machinery", "fastener", "hardware"],
    priceRange: [0.1, 5000],
  },
  "medical": {
    name: "医疗器械",
    keywords: ["医疗", "器械", "血压计", "血糖仪", "轮椅", "护理", "康复", "耗材", "口罩",
      "手套", "消毒", "体温计", "助听器", "医用",
      "medical", "surgical", "blood pressure", "glucose", "wheelchair", "mask", "glove", "thermometer"],
    priceRange: [5, 10000],
  },
  "auto": {
    name: "汽车用品",
    keywords: ["汽车", "车载", "行车记录仪", "座垫", "脚垫", "机油", "滤芯", "轮胎", "雨刮",
      "汽车配件", "车用", "导航", "GPS",
      "car", "auto", "tire", "oil filter", "dashcam", "seat cover"],
    priceRange: [10, 5000],
  },
  "pet": {
    name: "宠物用品",
    keywords: ["宠物", "猫", "狗", "猫粮", "狗粮", "猫砂", "宠物玩具", "宠物窝", "牵引绳",
      "pet", "cat", "dog", "cat food", "dog food", "cat litter", "leash"],
    priceRange: [5, 1000],
  },
  "books": {
    name: "图书音像",
    keywords: ["图书", "书籍", "教材", "小说", "杂志", "绘本", "CD", "DVD",
      "book", "textbook", "novel", "magazine"],
    priceRange: [10, 200],
  },
};

// 主流品类（知识库有覆盖的品类）
const MAINSTREAM_INDUSTRIES = new Set([
  "3c_digital", "apparel", "beauty", "food", "home", "maternal_baby",
]);

/**
 * 从列名和样本数据中检测行业
 */
export function detectIndustry(columns: string[], sampleRows?: any[]): IndustryResult {
  const evidence: string[] = [];
  const scores: Record<string, number> = {};

  // 1. 列名匹配
  const colText = columns.join(" ").toLowerCase();
  for (const [industry, config] of Object.entries(INDUSTRY_PATTERNS)) {
    let score = 0;
    for (const kw of config.keywords) {
      if (colText.includes(kw.toLowerCase())) {
        score += 2;
        evidence.push(`列名匹配: "${kw}" → ${config.name}`);
      }
    }
    scores[industry] = (scores[industry] || 0) + score;
  }

  // 2. 样本数据中的品类名匹配
  if (sampleRows && sampleRows.length > 0) {
    // 查找可能是品类/商品名的列
    const nameCols = columns.filter(c =>
      /name|title|商品|名称|标题|品类|类目|product|goods|item|desc/i.test(c)
    );

    for (const row of sampleRows.slice(0, 5)) {
      for (const col of nameCols) {
        const val = String(row[col] || "").toLowerCase();
        for (const [industry, config] of Object.entries(INDUSTRY_PATTERNS)) {
          for (const kw of config.keywords) {
            if (val.includes(kw.toLowerCase())) {
              scores[industry] = (scores[industry] || 0) + 3;
              evidence.push(`样本数据: "${val.substring(0, 50)}" 匹配关键词 "${kw}" → ${config.name}`);
              break; // 每行每列每个行业只加一次
            }
          }
        }
      }
    }
  }

  // 3. 价格区间匹配
  if (sampleRows && sampleRows.length > 0) {
    const priceCols = columns.filter(c =>
      /price|售价|价格|金额|amount|单价/i.test(c)
    );
    for (const col of priceCols) {
      const prices: number[] = [];
      for (const row of sampleRows.slice(0, 20)) {
        const v = parseFloat(String(row[col] || "0"));
        if (!isNaN(v) && v > 0) prices.push(v);
      }
      if (prices.length > 0) {
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        for (const [industry, config] of Object.entries(INDUSTRY_PATTERNS)) {
          if (avgPrice >= config.priceRange[0] && avgPrice <= config.priceRange[1]) {
            scores[industry] = (scores[industry] || 0) + 1;
          }
        }
      }
    }
  }

  // 找出最高分
  let bestIndustry = "other";
  let bestScore = 0;
  for (const [industry, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestIndustry = industry;
    }
  }

  // 计算置信度
  let confidence = 0;
  if (bestScore >= 10) confidence = 0.90;
  else if (bestScore >= 6) confidence = 0.75;
  else if (bestScore >= 3) confidence = 0.55;
  else confidence = 0.30;

  const config = INDUSTRY_PATTERNS[bestIndustry];

  return {
    industry: bestIndustry,
    name: config ? config.name : "其他",
    confidence,
    evidence: evidence.slice(0, 5),
    isMainstream: MAINSTREAM_INDUSTRIES.has(bestIndustry),
  };
}

/**
 * 判断是否应该触发WebSearch
 * 条件：行业不在主流品类 或 知识覆盖度低
 */
export function shouldWebSearch(industry: IndustryResult, kbMatchCount: number): boolean {
  // 主流品类 + 有足够的知识匹配 → 不需要
  if (industry.isMainstream && kbMatchCount >= 3) return false;
  // 非主流品类 → 需要WebSearch获取平台官方数据
  if (!industry.isMainstream && industry.confidence > 0.5) return true;
  // 知识匹配不足 → 需要
  if (kbMatchCount < 2) return true;
  return false;
}

/**
 * 获取行业的知识覆盖度评估
 */
export function assessKnowledgeCoverage(industry: IndustryResult, kbMatchCount: number): {
  level: "high" | "medium" | "low";
  message: string;
} {
  if (industry.isMainstream && kbMatchCount >= 5) {
    return { level: "high", message: `行业「${industry.name}」在知识库中有充分覆盖。` };
  }
  if (industry.isMainstream || kbMatchCount >= 2) {
    return {
      level: "medium",
      message: `行业「${industry.name}」知识覆盖度为中等。将综合AI通用知识+知识库给出分析。`,
    };
  }
  return {
    level: "low",
    message: `行业「${industry.name}」暂不在知识库主流覆盖范围。DeepSeek将作为主知识引擎进行分析，并通过WebSearch获取各平台官方数据。`,
  };
}
