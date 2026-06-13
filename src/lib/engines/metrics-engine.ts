// Business metrics computation engine
export interface ProductMetrics {
  name: string;
  revenue: number;
  sales: number;
  avgPrice: number;
  contribution: number;    // % of total revenue
  stock?: number;
  turnover?: number;        // sales/stock ratio
}

export interface StoreMetrics {
  gmv: number;
  orderCount: number;
  avgOrderValue: number;
  topSkuRatio: number;     // Top 3 SKU revenue / total
  longTailRatio: number;   // SKUs contributing < 2% each
  stockHealth?: number;     // 0-100
}

export function computeProductMetrics(rows: any[], nameField: string, priceField: string, qtyField?: string, stockField?: string): ProductMetrics[] {
  const total = rows.reduce(function(s,r){return s+(Number(r[priceField])||0)},0);
  const map: Record<string, {revenue:number; sales:number; price:number; stock:number; count:number}> = {};
  for (const r of rows) {
    const name = String(r[nameField] || "unknown");
    const price = Number(r[priceField]) || 0;
    const qty = qtyField ? (Number(r[qtyField])||1) : 1;
    const stock = stockField ? (Number(r[stockField])||0) : 0;
    if (!map[name]) map[name] = {revenue:0, sales:0, price:0, stock:0, count:0};
    map[name].revenue += price * qty;
    map[name].sales += qty;
    map[name].price = price;
    map[name].stock = stock;
    map[name].count += 1;
  }
  const result: ProductMetrics[] = [];
  for (const k in map) {
    const m = map[k];
    result.push({
      name: k, revenue: Math.round(m.revenue*100)/100, sales: m.sales,
      avgPrice: Math.round(m.price*100)/100,
      contribution: total>0 ? Math.round(m.revenue/total*10000)/100 : 0,
      stock: m.stock, turnover: m.stock>0 ? Math.round(m.sales/m.stock*100)/100 : undefined,
    });
  }
  result.sort(function(a,b){return b.revenue-a.revenue});
  return result;
}

export function computeStoreMetrics(products: ProductMetrics[], orderCount: number): StoreMetrics {
  const gmv = products.reduce(function(s,p){return s+p.revenue},0);
  const top3 = products.slice(0,3).reduce(function(s,p){return s+p.revenue},0);
  const longTailCount = products.filter(function(p){return p.contribution<2}).length;
  const topSkuRatio = gmv>0 ? Math.round(top3/gmv*100) : 0;
  const longTailRatio = products.length>0 ? Math.round(longTailCount/products.length*100) : 0;
  return {
    gmv: Math.round(gmv*100)/100, orderCount,
    avgOrderValue: orderCount>0 ? Math.round(gmv/orderCount*100)/100 : 0,
    topSkuRatio, longTailRatio,
  };
}
