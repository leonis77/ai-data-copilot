/**
 * 15 套电商平台模板定义
 *
 * 覆盖：天猫/淘宝/拼多多/抖音/京东 订单导出、直通车/引力魔方/万相台/巨量千川 推广报表、
 *       退款单导出、通用库存/商品/供货表
 */

import type { PlatformTemplate } from "./types";

// ============================================================================
// 订单类模板 (5 套)
// ============================================================================

var tmallOrder: PlatformTemplate = {
  id: "tmall_order_v2",
  name: "天猫订单导出",
  platform: "tmall",
  category: "order",
  version: "2.0",
  description: "天猫商家中心 → 交易管理 → 导出订单",
  matchRules: {
    requiredColumns: ["订单编号", "商品"],
    optionalColumns: ["实付", "下单时间", "收货地址", "买家", "数量"],
    columnCountRange: [10, 40],
  },
  fieldMap: {
    "订单编号": { standard: "order_id", role: "identifier", aliases: ["订单号", "订单ID", "order_id"] },
    "商品标题": { standard: "product_name", role: "entity_name", aliases: ["商品名称", "商品", "宝贝标题", "产品名称"] },
    "商品规格": { standard: "sku_spec", role: "category", aliases: ["规格", "型号", "颜色分类"] },
    "数量": { standard: "quantity", role: "quantity", aliases: ["件数", "购买数量"] },
    "实付金额": { standard: "paid_amount", role: "money", businessConcept: "selling_price", aliases: ["实付", "成交价", "订单金额", "支付金额"] },
    "下单时间": { standard: "order_time", role: "datetime", aliases: ["订单创建时间", "购买时间", "交易时间"] },
    "订单状态": { standard: "order_status", role: "category", aliases: ["状态", "交易状态"] },
    "收货地址": { standard: "delivery_address", role: "location", aliases: ["地址", "收货人地址", "配送地址"] },
    "买家昵称": { standard: "buyer_name", role: "entity_name", businessConcept: "customer_name", aliases: ["买家", "买家ID", "客户"] },
  },
  parseRules: { headerRowStrategy: "first_row", dateFormat: "yyyy-MM-dd HH:mm:ss" },
};

var taobaoOrder: PlatformTemplate = {
  id: "taobao_order_v2",
  name: "淘宝订单导出",
  platform: "taobao",
  category: "order",
  version: "2.0",
  description: "千牛 → 交易管理 → 导出订单",
  matchRules: {
    requiredColumns: ["订单编号", "商品"],
    optionalColumns: ["实付", "下单时间", "收货地址", "买家"],
    columnCountRange: [8, 35],
  },
  fieldMap: {
    "订单编号": { standard: "order_id", role: "identifier", aliases: ["订单号", "订单ID"] },
    "商品标题": { standard: "product_name", role: "entity_name", aliases: ["商品名称", "宝贝名称", "产品"] },
    "数量": { standard: "quantity", role: "quantity", aliases: ["件数", "购买数量"] },
    "实付金额": { standard: "paid_amount", role: "money", businessConcept: "selling_price", aliases: ["实付", "成交价", "金额"] },
    "下单时间": { standard: "order_time", role: "datetime", aliases: ["创建时间", "购买时间"] },
    "收货地址": { standard: "delivery_address", role: "location", aliases: ["地址", "收货地址"] },
    "买家昵称": { standard: "buyer_name", role: "entity_name", businessConcept: "customer_name", aliases: ["买家", "买家ID"] },
  },
  parseRules: { headerRowStrategy: "first_row", dateFormat: "yyyy-MM-dd HH:mm:ss" },
};

var pddOrder: PlatformTemplate = {
  id: "pdd_order_v2",
  name: "拼多多订单导出",
  platform: "pdd",
  category: "order",
  version: "2.0",
  description: "拼多多商家后台 → 订单查询 → 导出",
  matchRules: {
    requiredColumns: ["订单号", "商品"],
    optionalColumns: ["成交金额", "下单时间", "收货地址"],
    columnCountRange: [8, 30],
  },
  fieldMap: {
    "订单号": { standard: "order_id", role: "identifier", aliases: ["订单编号", "订单ID"] },
    "商品名称": { standard: "product_name", role: "entity_name", aliases: ["商品标题", "商品", "产品名称"] },
    "数量": { standard: "quantity", role: "quantity", aliases: ["件数", "购买数量"] },
    "成交金额": { standard: "paid_amount", role: "money", businessConcept: "selling_price", aliases: ["实付金额", "订单金额", "支付金额"] },
    "下单时间": { standard: "order_time", role: "datetime", aliases: ["创建时间", "购买时间"] },
    "收货地址": { standard: "delivery_address", role: "location", aliases: ["地址", "收货人地址"] },
  },
  parseRules: { headerRowStrategy: "first_row", dateFormat: "yyyy-MM-dd HH:mm:ss" },
};

