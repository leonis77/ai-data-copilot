// E-commerce domain knowledge base for keyword matching
export const KNOWLEDGE = [
  { keywords: ["客单价","ARPU","人均消费"], content: "客单价=总销售额/订单数。手机品类通常¥3500-9000，配件¥100-500。客单价下滑需检查是否促销过多或低客单商品占比上升。" },
  { keywords: ["退款率","退货","退款"], content: "退款率=退款金额/总销售额。健康值通常2-5%。超过5%需检查：1)商品质量问题 2)物流破损 3)与描述不符。" },
  { keywords: ["转化率","访客转化"], content: "支付转化率=支付买家数/访客数。淘宝均值2-4%，京东略高。转化率下降原因：1)竞品降价 2)差评 3)主图/详情页优化不足。" },
  { keywords: ["排名","TOP","排行榜","热销"], content: "商品排名分析：关注销售额集中度。如果TOP3商品占总额60%以上，存在爆款依赖风险，需要培育腰部商品。" },
  { keywords: ["趋势","变化","增长","下降"], content: "数据分析先看趋势再看绝对值。日环比波动10%以内正常，超过20%需要深挖原因。周同比更能反映真实趋势。" },
  { keywords: ["区域","地区","省份","城市"], content: "区域分析关注：1)各省销售额占比 2)各地区客单价差异 3)偏远地区物流成本。华东通常占30%+份额。" },
  { keywords: ["品类","类目","SKU"], content: "品类分析看三点：1)各品类销售额占比 2)SKU数量与销售额的关系（长尾效应）3)品类毛利率排序。" },
  { keywords: ["价格","定价","价格带"], content: "价格带分析：将商品按价格分为低/中/高三档，看各档位销量占比。中档（50-200元）通常是销量主力。" },
  { keywords: ["大促","双11","618","活动"], content: "大促分析要点：1)活动期间vs日常销售额对比 2)折扣力度vs销量弹性 3)活动后是否出现需求透支（回落超过正常水平）。" },
  { keywords: ["库存","缺货","滞销"], content: "库存健康度=库存周转天数。快消品7-15天，3C数码30天。滞销商品（库存>90天无销售）建议促销清仓。" },
  { keywords: ["利润","毛利率","成本"], content: "毛利=销售额-成本。电商毛利率通常20-40%。分析利润时需考虑：1)平台佣金（天猫5%左右）2)物流成本 3)广告费。" },
  { keywords: ["复购","回头客","老客"], content: "复购率=重复购买客户数/总客户数。电商均值15-25%。提升复购方法：1)会员体系 2)售后关怀 3)定期新品推送。" },
  { keywords: ["天猫","淘宝","tmall"], content: "天猫订单导出常见字段：订单编号、买家会员名、买家实际支付金额、订单创建时间、订单状态、宝贝标题、SKU、数量、收货地址。金额含￥符号需清洗。" },
  { keywords: ["京东","jd"], content: "京东商智导出字段：订单号、下单时间、商品名称、商品数量、订单金额、订单状态、收货人。京东自营与POP店数据口径不同。" },
  { keywords: ["拼多多","pdd"], content: "拼多多后台导出字段：订单号、商品名称、商品数量、订单金额、订单状态、下单时间。拼多多以低价走量为主，关注件单价和拼团转化。" },
  { keywords: ["抖音","douyin"], content: "抖音电商罗盘：订单ID、商品名称、规格、数量、实付金额、下单时间。抖音直播带货数据需区分自然流量和付费流量。" },
  { keywords: ["数据清洗","缺失","异常","格式"], content: "数据清洗步骤：1)删除空行和重复行 2)金额列去符号（¥/￥/元） 3)日期统一格式 4)异常值处理（超过均值3倍标准差标记）" },
  { keywords: ["报表","日报","周报","月报"], content: "电商日报核心指标：GMV、订单量、客单价、退款率、TOP10商品。对比昨日和上周同日，标注异常波动。" },
  { keywords: ["竞品","对手","竞店"], content: "竞品分析：通过生意参谋竞品监控，对比本品vs竞品的流量来源、转化率、价格带分布，找差距和机会。" },
  { keywords: ["广告","推广","ROI","投产"], content: "推广ROI=推广带来的销售额/推广花费。健康值>3。直通车、引力魔方、万相台各有侧重。ROI低于2需优化主图或暂停。" },
];

export function searchKnowledge(query: string, maxResults: number = 3): string[] {
  const q = query.toLowerCase();
  const scored = KNOWLEDGE.map(function(item) {
    const hits = item.keywords.filter(function(k) { return q.includes(k); });
    return { content: item.content, score: hits.length };
  }).filter(function(item) { return item.score > 0; });
  scored.sort(function(a, b) { return b.score - a.score; });
  return scored.slice(0, maxResults).map(function(item) { return item.content; });
}
