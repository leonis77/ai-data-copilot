/**
 * 模板匹配引擎单测
 */

import { describe, it, expect } from "vitest";
import { matchPlatformTemplate, matchAllTemplates } from "@/lib/templates/matcher";

describe("matchPlatformTemplate", () => {
  it("含拼多多特征列应匹配 pdd_order_v2", () => {
    // 拼多多实际导出：拼团订单号、拼团金额、拼团时间、拼团销量
    const pddColumns = ["拼团订单号", "商品标题", "商品类目", "拼团金额(元)", "拼团时间", "买家昵称", "收货城市", "SKU编码", "拼单价(元)", "拼团销量"];
    const result = matchPlatformTemplate(pddColumns);
    expect(result).not.toBeNull();
    expect(result!.template.id).toBe("pdd_order_v2");
    expect(result!.template.platform).toBe("pdd");
  });

  it("含京东特征列应匹配 jd_order_v2", () => {
    // 京东实际导出：订单号、订单金额、收货地址、下单时间
    const jdColumns = ["订单号", "商品标题", "订单金额", "下单时间", "收货地址", "订单状态", "SKU编码", "运费"];
    const result = matchPlatformTemplate(jdColumns);
    expect(result).not.toBeNull();
    expect(result!.template.id).toBe("jd_order_v2");
    expect(result!.template.platform).toBe("jd");
  });

  it("京东数据不应误匹配为抖音模板", () => {
    // 京东列名含"订单号"+"订单金额"，Douyin 的 requiredColumns 是"抖音订单号"，不会误匹配
    const jdColumns = ["订单号", "商品标题", "订单金额", "下单时间", "收货地址", "SKU编码", "运费"];
    const result = matchPlatformTemplate(jdColumns);
    expect(result).not.toBeNull();
    expect(result!.template.id).toBe("jd_order_v2");
  });

  it("含天猫特征列应匹配 tmall_order_v2", () => {
    // 天猫有买家昵称 + 10+ 列，和淘宝区分
    const tmallColumns = ["订单编号", "商品标题", "规格", "数量", "实付金额", "下单时间", "订单状态", "收货地址", "买家昵称", "SKU", "售后"];
    const result = matchPlatformTemplate(tmallColumns);
    expect(result).not.toBeNull();
    expect(result!.template.id).toBe("tmall_order_v2");
    expect(result!.template.platform).toBe("tmall");
  });

  it("抖音订单列应匹配 douyin_order_v2", () => {
    // 抖音电商实际导出：抖音订单号、抖音售价(元)、直播日期
    const dyColumns = ["抖音订单号", "商品名称", "数量", "抖音售价(元)", "直播日期", "买家昵称", "收货城市"];
    const result = matchPlatformTemplate(dyColumns);
    expect(result).not.toBeNull();
    expect(result!.template.id).toBe("douyin_order_v2");
    expect(result!.template.platform).toBe("douyin");
  });

  it("空列名应返回 null", () => {
    expect(matchPlatformTemplate([])).toBeNull();
    expect(matchPlatformTemplate(null as any)).toBeNull();
  });

  it("匹配结果应包含列映射", () => {
    // 使用拼多多实际导出列名
    const pddColumns = ["拼团订单号", "商品标题", "商品类目", "拼团金额(元)", "拼团时间", "买家昵称", "收货城市"];
    const result = matchPlatformTemplate(pddColumns);
    expect(result).not.toBeNull();
    expect(result!.template.id).toBe("pdd_order_v2");
    expect(result!.columnMapping["拼团订单号"]).toBe("order_id");
    expect(result!.columnMapping["商品标题"]).toBe("product_name");
    expect(result!.columnMapping["拼团金额(元)"]).toBe("paid_amount");
  });
});

describe("matchAllTemplates", () => {
  it("拼多多列应在结果列表中 pdd_order_v2 排第一", () => {
    // 使用拼多多实际导出列名（含拼团前缀）
    const pddColumns = ["拼团订单号", "拼团时间", "商品标题", "商品类目", "SKU编码",
      "拼单价(元)", "拼团销量", "买家昵称", "拼团金额(元)", "收货城市",
    ];
    const results = matchAllTemplates(pddColumns);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].template.id).toBe("pdd_order_v2");
  });

  it("含淘宝特征列应匹配 taobao_order_v2（含买家会员名/商品类目）", () => {
    // 淘宝导出特有：买家会员名 + 商品类目 + 售价(元)
    const tbColumns = ["订单号", "下单时间", "商品名称", "SKU编码", "商品类目", "售价(元)", "销售量", "实付金额(元)", "买家会员名", "收货省份"];
    const result = matchPlatformTemplate(tbColumns);
    expect(result).not.toBeNull();
    expect(result!.template.id).toBe("taobao_order_v2");
    expect(result!.template.platform).toBe("taobao");
  });
});

// ── 回归测试：截图场景 ──