var douyinOrder: PlatformTemplate = {
  id: "douyin_order_v2",
  name: "抖音电商订单导出",
  platform: "douyin",
  category: "order",
  version: "2.0",
  description: "抖店后台 → 订单 → 导出",
  matchRules: {
    requiredColumns: ["订单", "商品"],
    optionalColumns: ["实付", "时间", "收货", "客户"],
    columnCountRange: [8, 30],
  },
  fieldMap: {
    "订单ID": { standard: "order_id", role: "identifier", aliases: ["订单号", "订单编号"] },
    "商品名称": { standard: "product_name", role: "entity_name", aliases: ["商品标题", "商品"] },
    "数量": { standard: "quantity", role: "quantity", aliases: ["件数"] },
    "实付金额": { standard: "paid_amount", role: "money", businessConcept: "selling_price", aliases: ["实付", "支付金额", "成交价"] },
    "创建时间": { standard: "order_time", role: "datetime", aliases: ["下单时间", "购买时间"] },
    "收货人": { standard: "buyer_name", role: "entity_name", businessConcept: "customer_name", aliases: ["买家", "客户"] },
    "收货地址": { standard: "delivery_address", role: "location", aliases: ["地址"] },
  },
  parseRules: { headerRowStrategy: "first_row", dateFormat: "yyyy-MM-dd HH:mm:ss" },
};

var jdOrder: PlatformTemplate = {
  id: "jd_order_v2",
  name: "京东订单导出",
  platform: "jd",
  category: "order",
  version: "2.0",
  description: "京东商家后台 → 订单管理 → 导出",
  matchRules: {
    requiredColumns: ["订单号", "商品"],
    optionalColumns: ["金额", "时间", "收货"],
    columnCountRange: [8, 30],
  },
  fieldMap: {
    "订单号": { standard: "order_id", role: "identifier", aliases: ["订单编号"] },
    "商品名称": { standard: "product_name", role: "entity_name", aliases: ["商品标题", "商品"] },
    "数量": { standard: "quantity", role: "quantity", aliases: ["件数"] },
    "订单金额": { standard: "paid_amount", role: "money", businessConcept: "selling_price", aliases: ["实付金额", "金额"] },
    "下单时间": { standard: "order_time", role: "datetime", aliases: ["创建时间"] },
    "收货地址": { standard: "delivery_address", role: "location", aliases: ["地址"] },
  },
  parseRules: { headerRowStrategy: "first_row", dateFormat: "yyyy-MM-dd HH:mm:ss" },
};

// ============================================================================
// 推广类模板 (5 套)
// ============================================================================

var zhitongchePlan: PlatformTemplate = {
  id: "ztc_plan_v2",
  name: "直通车-计划报表",
  platform: "alimama",
  category: "marketing",
  version: "2.0",
  description: "直通车后台 → 报表 → 计划维度导出",
  matchRules: {
    requiredColumns: ["花费", "展现"],
    optionalColumns: ["点击", "投产", "成交", "计划"],
    columnCountRange: [10, 40],
  },
  fieldMap: {
    "推广计划名称": { standard: "campaign_name", role: "entity_name", aliases: ["计划名称", "推广计划", "计划"] },
    "花费": { standard: "ad_spend", role: "money", businessConcept: "ad_spend", aliases: ["消耗", "广告费", "投放花费", "花费(元)"] },
    "展现量": { standard: "impressions", role: "quantity", aliases: ["展现", "曝光量", "曝光"] },
    "点击量": { standard: "clicks", role: "quantity", aliases: ["点击", "点击数"] },
    "点击率": { standard: "ctr", role: "text", aliases: ["CTR"] },
    "点击单价": { standard: "cpc", role: "money", aliases: ["CPC", "平均点击花费", "单次点击成本"] },
    "成交笔数": { standard: "conversions", role: "quantity", aliases: ["成交笔数", "订单数", "转化数"] },
    "成交金额": { standard: "revenue", role: "money", aliases: ["成交额", "GMV", "交易额"] },
    "投产比": { standard: "roi", role: "text", aliases: ["ROI", "投入产出比", "回报率"] },
    "日期": { standard: "date", role: "datetime", aliases: ["时间", "报表日期"] },
  },
  parseRules: { headerRowStrategy: "first_row", dateFormat: "yyyy-MM-dd", skipRows: [] },
};

