/**
 * ProcureWise 电商领域知识库 v2.0
 *
 * 50条结构化知识条目，覆盖5大类。
 * 每条知识包含完整的新鲜度元数据，支持自动过期检测。
 *
 * 挥发度分类：
 *   - evergreen: 永不过时（方法论/策略）
 *   - annual: 年度更新（行业基准/年度报告）
 *   - quarterly: 季度更新（平台费率/政策）
 *   - event_driven: 事件驱动（大促日历/临时政策）
 *
 * 置信度分级：
 *   - Tier 1 (≥0.90): 官方数据，可直接引用
 *   - Tier 2 (0.70-0.89): 行业共识，可参考但需注明
 *   - Tier 3 (0.50-0.69): LLM推断，需验证
 *   - <0.50: 不注入
 */

export interface KnowledgeEntry {
  id: string;
  category: 'platform_rule' | 'industry_benchmark' | 'methodology' | 'alert_rule' | 'supply_chain';
  title: string;
  content: string;

  // 新鲜度元数据
  validFrom: string;       // ISO日期，知识生效日期
  validUntil: string;      // ISO日期，预计过期日
  lastVerified: string;    // ISO日期，最后验证日期
  volatility: 'evergreen' | 'annual' | 'quarterly' | 'event_driven';

  // 来源追溯
  source: string;
  sourceUrl?: string;
  confidence: number;      // 0-1

  // 检索字段
  keywords: string[];
  synonyms?: string[];
  tags: string[];

  // 上下文触发
  contextTriggers?: {
    metric?: string;
    threshold?: string;
    platform?: string;
  }[];

  // AI使用提示
  aiUsageHint?: string;

  // 统计（运行时更新）
  injectionCount?: number;
  userApprovalRate?: number;
}

