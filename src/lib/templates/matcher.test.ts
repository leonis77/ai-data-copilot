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
    expect(result!.template.platform).toBe("jd");
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
    const pddColumns = ["拼团订单号", "商品标题", "商品类目", "拼团金额(元)", "拼团时间", "买家昵称", "收货城市", "SKU编码"];
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
    expect(result!.template.platform).toBe("douyin");
  });
});