var zhitongcheKeyword: PlatformTemplate = {
  id: "ztc_keyword_v2",
  name: "直通车-关键词报表",
  platform: "alimama",
  category: "marketing",
  version: "2.0",
  description: "直通车后台 → 报表 → 关键词维度导出",
  matchRules: {
    requiredColumns: ["关键词", "花费"],
    optionalColumns: ["展现", "点击", "投产", "转化"],
    columnCountRange: [8, 30],
  },
  fieldMap: {
    "关键词": { standard: "campaign_name", role: "entity_name", aliases: ["关键字", "词", "keyword"] },
    "花费": { standard: "ad_spend", role: "money", businessConcept: "ad_spend", aliases: ["消耗", "广告费"] },
    "展现量": { standard: "impressions", role: "quantity", aliases: ["展现", "曝光量"] },
    "点击量": { standard: "clicks", role: "quantity", aliases: ["点击"] },
    "点击率": { standard: "ctr", role: "text", aliases: ["CTR"] },
    "点击单价": { standard: "cpc", role: "money", aliases: ["CPC"] },
    "转化率": { standard: "cvr", role: "text", aliases: ["CVR", "成交转化率"] },
    "成交笔数": { standard: "conversions", role: "quantity", aliases: ["成交笔数", "订单数"] },
    "成交金额": { standard: "revenue", role: "money", aliases: ["成交额", "GMV"] },
    "投产比": { standard: "roi", role: "text", aliases: ["ROI"] },
  },
  parseRules: { headerRowStrategy: "first_row", dateFormat: "yyyy-MM-dd" },
};

var gravityCube: PlatformTemplate = {
  id: "gravity_cube_v2",
  name: "引力魔方-投放报表",
  platform: "alimama",
  category: "marketing",
  version: "2.0",
  description: "引力魔方后台 → 报表 → 导出",
  matchRules: {
    requiredColumns: ["花费", "展现"],
    optionalColumns: ["点击", "成交", "投产", "计划"],
    columnCountRange: [8, 30],
  },
  fieldMap: {
    "投放计划": { standard: "campaign_name", role: "entity_name", aliases: ["计划名称", "推广计划"] },
    "花费": { standard: "ad_spend", role: "money", businessConcept: "ad_spend", aliases: ["消耗", "广告费"] },
    "展现量": { standard: "impressions", role: "quantity", aliases: ["展现", "曝光"] },
    "点击量": { standard: "clicks", role: "quantity", aliases: ["点击"] },
    "成交金额": { standard: "revenue", role: "money", aliases: ["成交额", "GMV"] },
    "投产比": { standard: "roi", role: "text", aliases: ["ROI"] },
  },
  parseRules: { headerRowStrategy: "first_row", dateFormat: "yyyy-MM-dd" },
};

var wanxiangtai: PlatformTemplate = {
  id: "wanxiangtai_v2",
  name: "万相台-投放报表",
  platform: "alimama",
  category: "marketing",
  version: "2.0",
  description: "万相台后台 → 报表 → 导出",
  matchRules: {
    requiredColumns: ["花费"],
    optionalColumns: ["展现", "成交", "ROI", "场景"],
    columnCountRange: [6, 25],
  },
  fieldMap: {
    "场景名称": { standard: "campaign_name", role: "entity_name", aliases: ["场景", "投放场景"] },
    "花费": { standard: "ad_spend", role: "money", businessConcept: "ad_spend", aliases: ["消耗", "广告费"] },
    "展现量": { standard: "impressions", role: "quantity", aliases: ["展现", "曝光"] },
    "点击量": { standard: "clicks", role: "quantity", aliases: ["点击"] },
    "成交金额": { standard: "revenue", role: "money", aliases: ["成交额", "GMV"] },
    "投产比": { standard: "roi", role: "text", aliases: ["ROI"] },
  },
  parseRules: { headerRowStrategy: "first_row", dateFormat: "yyyy-MM-dd" },
};