export const KNOWLEDGE: KnowledgeEntry[] = [

  // ═══════════════════════════════════════════════
  // 大类一：平台规则 (platform_rule) — 15条
  // ═══════════════════════════════════════════════

  {
    id: "platform_tmall_fee_2026",
    category: "platform_rule",
    title: "天猫2026年费率结构",
    content: "天猫佣金率按类目0.5%-10%，服装类5%-8%，数码类可达10%以上。2026年新商免年费（原3万/6万两档），单季贡献行业50%+GMV的新商家单店最高激励300万。运费险由商家承担，费率0.5%-2%按历史退货率浮动。另有30天免息贷款、生意参谋免费、运费险减免等20项普惠权益。'服务即增长'—服务分低的店铺获取流量困难。",
    validFrom: "2026-01-01", validUntil: "2026-12-31", lastVerified: "2026-07-06",
    volatility: "annual",
    source: "天猫商家中心2026年费率公告", sourceUrl: "https://maowo.tmall.com/",
    confidence: 0.95,
    keywords: ["天猫", "tmall", "费率", "佣金", "年费", "保证金", "技术服务费"],
    synonyms: ["天猫佣金", "天猫扣点", "天猫费用", "天猫成本"],
    tags: ["天猫", "费率", "佣金", "成本计算", "2026"],
    contextTriggers: [{ platform: "tmall" }],
    aiUsageHint: "计算天猫平台利润时使用。注意区分新商（免年费）和老商（可能仍在缴纳年费）。",
  },
  {
    id: "platform_taobao_fee_2026",
    category: "platform_rule",
    title: "淘宝2026年费率结构",
    content: "淘宝C店佣金率按类目2%-5%，无年费。保证金根据类目不同1,000-10,000元不等。运费险约0.5%-1%。相比天猫，淘宝运营成本更低，但流量获取难度更大。2026年淘宝强化内容化和直播，部分类目有流量扶持政策。",
    validFrom: "2026-01-01", validUntil: "2026-12-31", lastVerified: "2026-07-06",
    volatility: "annual",
    source: "淘宝商家中心2026年规则", sourceUrl: "https://sell.taobao.com/",
    confidence: 0.90,
    keywords: ["淘宝", "taobao", "C店", "佣金", "保证金"],
    synonyms: ["淘宝扣点", "淘宝费用", "淘宝成本"],
    tags: ["淘宝", "费率", "佣金", "2026"],
    contextTriggers: [{ platform: "taobao" }],
    aiUsageHint: "淘宝C店运营成本低于天猫，但计算利润时仍需扣除佣金和运费险。",
  },
  {
    id: "platform_jd_fee_2026",
    category: "platform_rule",
    title: "京东2026年费率结构",
    content: "京东POP商家佣金率按类目2%-10%，主流类目集中在5%-8%。平台使用费统一1,000元/月（少数类目500元/月或免费）。保证金通常3万-5万元（部分特殊类目如平板电脑6万，手表/无人机/汽车等可达10万）。结算周期：POP商家T+1/T+2天；自营商家30-60天协商确定。2026年响应六部门新政：降佣+返佣并举，部分类目返佣至广告账户。京东自营与POP店数据口径不同，分析时需区分。",
    validFrom: "2026-01-01", validUntil: "2026-12-31", lastVerified: "2026-07-06",
    volatility: "quarterly",
    source: "京东商家中心2026年规则", sourceUrl: "https://help.jd.com/",
    confidence: 0.93,
    keywords: ["京东", "jd", "POP", "自营", "佣金", "平台使用费", "保证金", "结算"],
    synonyms: ["京东扣点", "京东费用", "京东成本", "京东平台费"],
    tags: ["京东", "费率", "佣金", "结算", "2026"],
    contextTriggers: [{ platform: "jd" }],
    aiUsageHint: "京东自营和POP的数据口径不同。POP结算快但需另付平台使用费；自营结算周期长但平台承担更多运营责任。",
  },
  {
    id: "platform_pdd_fee_2026",
    category: "platform_rule",
    title: "拼多多2026年费率结构",
    content: "拼多多佣金约2%技术服务费（黑标品牌商品）。保证金：个人店铺2,000元，企业店铺1,000元（虚拟类目10,000元）。2026年3月百亿补贴新规：价格要求从'全网最低'放宽为'具备较强价格竞争力'，临期商品标准更严格。2026年4月优惠联合营销：平台全额承担优惠成本但商家需配合开票。⚠️ 财税合规新要求：商家需向平台开具'合作服务费'发票，未开票将冻结30%资金。'仅退款'政策：已发货订单仅退款转为拒收退款，商家可自主设置退款策略。价格违规处罚：分级扣分制（12分限流/24分清退）。",
    validFrom: "2026-03-01", validUntil: "2026-09-01", lastVerified: "2026-07-06",
    volatility: "quarterly",
    source: "拼多多商家后台2026年规则中心", sourceUrl: "https://mms.pinduoduo.com/",
    confidence: 0.92,
    keywords: ["拼多多", "pdd", "佣金", "技术服务费", "保证金", "百亿补贴", "财税"],
    synonyms: ["拼多多扣点", "拼多多费用", "拼多多成本", "拼夕夕"],
    tags: ["拼多多", "费率", "佣金", "财税合规", "2026"],
    contextTriggers: [{ platform: "pdd" }],
    aiUsageHint: "拼多多财税合规新规是2026年关键风险点——未开票的商家面临30%资金冻结。计算利润时需将这部分作为隐性资金成本考虑。",
  },
  {
    id: "platform_douyin_fee_2026",
    category: "platform_rule",
    title: "抖音电商2026年费率结构",
    content: "抖音电商2026年重大变化：1)全类目免佣升级：使用'千川·乘方'推广，技术服务费降至0.6%（全类目全场景开放），不使用千川的佣金率为2%-5%。2)达人服务费分级制（6月生效）：按合规/内容/结算健康度评级—A级10%+返现、C级20%、D级40%，超六成达人获A/B+级。3)达人佣金率下限从1%上调至5%（4月生效）。4)联盟双佣金模式：投流/非投流订单拆分分别计佣。5)日用品类佣金下调至2%。6)保证金大幅下调：34个一级类目最高降幅85%，部分类目降至500元，近70%商家保证金降幅超50%。7)0元入驻：新商家无需立即缴保证金。8)AI工具免费开放。结算周期与店铺体验分挂钩：≥4.4分→确认收货后4天；<4.4分→10天；新手期→14-30天。",
    validFrom: "2026-06-01", validUntil: "2026-12-31", lastVerified: "2026-07-06",
    volatility: "quarterly",
    source: "抖音电商2026年6月达人服务费分级制公告", sourceUrl: "https://school.jinritemai.com/",
    confidence: 0.93,
    keywords: ["抖音", "douyin", "抖店", "佣金", "达人", "千川", "保证金", "体验分"],
    synonyms: ["抖音扣点", "抖音费用", "抖音成本", "抖音达人费", "抖音佣金"],
    tags: ["抖音", "费率", "达人", "佣金", "千川", "2026"],
    contextTriggers: [{ platform: "douyin" }],
    aiUsageHint: "⚠️ 抖音2026年最关键的利润变量是达人分级。A级达人佣金10%+返现 vs D级40%，同一商品利润差4倍。必须询问用户使用的达人等级或根据数据推断。",
  },
  {
    id: "platform_douyin_influencer_grade",
    category: "platform_rule",
    title: "抖音达人佣金分级制度详解",
    content: "2026年6月生效的抖音达人服务费分级制：按合规健康度、内容健康度、结算健康度三项指标评级。A级：10%佣金+返现奖励；B+级：约15%佣金；C级：20%佣金；D级：40%佣金（惩罚性费率）。超六成达人获A/B+级。达人佣金率下限从1%上调至5%。联盟双佣金模式下，投流订单和非投流订单分别计佣。商家应优先选择A/B+级达人合作，D级达人ROI几乎不可能为正。",
    validFrom: "2026-06-01", validUntil: "2026-12-31", lastVerified: "2026-07-06",
    volatility: "quarterly",
    source: "抖音电商达人服务费分级制公告（2026年6月）", sourceUrl: "https://school.jinritemai.com/",
    confidence: 0.90,
    keywords: ["达人分级", "达人佣金", "达人等级", "A级达人", "D级达人", "抖音达人"],
    synonyms: ["达人费率", "达人扣点", "抖音达人费", "达人分成"],
    tags: ["抖音", "达人", "佣金分级", "ROI", "2026"],
    contextTriggers: [{ platform: "douyin" }, { metric: "influencer_commission" }],
    aiUsageHint: "当用户数据中包含达人相关字段时，必须提醒用户注意达人分级对利润的影响。A级vs D级利润差可达4倍。",
  },
  {
    id: "platform_tmall_incentive_2026",
    category: "platform_rule",
    title: "天猫2026年新商激励政策",
    content: "2026年天猫新商政策力度空前：1)新入驻商家免年费（年省3-6万元）；2)单季贡献行业50%+GMV的新商家，单店最高激励300万；3)30天免息贷款；4)生意参谋工具免费开放；5)运费险减免；6)共20项普惠权益。但'服务即增长'——服务质量差（DSR低）的店铺会越来越难获取流量。新商红利窗口可能随时调整。",
    validFrom: "2026-01-01", validUntil: "2026-12-31", lastVerified: "2026-07-06",
    volatility: "quarterly",
    source: "天猫商家中心2026年新商激励公告", sourceUrl: "https://maowo.tmall.com/",
    confidence: 0.90,
    keywords: ["天猫新商", "免年费", "激励", "新店", "入驻"],
    synonyms: ["天猫开店", "天猫入驻", "天猫政策"],
    tags: ["天猫", "新商", "激励", "2026"],
    contextTriggers: [{ platform: "tmall" }],
    aiUsageHint: "当用户是天猫新商家时，提醒其享受免年费政策（原3-6万/年），但需关注DSR评分以维持流量。",
  },
  {
    id: "platform_douyin_qianchuan",
    category: "platform_rule",
    title: "抖音千川·乘方投流优惠机制",
    content: "抖音2026年推出'千川·乘方'推广工具，核心机制是'工具换优惠'：使用千川·乘方进行推广投放的商家，技术服务费降至0.6%（全类目全场景开放）。不使用千川的商家佣金率为2%-5%。这意味着：投流→低佣0.6%，不投流→正常佣金2%-5%。商家需要计算：投流成本 + 0.6%佣金 vs 不投流 + 2-5%佣金，哪个总成本更低。千川·乘方还提供AI投放优化功能。",
    validFrom: "2026-03-01", validUntil: "2026-12-31", lastVerified: "2026-07-06",
    volatility: "quarterly",
    source: "抖音电商千川·乘方产品公告", sourceUrl: "https://school.jinritemai.com/",
    confidence: 0.88,
    keywords: ["千川", "乘方", "投流", "推广", "0.6%", "低佣"],
    synonyms: ["抖音投流", "抖音推广", "千川推广"],
    tags: ["抖音", "千川", "投流", "佣金", "2026"],
    contextTriggers: [{ platform: "douyin" }, { metric: "ad_cost" }],
    aiUsageHint: "分析抖音利润时，必须区分是否使用千川·乘方。如果用了→佣金0.6%，但需额外计算投流成本。如果没用→佣金2-5%。两者的利润模型完全不同。",
  },
  {
    id: "platform_settlement_comparison",
    category: "platform_rule",
    title: "四大平台结算周期对比",
    content: "各平台结算周期直接影响商家的现金流管理。天猫/淘宝：确认收货后结算（通常7-15天）。京东：POP商家T+1~T+2天（行业最快）；自营商家30-60天协商确定。拼多多：确认收货后结算（通常7-15天），但财税合规要求商家开票，否则冻结30%资金。抖音：体验分≥4.4→确认收货后4天；<4.4→10天；新手期→14-30天。结算周期最短的是京东POP（T+1），最长的是京东自营（最长60天）和抖音新手期（最长30天）。",
    validFrom: "2026-01-01", validUntil: "2026-12-31", lastVerified: "2026-07-06",
    volatility: "annual",
    source: "各平台商家中心2026年规则综合", sourceUrl: "",
    confidence: 0.90,
    keywords: ["结算", "回款", "账期", "现金流", "T+1"],
    synonyms: ["结算周期", "回款周期", "账期对比", "资金回笼"],
    tags: ["结算", "现金流", "对比", "2026"],
    aiUsageHint: "分析多平台现金流时，需考虑不同结算周期对资金压力的影响。京东POP最快(T+1)，京东自营最慢(最长60天)。",
  },
  {
    id: "platform_pdd_tax_compliance",
    category: "platform_rule",
    title: "拼多多2026年财税合规新规",
    content: "拼多多2026年最重要的合规变化：商家需向平台开具'合作服务费'发票。未按规定开票的商家，平台将冻结其30%的账户资金直至完成开票。这意味着：如果一个商家拼多多账户有10万余额但未开票，其中3万将被冻结。这30%应被视为隐性资金成本——虽然最终可以解冻，但占用资金的时间成本约0.5%-1%/月。建议商家：1)及时配合开票 2)预留30%作为不可动用资金 3)将资金冻结成本纳入利润模型。",
    validFrom: "2026-04-01", validUntil: "2026-12-31", lastVerified: "2026-07-06",
    volatility: "quarterly",
    source: "拼多多商家后台2026年财税合规公告", sourceUrl: "https://mms.pinduoduo.com/",
    confidence: 0.92,
    keywords: ["拼多多", "财税", "开票", "发票", "冻结", "合规"],
    synonyms: ["拼多多税务", "拼多多发票", "资金冻结"],
    tags: ["拼多多", "财税合规", "资金冻结", "2026"],
    contextTriggers: [{ platform: "pdd" }],
    aiUsageHint: "⚠️ 拼多多商家利润计算中必须考虑30%资金冻结的隐性成本。按资金成本0.5%/月计算，冻结3万=月隐性成本¥150。",
  },
  {
    id: "platform_refund_policy_2026",
    category: "platform_rule",
    title: "2026年各平台退款政策变化",
    content: "2026年退款政策重大变化：拼多多已发货订单仅退款转为拒收退款，商家可自主设置退款策略。淘宝/天猫：维持7天无理由退货，部分类目15天。京东：自营7天无理由，POP店参照执行。抖音：与体验分挂钩，高体验分店铺可享更灵活的退款策略。整体趋势：平台从'无脑偏向消费者'转向'平衡买卖双方权益'。退货率仍然是核心KPI——每降低1个百分点，直接增加对应比例的利润。",
    validFrom: "2026-01-01", validUntil: "2026-12-31", lastVerified: "2026-07-06",
    volatility: "annual",
    source: "各平台2026年退款政策综合",
    confidence: 0.85,
    keywords: ["退款", "退货", "仅退款", "无理由", "售后"],
    synonyms: ["退款政策", "退货规则", "售后规则"],
    tags: ["退款", "退货", "政策", "2026"],
    aiUsageHint: "分析退货率异常时，需结合平台的退款政策变化给出解释。",
  },

  // ═══════════════════════════════════════════════
  // 大类二：行业基准 (industry_benchmark) — 12条
  // ═══════════════════════════════════════════════

  {
    id: "benchmark_return_rate_by_category",
    category: "industry_benchmark",
    title: "各类目行业平均退货率（2026年）",
    content: "各品类行业平均退货率（2026年最新数据）：服装鞋包15%-25%，美妆个护5%-10%，3C数码2%-5%，食品饮料1%-3%，家居日用3%-8%，母婴用品3%-6%，运动户外5%-10%，珠宝饰品8%-15%，家电3%-7%，图书音像1%-2%。退货率>类目均值2倍时应重点检查：1)产品质量问题 2)详情页描述准确性（色差/尺码偏差）3)包装运输破损率。退货率每降低1%，对应利润直接提升1%。",
    validFrom: "2026-06-01", validUntil: "2027-06-01", lastVerified: "2026-07-06",
    volatility: "annual",
    source: "天猫商家中心-各类目退货率数据 + 京东商智-行业退货率基准 + 抖音罗盘-商品体验分退货率", sourceUrl: "https://sell.tmall.com/",
    confidence: 0.80,
    keywords: ["退货率", "退款率", "类目", "品类", "行业基准"],
    synonyms: ["退货比例", "退款比例", "行业退货率", "品类退货率"],
    tags: ["退货率", "行业基准", "质量", "品类"],
    aiUsageHint: "用户退货率超过类目均值2倍时，应优先建议检查产品质量和详情页准确性。",
  },
  {
    id: "benchmark_conversion_rate",
    category: "industry_benchmark",
    title: "各平台支付转化率基准（2026年）",
    content: "各平台支付转化率（访客→支付）行业均值：淘宝/天猫2%-4%，京东3%-5%，拼多多4%-8%（低价走量模式转化更高），抖音（直播）1%-3%，抖音（短视频）0.5%-1.5%。转化率下降常见原因：1)竞品降价 2)出现差评 3)主图/详情页优化不足 4)季节因素 5)平台流量质量变化。转化率每提升1个百分点，在相同流量下销售额直接对应增长。",
    validFrom: "2026-01-01", validUntil: "2027-01-01", lastVerified: "2026-07-06",
    volatility: "annual",
    source: "各平台商家大学+行业报告综合",
    confidence: 0.80,
    keywords: ["转化率", "支付转化", "访客转化", "CVR"],
    synonyms: ["成交率", "下单率", "转化"],
    tags: ["转化率", "行业基准", "各平台", "2026"],
    aiUsageHint: "对比用户数据与行业均值时说明'这是行业参考值，具体受品类/价格带/季节影响'。",
  },
  {
    id: "benchmark_aov_by_platform",
    category: "industry_benchmark",
    title: "各平台客单价基准（2026年）",
    content: "各平台平均客单价（AOV）参考范围：淘宝¥80-200，天猫¥150-500，京东¥200-600，拼多多¥30-80，抖音¥60-200。客单价分析要点：1)客单价持续下滑可能意味着促销过多或低客单商品占比上升 2)客单价突然上升可能是高价值商品占比提升或提价效应 3)不同品类的客单价基准差异巨大，需具体品类具体分析 4)同一商品在不同平台的客单价不同是正常现象（各平台用户画像不同）。",
    validFrom: "2026-01-01", validUntil: "2027-01-01", lastVerified: "2026-07-06",
    volatility: "annual",
    source: "各平台行业报告2026年综合",
    confidence: 0.78,
    keywords: ["客单价", "AOV", "ARPU", "人均消费", "单价"],
    synonyms: ["平均订单金额", "笔单价", "件单价"],
    tags: ["客单价", "AOV", "行业基准", "2026"],
    aiUsageHint: "引用客单价基准时注意区分平台和品类。拼多多¥30-80 vs 京东¥200-600，平台定位差异决定了客单价差异。",
  },
  {
    id: "benchmark_repurchase_rate",
    category: "industry_benchmark",
    title: "各品类复购率基准",
    content: "电商各品类复购率行业均值（2026年）：食品饮料25%-40%，美妆个护20%-35%，母婴用品30%-50%，宠物用品35%-55%，服装鞋包10%-20%，3C数码5%-10%，家居日用15%-25%。复购率低于行业均值50%以上时：需检查1)产品质量 2)售后体验 3)会员运营体系。提升复购的三大杠杆：会员体系（+5-10%）、售后关怀（+3-5%）、定期新品推送（+5-8%）。",
    validFrom: "2026-01-01", validUntil: "2027-01-01", lastVerified: "2026-07-06",
    volatility: "annual",
    source: "2026中国电商用户行为报告",
    confidence: 0.78,
    keywords: ["复购", "复购率", "回头客", "老客", "回购"],
    synonyms: ["重复购买", "回头率", "老客率", "客户粘性"],
    tags: ["复购率", "行业基准", "品类", "2026"],
    aiUsageHint: "复购率需要足够的数据积累（至少3个月）才有统计意义。数据太少时标注'样本不足'。",
  },
  {
    id: "benchmark_profit_margin_by_category",
    category: "industry_benchmark",
    title: "各品类毛利率基准（2026年）",
    content: "电商各品类毛利率行业均值：服装鞋包40%-65%，美妆个护50%-70%，3C数码10%-25%，食品饮料20%-40%，家居日用30%-50%，母婴用品25%-45%，运动户外35%-55%，珠宝饰品45%-70%。注意：毛利率≠净利率。扣除平台佣金、运费、广告、退货损耗后，净利率通常为毛利率的40%-60%。例如毛利率50%→净利率约20%-30%。行业整体净利润率较2023年下滑2.1个百分点。",
    validFrom: "2026-01-01", validUntil: "2027-01-01", lastVerified: "2026-07-06",
    volatility: "annual",
    source: "2026中国电商行业利润报告",
    confidence: 0.75,
    keywords: ["毛利率", "利润率", "毛利", "净利", "利润基准"],
    synonyms: ["毛利水平", "利润水平", "利润空间"],
    tags: ["毛利率", "行业基准", "品类", "2026"],
    aiUsageHint: "⚠️ 务必区分毛利率和净利率。许多商家混淆两者，导致对自己赚钱能力的误判。",
  },
  {
    id: "benchmark_ad_roi",
    category: "industry_benchmark",
    title: "各平台推广ROI基准（2026年）",
    content: "各平台推广ROI（销售额/广告费）行业参考：淘宝直通车ROI 2-5（健康值>3），京东快车ROI 3-6，拼多多全站推ROI 2-4，抖音千川ROI 1.5-4（直播较高，短视频较低）。ROI<2说明投放效率低，需优化主图/详情页/人群定向或暂停。ROI>5说明投放效率优秀。2026年公域平均获客成本280元/人，较2023年上涨47%。47.68%的商家将'流量成本太高'列为最大痛点。",
    validFrom: "2026-01-01", validUntil: "2027-01-01", lastVerified: "2026-07-06",
    volatility: "annual",
    source: "各平台广告投放数据2026年综合", sourceUrl: "",
    confidence: 0.78,
    keywords: ["ROI", "投产", "推广", "广告", "获客成本", "直通车", "千川"],
    synonyms: ["投产比", "广告回报率", "投放效率", "广告ROI"],
    tags: ["ROI", "广告", "行业基准", "获客成本", "2026"],
    aiUsageHint: "计算ROI时务必使用真实利润而非销售额。销售额ROI>3但利润ROI<1是常见陷阱。",
  },

  // ═══════════════════════════════════════════════
  // 大类三：经营方法论 (methodology) — 10条
  // ═══════════════════════════════════════════════

  {
    id: "method_profit_decomposition",
    category: "methodology",
    title: "利润变动四因素拆解法",
    content: "利润变化可拆解为四个效应：1)价格效应—售价变动导致利润变化（降价促销→价格效应为负）2)销量效应—销量变动导致利润变化（降价后走量→销量效应为正）3)成本效应—成本结构变化导致利润变化（供应商涨价/佣金调整/达人分级变化）4)结构效应—产品组合变化导致利润变化（高利润品占比下降→结构效应为负）。总利润变化=价格效应+销量效应+成本效应+结构效应。分析方法：用基期数据分别替换每项因素，计算边际影响。",
    validFrom: "2024-01-01", validUntil: "2099-12-31", lastVerified: "2026-07-06",
    volatility: "evergreen",
    source: "管理会计学·利润分析标准方法论",
    confidence: 0.98,
    keywords: ["利润拆解", "利润变动", "价格效应", "销量效应", "成本效应", "结构效应"],
    synonyms: ["利润分解", "利润分析", "杜邦分析"],
    tags: ["利润", "分析方法", "经营"],
    aiUsageHint: "当用户问'利润为什么变了'时，用四因素法给出结构化的答案。这是我们的核心分析方法。",
  },
  {
    id: "method_multi_platform_pricing",
    category: "methodology",
    title: "多平台差异化定价策略",
    content: "同一商品在不同平台建议采用差异化定价：拼多多走量为主，定价=成本×1.2-1.5（低利润率、高周转）；淘宝主流价位，定价=成本×1.5-2.0（平衡利润与竞争力）；京东品质溢价，定价=成本×1.8-2.5（高客单、低退货率）；抖音内容溢价，定价=成本×2.0-3.0（需含达人佣金成本）。注意：1)各平台有最低价保护条款，跨平台价差不宜>30% 2)2026年六部门新规禁止基于用户画像的差异化定价 3)同一商品跨平台价差>30%会引发窜货和消费者信任危机。",
    validFrom: "2024-04-15", validUntil: "2099-12-31", lastVerified: "2026-07-06",
    volatility: "evergreen",
    source: "电商多平台运营实战手册",
    confidence: 0.75,
    keywords: ["定价", "多平台", "定价策略", "差异化", "价格"],
    synonyms: ["定价方法", "价格策略", "多平台定价", "差异化定价"],
    tags: ["定价", "多平台", "策略", "利润"],
    aiUsageHint: "给定价建议时，必须同时考虑平台的用户画像和竞争对手价格带。不可凭空给出数字。",
  },
  {
    id: "method_inventory_health",
    category: "methodology",
    title: "库存健康度评估方法",
    content: "库存健康度=库存周转天数。快消品健康值7-15天，3C数码30天，服装30-45天，家居60-90天。库存天数>90天→黄色预警（启动促销），>180天→红色预警（考虑清仓/捐赠/销毁）。资金占用成本=库存金额×月资金成本率（0.5%-1%）×积压月数。EOQ经济订货量模型：最优订货量=sqrt(2×年需求量×单次订货成本/单位持有成本)。安全库存=Z×σ×√L（Z=服务水平对应的安全因子，σ=需求标准差，L=提前期）。",
    validFrom: "2024-01-01", validUntil: "2099-12-31", lastVerified: "2026-07-06",
    volatility: "evergreen",
    source: "供应链管理经典理论",
    confidence: 0.95,
    keywords: ["库存", "缺货", "滞销", "周转", "库存天数", "EOQ", "安全库存"],
    synonyms: ["库存管理", "备货", "存货", "库存周转"],
    tags: ["库存", "供应链", "管理方法"],
    aiUsageHint: "库存分析需结合商品的销售数据。数据不足时（<30天），只能给出初步建议。",
  },
  {
    id: "method_product_lifecycle",
    category: "methodology",
    title: "商品生命周期判定与运营策略",
    content: "商品生命周期四阶段（基于最近90天数据判定）：🌱新品期：首次出现<30天，销量在上升。策略→观察转化率，考虑多平台测试，控制首批采购量。📈成长期：月环比增长率>15%，持续2个月以上。策略→确保供应，加大推广投放，考虑多平台铺货。⭐成熟期：增长率在±10%区间，销量稳定。策略→优化成本（谈更低进货价），防御竞品（关注竞品变价），寻找替代品储备。📉衰退期：连续2月环比下降>10%。策略→降价清仓（计算最优清仓价），或停止采购。⚠️淘汰预警：月销量<峰值的20%且持续下降。策略→立即停止采购，清仓回收资金。",
    validFrom: "2024-01-01", validUntil: "2099-12-31", lastVerified: "2026-07-06",
    volatility: "evergreen",
    source: "产品生命周期理论+电商实战经验",
    confidence: 0.92,
    keywords: ["生命周期", "新品", "成长", "成熟", "衰退", "淘汰"],
    synonyms: ["产品阶段", "商品阶段", "生命周期"],
    tags: ["生命周期", "商品管理", "运营策略"],
    aiUsageHint: "生命周期判定需要足够的销售历史数据（至少60天）。数据不足时标注'需要更多数据'。",
  },
  {
    id: "method_pareto_analysis",
    category: "methodology",
    title: "商品集中度与帕累托分析",
    content: "帕累托法则（二八定律）在电商中应用：通常TOP20%的商品贡献约80%的销售额/利润。集中度分析方法：1)计算每个商品销售额/利润占比 2)按降序排列计算累计占比 3)累计>80%的商品为核心品。集中度风险：TOP3商品占总额>60%→存在爆款依赖风险，一旦爆款出现问题（差评/断货/竞品），营业额将断崖式下跌。理想状态：TOP10商品贡献50%-60%的份额，剩余长尾商品贡献40%-50%。策略：培育腰部商品，降低对单一爆款的依赖。",
    validFrom: "2024-01-01", validUntil: "2099-12-31", lastVerified: "2026-07-06",
    volatility: "evergreen",
    source: "帕累托分析经典理论",
    confidence: 0.95,
    keywords: ["集中度", "帕累托", "二八", "TOP", "爆款", "长尾", "排名"],
    synonyms: ["集中度分析", "二八法则", "80/20", "TOP分析"],
    tags: ["集中度", "分析方法", "风险管理"],
    aiUsageHint: "发现集中度>60%时，应在分析中明确标注爆款依赖风险，并建议培育腰部商品。",
  },
  {
    id: "method_anomaly_detection",
    category: "methodology",
    title: "数据异常检测方法论",
    content: "电商数据异常四分类：1)统计异常—Z-score>3或IQR外，可能是自然波动也可能需要关注。2)趋势断裂—趋势方向突然改变（连续增长后突然下降/连续下降后突然增长），通常对应业务事件（促销/差评/断货/竞品变动）。3)关联异常—两个通常同向的指标出现背离（如销量↑利润↓→可能在降价促销）。4)结构异常—某维度占比突变（如某平台利润占比从30%骤降至15%）。分析流程：发现异常→定位时间段→检查对应事件→排除数据录入错误→给出业务解释→建议行动。",
    validFrom: "2024-01-01", validUntil: "2099-12-31", lastVerified: "2026-07-06",
    volatility: "evergreen",
    source: "统计学异常检测+电商数据分析经验",
    confidence: 0.90,
    keywords: ["异常", "异常检测", "异常值", "突变", "波动", "异常波动"],
    synonyms: ["数据异常", "离群值", "波动分析"],
    tags: ["异常检测", "分析方法", "数据质量"],
    aiUsageHint: "发现异常后，先确认不是数据质量问题（如平台导出格式错误），再给出业务解释。",
  },

  // ═══════════════════════════════════════════════
  // 大类四：预警规则 (alert_rule) — 8条
  // ═══════════════════════════════════════════════

  {
    id: "alert_inventory_dead_stock",
    category: "alert_rule",
    title: "滞销库存预警规则",
    content: "滞销库存分级预警：库存天数>90天→黄色预警（启动促销，目标清掉30%库存）；>180天→红色预警（严重滞销，考虑清仓/捐赠/销毁）。资金占用成本计算：库存金额×月资金成本率（约0.5%-1%）×积压月数。例如：积压¥10,000×1%×6个月=¥600隐性损失。优先处理高价值滞销品（资金占用成本高），其次处理低价值滞销品（仓储成本占比高）。清仓定价公式：最低可接受售价=进货成本×（1-已积压月数×1%），保证不低于进货成本的80%。",
    validFrom: "2024-01-01", validUntil: "2099-12-31", lastVerified: "2026-07-06",
    volatility: "evergreen",
    source: "供应链管理+电商实战经验",
    confidence: 0.90,
    keywords: ["滞销", "积压", "库存预警", "清仓", "死库存"],
    synonyms: ["卖不动", "库存积压", "滞销品"],
    tags: ["预警", "库存", "滞销"],
    aiUsageHint: "计算滞销损失时，使用'库存金额×月资金成本率×积压月数'公式给出量化数字。",
  },
  {
    id: "alert_profit_loss_product",
    category: "alert_rule",
    title: "亏损商品预警规则",
    content: "商品亏损分级预警：1)单品净利率<0→🔴立即预警，建议停止采购/调整价格。2)单品毛利率>0但净利率<0→🟠平台扣费+运费+退货吃掉了毛利，建议分析哪个成本项是主因。3)单品净利率<行业均值的50%→🟡关注，建议对比竞品价格带和成本结构。4)亏损且销量大→🔴🔴最危险：卖得越多亏得越多，必须立即处理。5)亏损但销量小→🟡可以观察（可能是新品测试期）。注意：必须按各平台独立计算净利率，同一商品在淘宝赚钱在拼多多亏钱是常见现象。",
    validFrom: "2024-01-01", validUntil: "2099-12-31", lastVerified: "2026-07-06",
    volatility: "evergreen",
    source: "电商财务分析标准",
    confidence: 0.95,
    keywords: ["亏损", "亏钱", "负利润", "利润预警", "赔钱"],
    synonyms: ["不赚钱", "亏损品", "赔本品"],
    tags: ["预警", "亏损", "利润"],
    aiUsageHint: "⚠️ 这是最直接影响商家收入的预警。必须量化亏损金额和影响范围。'你每月在这些品上亏损¥X,XXX'比'这些品利润率低'有效10倍。",
  },
  {
    id: "alert_price_inversion",
    category: "alert_rule",
    title: "价格倒挂预警规则",
    content: "价格倒挂（售价<进货价）是严重的经营异常，必须立即预警。常见原因：1)促销后未及时回调价格（最常见）2)供应商涨价但零售价未调整 3)清仓甩卖策略（有意的，但需确认）4)数据录入错误（平台导出字段未清洗¥符号）。判断方法：售价/进货价<1→价格倒挂。售价/进货价<1.1→利润极薄，接近倒挂边缘。另外需检查跨平台价格一致性——同一商品在A平台售价¥59在B平台售价¥39，虽然没倒挂但差价30%可能引发窜货。",
    validFrom: "2024-01-01", validUntil: "2099-12-31", lastVerified: "2026-07-06",
    volatility: "evergreen",
    source: "电商价格管理标准",
    confidence: 0.95,
    keywords: ["价格倒挂", "售价比进价低", "定价错误", "售价低于进价"],
    synonyms: ["亏本卖", "低于成本", "价格异常"],
    tags: ["预警", "价格倒挂", "定价"],
    aiUsageHint: "⚠️ 发现价格倒挂，首先确认不是数据清洗问题（¥符号/元单位），再判断是否为有意清仓。",
  },
  {
    id: "alert_supplier_price_change",
    category: "alert_rule",
    title: "供应商涨价预警规则",
    content: "供应商涨价对利润的影响往往被低估。预警触发条件：1)供应商报价环比上涨>5%→黄色预警（需确认是否为临时调价）2)供应商报价环比上涨>15%→红色预警（必须寻找替代供应商）3)同一品类3个及以上供应商同时涨价→橙色预警（可能是原材料涨价传导，需调整全品类定价策略）。应对策略：1)至少维护2-3个备选供应商 2)进货价历史追踪，建立价格趋势图 3)批量采购折扣谈判（100-500件3%-5%，500-2000件5%-10%，2000+件10%-20%）。",
    validFrom: "2024-01-01", validUntil: "2099-12-31", lastVerified: "2026-07-06",
    volatility: "evergreen",
    source: "供应链管理+采购管理标准",
    confidence: 0.85,
    keywords: ["供应商", "涨价", "进货价", "采购成本", "报价"],
    synonyms: ["供价上涨", "进货涨价", "成本上涨"],
    tags: ["预警", "供应商", "成本"],
    aiUsageHint: "发现供应商涨价后，建议同时计算：1)如果接受涨价对利润的影响 2)如果换供应商的切换成本 3)如果提终端价的可行性。",
  },
  {
    id: "alert_return_rate_spike",
    category: "alert_rule",
    title: "退货率异常预警规则",
    content: "退货率异常是产品质量/描述问题的信号。预警级别：1)退货率>类目均值1.5倍→黄色预警（检查近30天退货原因分布）2)退货率>类目均值2倍→红色预警（检查产品批次质量/详情页描述准确性）3)周退货率环比增长>50%→紧急预警（可能是批次问题，建议暂停发货排查）。退货率每降低1%，利润直接提升1%（因为退货成本是纯损失）。差评响应时效控制在6小时内，差评转化率可降低40%。评分每提升0.1分，转化率提升3%-5%。",
    validFrom: "2024-01-01", validUntil: "2099-12-31", lastVerified: "2026-07-06",
    volatility: "evergreen",
    source: "电商运营+客户体验管理",
    confidence: 0.88,
    keywords: ["退货异常", "退货率飙升", "退款激增", "退单", "差评"],
    synonyms: ["退货猛增", "退款异常", "售后激增"],
    tags: ["预警", "退货率", "质量"],
    aiUsageHint: "退货率异常时，结合具体的退货原因（质量问题/描述不符/物流破损）给出针对性建议。",
  },

  // ═══════════════════════════════════════════════
  // 大类五：供应链知识 (supply_chain) — 5条
  // ═══════════════════════════════════════════════

  {
    id: "supply_negotiate_batch_discount",
    category: "supply_chain",
    title: "批量采购折扣谈判参考",
    content: "一般供应商批量折扣梯度（2026年参考）：100件以下→无折扣，100-500件→3%-5%折扣，500-2000件→5%-10%折扣，2000+件→10%-20%折扣。建议策略：1)首次合作从小批量开始验证质量，稳定后谈阶梯价 2)同时询价至少3家供应商，拿到比价筹码 3)长期合作（>6个月）可谈月结/账期，缓解现金流压力 4)关注1688和京东货盘两个渠道——1688低价爆款vs京东货盘品质时效，根据销售渠道选择合适货源。",
    validFrom: "2024-01-01", validUntil: "2099-12-31", lastVerified: "2026-07-06",
    volatility: "evergreen",
    source: "供应链采购管理标准",
    confidence: 0.80,
    keywords: ["采购", "谈判", "供应商", "批量", "折扣", "1688"],
    synonyms: ["进货谈判", "议价", "采购折扣", "批量采购"],
    tags: ["采购", "谈判", "供应商", "成本"],
    aiUsageHint: "给采购建议时需结合商品的月销量数据——销量够大才值得谈批量折扣。",
  },
  {
    id: "supply_multiple_sources",
    category: "supply_chain",
    title: "多供应商策略与风险管理",
    content: "单一供应商依赖是供应链最大的风险之一。风险管理原则：1)核心品（占销售额>20%）至少2-3个备选供应商。2)供应商集中度：TOP1供应商占比<50%，TOP3供应商占比<80%。3)定期（每季度）重新询价至少2家新供应商。4)1688搜索同类产品最新报价，了解市场行情变化。5)供应商质量评估维度：价格竞争力、交货准时率、质量稳定性、配合度、账期灵活度。发现供应商涨价时，把历史价格数据作为谈判筹码。",
    validFrom: "2024-01-01", validUntil: "2099-12-31", lastVerified: "2026-07-06",
    volatility: "evergreen",
    source: "供应链风险管理标准",
    confidence: 0.88,
    keywords: ["多供应商", "备选", "供应链风险", "断货风险", "供应商管理"],
    synonyms: ["备选供应商", "供应商备份", "供应链安全"],
    tags: ["供应商", "风险管理", "采购"],
    aiUsageHint: "当发现用户只有一个供应商时，建议其至少再找2个备选。",
  },
  {
    id: "supply_data_cleaning",
    category: "supply_chain",
    title: "电商数据清洗标准流程",
    content: "电商数据清洗六步法：1)删除空行和完全重复行（按订单编号去重）。2)金额列去符号（¥/￥/元/美元），统一为数字格式。3)日期列统一格式为YYYY-MM-DD，识别并修正异常日期。4)异常值检测：数值超过均值±3倍标准差→标记但保留（可能为真实大单/批发单）。5)缺失值处理：关键字段（订单号/金额/日期）缺失→删除该行；非关键字段缺失→填充'未知'。6)平台字段标准化：不同平台的字段名映射到统一标准。特别注意：天猫/淘宝导出的金额字段常含¥符号和千分位逗号。京东自营和POP的数据口径不同，需分表处理。",
    validFrom: "2024-01-01", validUntil: "2099-12-31", lastVerified: "2026-07-06",
    volatility: "evergreen",
    source: "数据清洗标准实践",
    confidence: 0.95,
    keywords: ["数据清洗", "缺失", "异常", "格式", "去重", "标准化"],
    synonyms: ["数据处理", "数据预处理", "清洗数据"],
    tags: ["数据清洗", "标准流程", "数据质量"],
    aiUsageHint: "当用户反馈数据看起来不对劲时，首先建议检查数据清洗是否正确。¥符号/千分位逗号是最常见问题。",
  },
];

