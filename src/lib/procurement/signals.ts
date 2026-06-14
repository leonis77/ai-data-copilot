export type ProductSignal = "hot" | "value" | "new" | "tail" | "caution";

export interface TaggedProduct {
  name: string; price: number; signals: ProductSignal[]; reason: string; category: string;
}

function containsTag(category: string, price: number, p25: number, p75: number): { signals: ProductSignal[]; reason: string } {
  const signals: ProductSignal[] = [];
  const reasons: string[] = [];
  const cat = category;

  if (/\u4e3b\u63a8/.test(cat)) { signals.push("hot"); reasons.push("\u4e3b\u63a8"); }
  if (/\u4e3b\u63a8/.test(cat) && !/\u4e3b\u63a8/.test(cat)) { signals.push("new"); reasons.push("\u65b0\u54c1"); }
  if (price < p25 && !/\u4e3b\u63a8/.test(cat)) { signals.push("value"); reasons.push("\u9ad8\u6027\u4ef7\u6bd4"); }
  if (/\u4e3b\u63a8/.test(cat)) { signals.push("tail"); reasons.push("\u5c3e\u5b63"); }
  if (/\u4e3b\u63a8/.test(cat) && (/\u4e3b\u63a8/.test(cat) || /\u552e\u540e/.test(cat) || /\u552e\u540e/.test(cat) || /\u597d\u8bc4\u4f4e/.test(cat))) {
    signals.push("caution"); reasons.push("\u98ce\u9669\u5546\u54c1");
  }

  return { signals: signals.length > 0 ? signals : [], reason: reasons.join("\uff0c") || "\u666e\u901a" };
}

export function tagProducts(
  rows: Record<string, unknown>[],
  nameCol: string, catCol: string, priceCol: string,
  p25: number, p75: number,
  limit = 200
): TaggedProduct[] {
  const result: TaggedProduct[] = [];
  for (let i = 0; i < Math.min(rows.length, limit); i++) {
    const row = rows[i];
    const name = String(row[nameCol] || "\u672a\u77e5");
    const cat = String(row[catCol] || "");
    const price = Number(row[priceCol]) || 0;
    if (!name || price <= 0) continue;
    const { signals, reason } = containsTag(cat, price, p25, p75);
    if (signals.length > 0) {
      result.push({ name: name.length > 20 ? name.substring(0, 20) + "..." : name, price, signals, reason, category: cat });
    }
  }
  return result;
}