var qianchuan: PlatformTemplate = {
  id: "qianchuan_v2",
  name: "巨量千川-广告报表",
  platform: "qianchuan",
  category: "marketing",
  version: "2.0",
  description: "巨量千川后台 → 报表 → 导出",
  matchRules: {
    requiredColumns: ["消耗", "展现"],
    optionalColumns: ["点击", "转化", "投产", "计划"],
    columnCountRange: [8, 30],
  },
  fieldMap: {
    "计划名称": { standard: "campaign_name", role: "entity_name", aliases: ["推广计划", "广告计划"] },
    "消耗": { standard: "ad_spend", role: "money", businessConcept: "ad_spend", aliases: ["花费", "广告费", "投放消耗"] },
    "展现量": { standard: "impressions", role: "quantity", aliases: ["展现", "曝光量"] },
    "点击量": { standard: "clicks", role: "quantity", aliases: ["点击", "点击数"] },
    "点击率": { standard: "ctr", role: "text", aliases: ["CTR"] },
    "转化数": { standard: "conversions", role: "quantity", aliases: ["成交笔数", "订单数"] },
    "成交金额": { standard: "revenue", role: "money", aliases: ["成交额", "GMV", "交易额"] },
    "投产比": { standard: "roi", role: "text", aliases: ["ROI", "投入产出比"] },
    "日期": { standard: "date", role: "datetime", aliases: ["时间", "报表日期"] },
  },
  parseRules: { headerRowStrategy: "first_row", dateFormat: "yyyy-MM-dd" },
};

// ============================================================================
// 售后/库存/商品类模板 (5 套)
// ============================================================================

var taobaoRefund: PlatformTemplate = {
  id: "taobao_refund_v2",
  name: "淘宝退款单导出",
  platform: "taobao",
  category: "aftersales",
  version: "2.0",
  description: "千牛 → 退款管理 → 导出",
  matchRules: {
    requiredColumns: ["退款", "金额"],
    optionalColumns: ["商品", "原因", "时间"],
    columnCountRange: [6, 25],
  },
  fieldMap: {
    "退款编号": { standard: "refund_id", role: "identifier", aliases: ["退款单号", "退款ID"] },
    "商品名称": { standard: "product_name", role: "entity_name", aliases: ["商品标题", "商品"] },
    "退款金额": { standard: "refund_amount", role: "money", businessConcept: "refund_amount", aliases: ["退款", "金额", "退款总额"] },
    "退款原因": { standard: "refund_reason", role: "category", aliases: ["原因", "退款类型", "售后原因"] },
    "申请时间": { standard: "refund_time", role: "datetime", aliases: ["退款时间", "创建时间"] },
  },
  parseRules: { headerRowStrategy: "first_row", dateFormat: "yyyy-MM-dd HH:mm:ss" },
};

var pddRefund: PlatformTemplate = {
  id: "pdd_refund_v2",
  name: "拼多多退款单导出",
  platform: "pdd",
  category: "aftersales",
  version: "2.0",
  description: "商家后台 → 售后管理 → 导出",
  matchRules: {
    requiredColumns: ["售后", "金额"],
    optionalColumns: ["商品", "原因", "时间"],
    columnCountRange: [5, 20],
  },
  fieldMap: {
    "售后单号": { standard: "refund_id", role: "identifier", aliases: ["退款编号", "售后ID"] },
    "商品名称": { standard: "product_name", role: "entity_name", aliases: ["商品标题"] },
    "退款金额": { standard: "refund_amount", role: "money", businessConcept: "refund_amount", aliases: ["售后金额", "退款"] },
    "售后原因": { standard: "refund_reason", role: "category", aliases: ["退款原因", "原因"] },
    "申请时间": { standard: "refund_time", role: "datetime", aliases: ["退款时间"] },
  },
  parseRules: { headerRowStrategy: "first_row", dateFormat: "yyyy-MM-dd HH:mm:ss" },
};

