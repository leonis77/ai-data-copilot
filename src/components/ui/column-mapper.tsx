"use client";

import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";

const STANDARD_FIELDS = ["ignore", "amount", "order_time", "product_name", "quantity", "status", "address", "sku", "buyer_name"] as const;
const FIELD_LABELS: Record<string, string> = {
  ignore: "忽略此列", amount: "金额", order_time: "下单时间", product_name: "商品名称",
  quantity: "数量", status: "订单状态", address: "收货地址", sku: "规格/SKU", buyer_name: "买家名称",
};

interface ColumnMapperProps {
  columns: string[];
  onConfirm: (mapping: Record<string, string>) => void;
  onCancel: () => void;
}

export function ColumnMapper({ columns, onConfirm, onCancel }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>(function() {
    const init: Record<string, string> = {};
    for (const c of columns) {
      const lc = c.toLowerCase();
      if (/amount|金额|价格|实付|总额|price/.test(lc)) init[c] = "amount";
      else if (/time|时间|日期|下单|date|order/.test(lc)) init[c] = "order_time";
      else if (/name|名称|商品|产品|title|title/.test(lc)) init[c] = "product_name";
      else if (/数量|quantity|qty|num/.test(lc)) init[c] = "quantity";
      else if (/状态|status/.test(lc)) init[c] = "status";
      else if (/地址|address|addr|收货/.test(lc)) init[c] = "address";
      else if (/sku|规格/.test(lc)) init[c] = "sku";
      else if (/买家|buyer|会员/.test(lc)) init[c] = "buyer_name";
      else init[c] = "ignore";
    }
    return init;
  });

  return (
    <div className="glass rounded-xl p-4 space-y-4">
      <div className="text-sm font-medium text-white/70">手动映射列到标准字段</div>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {columns.map(function(col) {
          const current = mapping[col] || "ignore";
          return (
            <div key={col} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03]">
              <span className="flex-1 text-sm text-white/70 truncate">{col}</span>
              <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />
              <select
                value={current}
                onChange={function(e) { setMapping({...mapping, [col]: e.target.value}); }}
                className="glass px-3 py-1.5 rounded-lg text-xs text-white/70 bg-transparent outline-none"
              >
                {STANDARD_FIELDS.map(function(f) {
                  return <option key={f} value={f}>{FIELD_LABELS[f]}</option>;
                })}
              </select>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl glass text-sm text-white/50 hover:text-white/80 transition-all">取消</button>
        <button onClick={function() { onConfirm(mapping); }} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-primary to-accent-purple text-white text-sm font-medium transition-all hover:shadow-lg hover:shadow-primary/25"><Check className="w-3.5 h-3.5" />确认映射</button>
      </div>
    </div>
  );
}
