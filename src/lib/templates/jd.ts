import { LegacyTemplate } from "./types";

export const jd: LegacyTemplate = {
  id: "jd",
  name: "京东",
  fieldMap: {
    "订单号": "order_id",
    "商品名称": "product_name",
    "商品数量": "quantity",
    "订单金额": "amount",
    "订单状态": "status",
    "下单时间": "order_time",
    "收货人": "buyer_name",
    "收货地址": "address",
    "SKU编码": "sku",
    "订单备注": "remark",
    "运费": "shipping",
    "支付方式": "pay_method",
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
    "shipping": "number",
    "pay_method": "category",
  },
  cleanRules: {
    "amount": "removeSymbol",
    "order_time": "parseDate",
    "shipping": "removeSymbol",
  },
};
