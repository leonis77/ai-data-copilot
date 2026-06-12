import { PlatformTemplate } from "./types";

export const tmall: PlatformTemplate = {
  id: "tmall",
  name: "天猫/淘宝",
  fieldMap: {
    "订单编号": "order_id",
    "买家会员名": "buyer_name",
    "买家实际支付金额": "amount",
    "订单创建时间": "order_time",
    "订单状态": "status",
    "宝贝标题": "product_name",
    "SKU": "sku",
    "数量": "quantity",
    "收货地址": "address",
    "买家留言": "note",
    "物流单号": "tracking",
    "订单备注": "remark",
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