var genericInventory: PlatformTemplate = {
  id: "generic_inventory_v2",
  name: "通用库存表",
  platform: "generic",
  category: "inventory",
  version: "2.0",
  description: "ERP/仓库导出的库存表（列名差异大，用 AI 辅助匹配）",
  matchRules: {
    requiredColumns: ["商品", "库存"],
    requiredMatchRate: 0.5,
    optionalColumns: ["仓库", "库龄", "安全库存"],
    columnCountRange: [3, 20],
  },
  fieldMap: {
    "商品名称": { standard: "product_name", role: "entity_name", aliases: ["商品", "SKU", "货品", "名称", "产品"] },
    "库存量": { standard: "stock_quantity", role: "quantity", businessConcept: "stock_quantity", aliases: ["库存", "在库", "存货", "库存数量", "可用库存"] },
    "仓库名称": { standard: "warehouse_name", role: "location", aliases: ["仓库", "库房", "存放位置"] },
    "库龄": { standard: "stock_age", role: "quantity", aliases: ["库龄(天)", "存放天数"] },
  },
  parseRules: { headerRowStrategy: "auto_detect", hasMergedCells: true },
};

var genericProduct: PlatformTemplate = {
  id: "generic_product_v2",
  name: "通用商品目录",
  platform: "generic",
  category: "product",
  version: "2.0",
  description: "商家后台导出或自建的商品/SKU目录",
  matchRules: {
    requiredColumns: ["商品", "类目"],
    requiredMatchRate: 0.5,
    optionalColumns: ["价格", "规格", "状态", "上架时间"],
    columnCountRange: [3, 20],
  },
  fieldMap: {
    "商品名称": { standard: "product_name", role: "entity_name", aliases: ["商品", "SKU", "货品", "名称"] },
    "类目": { standard: "category", role: "category", aliases: ["分类", "品类", "商品类目"] },
    "价格": { standard: "price", role: "money", aliases: ["售价", "标价", "零售价"] },
    "规格": { standard: "spec", role: "category", aliases: ["型号", "规格参数"] },
    "上架时间": { standard: "listing_time", role: "datetime", aliases: ["创建时间", "上架日期"] },
  },
  parseRules: { headerRowStrategy: "first_row" },
};

var genericSupply: PlatformTemplate = {
  id: "generic_supply_v2",
  name: "通用供货报价表",
  platform: "generic",
  category: "supply",
  version: "2.0",
  description: "供应商提供的报价单/供货表（格式多样，用 AI 辅助）",
  matchRules: {
    requiredColumns: ["商品", "价格"],
    requiredMatchRate: 0.5,
    optionalColumns: ["供应商", "规格", "起订量", "产地"],
    columnCountRange: [3, 15],
  },
  fieldMap: {
    "商品名称": { standard: "product_name", role: "entity_name", aliases: ["商品", "货品", "名称", "品名", "产品"] },
    "采购价": { standard: "procurement_cost", role: "money", businessConcept: "procurement_cost", aliases: ["价格", "报价", "单价", "进货价", "批发价", "供货价", "成本价"] },
    "供应商": { standard: "supplier_name", role: "entity_name", businessConcept: "supplier_name", aliases: ["厂家", "供货商", "批发商"] },
    "规格": { standard: "spec", role: "category", aliases: ["型号", "包装规格", "单位"] },
    "起订量": { standard: "moq", role: "quantity", aliases: ["最小起订量", "MOQ", "最低订货"] },
    "产地": { standard: "origin", role: "location", aliases: ["货源", "产地", "来源"] },
  },
  parseRules: { headerRowStrategy: "auto_detect", hasMergedCells: true },
};

// ============================================================================
// 全量模板注册表
// ============================================================================

/** 所有已注册的增强模板 */
export var ALL_PLATFORM_TEMPLATES: PlatformTemplate[] = [
  // 订单
  tmallOrder, taobaoOrder, pddOrder, douyinOrder, jdOrder,
  // 推广
  zhitongchePlan, zhitongcheKeyword, gravityCube, wanxiangtai, qianchuan,
  // 售后
  taobaoRefund, pddRefund,
  // 库存/商品/供货
  genericInventory, genericProduct, genericSupply,
];

/** 按分类获取模板 */
export function getTemplatesByCategory(category: string): PlatformTemplate[] {
  return ALL_PLATFORM_TEMPLATES.filter(function (t) { return t.category === category; });
}

/** 按平台获取模板 */
export function getTemplatesByPlatform(platform: string): PlatformTemplate[] {
  return ALL_PLATFORM_TEMPLATES.filter(function (t) { return t.platform === platform; });
}
