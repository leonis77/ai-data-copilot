import { LegacyTemplate } from "./types";

export const douyin: LegacyTemplate = {
  id: "douyin",
  name: "抖音电商",
  fieldMap: {
    "订单ID": "order_id",
    "订单编号": "order_id",
    "商品名称": "product_name",
    "规格": "sku",
    "数量": "quantity",
    "实付金额": "amount",
    "下单时间": "order_time",
    "订单状态": "status",
    "收货人": "buyer_name",
    "收货地址": "address",
    "买家备注": "remark",
    "运单号": "tracking",
  },
  columnTypes: {
    "amount": "number",
    "order_time": "date",
    "status": "category",
    "quantity": "number",
    "product_name": "text",
    "sku": "category",
    "buyer_name": "text",
    "address": "text",
  },
  cleanRules: {
    "amount": "removeSymbol",
    "order_time": "parseDate",
  },
};