describe("cross-platform misidentification regression", () => {
  it("拼多多实际列名应匹配 pdd_order_v2，不得匹配 jd_order_v2", () => {
    // 截图1真实列名：拼团订单号/拼团时间/拼团金额(元)/收货城市
    // JD 旧 optionalColumns ["收货","时间"] 会误匹配这些列 → 修复后应不匹配
    const pddColumns = [
      "拼团订单号", "拼团时间", "商品标题", "商品类目", "SKU编码",
      "拼单价(元)", "拼团销量", "买家昵称", "拼团金额(元)", "收货城市",
    ];
    const result = matchPlatformTemplate(pddColumns);
    expect(result).not.toBeNull();
    expect(result!.template.id).toBe("pdd_order_v2");
    expect(result!.template.platform).toBe("pdd");
  });

  it("抖音电商实际列名应匹配 douyin_order_v2，不得匹配 taobao_order_v2", () => {
    // 截图2真实列名：抖音订单号/直播日期/抖音售价(元)/实收金额(元)
    const dyColumns = [
      "抖音订单号", "直播日期", "商品名称", "商品类目", "SKU编码",
      "抖音售价(元)", "销售数量", "实收金额(元)", "买家昵称", "收货城市",
    ];
    const result = matchPlatformTemplate(dyColumns);
    expect(result).not.toBeNull();
    expect(result!.template.id).toBe("douyin_order_v2");
  });
});

// ── 京东列名变体回归测试 ──

describe("JD column name variants", () => {
  it("京东实际列名含订单编号/收货人地址应仍匹配 jd_order_v2", () => {
    const jdVariations = ["订单编号", "商品名称", "订单金额", "下单时间", "收货人地址", "订单状态", "SKU编码", "运费"];
    const result = matchPlatformTemplate(jdVariations);
    expect(result).not.toBeNull();
    expect(result!.template.id).toBe("jd_order_v2");
  });

  it("京东列名在 matchAllTemplates 中应排第一", () => {
    const jdColumns = ["订单号", "商品标题", "订单金额", "下单时间", "收货地址", "订单状态", "SKU编码", "运费"];
    const results = matchAllTemplates(jdColumns);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].template.id).toBe("jd_order_v2");
  });
});

// ── CJK 复合词边界匹配回归测试 ──
// 修复：Intl.Segmenter 将"实付金额"拆为['实','付','金额']后，
// 子序列扫描对 keyword='金额' 能找到 seg '金额' ✓
// 但对 keyword='收货' 在 text='收货地址' → segs=['收货','地址'] 也正确 ✓
// 真正的边界 bug 出现在非纯 CJK 场景（如含单位括号），需 Strategy 3

describe("word-boundary matching edge cases", () => {
  it("实付金额(元) 应正确映射到 paid_amount（带单位的金额列）", () => {
    // tmall: required 2列 + 4 optional 全匹配；JD 只有 1 optional，即使全匹配 confidence 仍低于 tmall
    const cols = ["订单编号", "商品标题", "规格", "数量", "实付金额(元)", "下单时间", "订单状态", "收货地址", "买家昵称", "物流单号"];
    const result = matchPlatformTemplate(cols);
    expect(result).not.toBeNull();
    expect(result!.template.id).toBe("tmall_order_v2");
    expect(result!.columnMapping["实付金额(元)"]).toBe("paid_amount");
  });

  it("收货地址(完整) 应正确映射到 delivery_address", () => {
    // JD: required=2, optional=1，列数 9 在 [8,30] 范围内 → high confidence
    const cols = ["订单号", "商品标题", "订单金额", "下单时间", "收货地址(完整)", "订单状态", "SKU编码", "运费", "买家名称"];
    const result = matchPlatformTemplate(cols);
    expect(result).not.toBeNull();
    expect(result!.template.id).toBe("jd_order_v2");
    expect(result!.columnMapping["收货地址(完整)"]).toBe("delivery_address");
  });

  it("下单时间(精确到秒) 应正确映射到 order_time", () => {
    // JD: required 2列全匹配 + optional 1列匹配
    const cols = ["订单编号", "商品标题", "订单金额", "下单时间(精确到秒)", "收货地址", "订单状态", "SKU编码"];
    const result = matchPlatformTemplate(cols);
    expect(result).not.toBeNull();
    expect(result!.template.id).toBe("jd_order_v2");
    expect(result!.columnMapping["下单时间(精确到秒)"]).toBe("order_time");
  });

  it("拼团金额(元) 应让 pdd 模板正确映射 paid_amount", () => {
    // PDD: required 2列全匹配 + optional 3列匹配
    const cols = ["拼团订单号", "拼团金额(元)", "拼团时间", "商品标题", "商品类目", "拼单价(元)", "拼团销量", "买家昵称", "收货城市"];
    const result = matchPlatformTemplate(cols);
    expect(result).not.toBeNull();
    expect(result!.template.id).toBe("pdd_order_v2");
    expect(result!.columnMapping["拼团金额(元)"]).toBe("paid_amount");
  });
});

// ── 通用兜底模式回归测试 ──

describe("generic fallback", () => {
  it("无匹配列名时应返回 null（不匹配任何模板）", () => {
    const cols = ["xyz", "abc", "def", "ghi"];
    const result = matchPlatformTemplate(cols);
    expect(result).toBeNull();
  });

  it("应正确匹配通用商品目录模板", () => {
    const cols = ["商品名称", "类目", "价格", "规格", "上架时间", "库存"];
    const result = matchPlatformTemplate(cols);
    expect(result).not.toBeNull();
    expect(result!.template.id).toBe("generic_product_v2");
  });
});
