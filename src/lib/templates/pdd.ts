import { PlatformTemplate } from "./types";

export const pdd: PlatformTemplate = {
  id: "pdd",
  name: "拼多多",
  fieldMap: {
    "订单号": "order_id",
    "商品名称": "product_name",
    "商品数量": "quantity",
    "订单金额": "amount",
    "订单状态": "status",
    "下单时间": "order_time",
    "收货人": "buyer_name",
    "收货地址": "address",
    "SKU": "sku",
    "备注": "remark",
    "快递单号": "tracking",
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