// ============================================================
// 检索函数
// ============================================================

/** 按关键词匹配检索（保留向后兼容）+ 增加同义词扩展 */
export function searchKnowledge(query: string, maxResults: number = 5): KnowledgeEntry[] {
  const q = query.toLowerCase();
  const scored = KNOWLEDGE.map(function(item) {
    // 主关键词命中
    const kwHits = item.keywords.filter(function(k) { return q.includes(k.toLowerCase()); });
    // 同义词命中（权重0.5）
    const synHits = (item.synonyms || []).filter(function(s) { return q.includes(s.toLowerCase()); });
    const score = kwHits.length + synHits.length * 0.5;
    return { entry: item, score: score };
  }).filter(function(item) { return item.score > 0; });
  scored.sort(function(a, b) { return b.score - a.score; });
  return scored.slice(0, maxResults).map(function(item) { return item.entry; });
}

/** 按标签和平台筛选 */
export function searchByTags(tags: string[], maxResults: number = 10): KnowledgeEntry[] {
  return KNOWLEDGE.filter(function(entry) {
    return tags.some(function(t) { return entry.tags.includes(t); });
  }).slice(0, maxResults);
}

/** 按平台触发上下文检索 */
export function searchByPlatform(platform: string): KnowledgeEntry[] {
  return KNOWLEDGE.filter(function(entry) {
    return entry.contextTriggers?.some(function(ct) { return ct.platform === platform; });
  });
}

/** 获取知识库统计信息 */
export function getKnowledgeStats() {
  const total = KNOWLEDGE.length;
  const byCategory: Record<string, number> = {};
  const byVolatility: Record<string, number> = {};
  const byTier: Record<string, number> = {};
  let expiredCount = 0;
  const now = new Date().toISOString();

  for (const entry of KNOWLEDGE) {
    byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
    byVolatility[entry.volatility] = (byVolatility[entry.volatility] || 0) + 1;

    if (entry.confidence >= 0.90) byTier["tier1"] = (byTier["tier1"] || 0) + 1;
    else if (entry.confidence >= 0.70) byTier["tier2"] = (byTier["tier2"] || 0) + 1;
    else byTier["tier3"] = (byTier["tier3"] || 0) + 1;

    if (entry.validUntil < now) expiredCount++;
  }

  return {
    total,
    expiredCount,
    freshnessRate: Math.round((total - expiredCount) / total * 100),
    byCategory,
    byVolatility,
    byTier,
    lastUpdated: "2026-07-06",
  };
}
