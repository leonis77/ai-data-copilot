/**
 * Metrics Engine 单测
 *
 * 覆盖：
 * - computeProductMetrics 商品指标
 * - computeStoreMetrics 店铺指标
 * - 边界条件（空数据、零值）
 */

import { describe, it, expect } from "vitest";
import { computeProductMetrics, computeStoreMetrics } from "@/lib/engines/metrics-engine";

describe("computeProductMetrics", () => {
  const rows = [
    { name: "商品A", price: 100, qty: 2 },
    { name: "商品A", price: 100, qty: 3 },
    { name: "商品B", price: 50, qty: 1 },
    { name: "商品B", price: 60, qty: 2 },
    { name: "商品C", price: 200, qty: 1 },
  ];

  it("应正确计算单品收入、销量和均价", () => {
    const products = computeProductMetrics(rows, "name", "price", "qty");
    const a = products.find(function (p) { return p.name === "商品A"; })!;
    expect(a.revenue).toBeCloseTo(500, 2); // 100*2 + 100*3
    expect(a.sales).toBe(5);
    expect(a.avgPrice).toBeCloseTo(100, 2);
  });

  it("应按收入降序排列", () => {
    const products = computeProductMetrics(rows, "name", "price", "qty");
    expect(products[0].name).toBe("商品A");
    expect(products[1].name).toBe("商品C");
    expect(products[2].name).toBe("商品B");
  });

  it("应正确计算贡献度（百分比）", () => {
    const products = computeProductMetrics(rows, "name", "price", "qty");
    const total = products.reduce(function (s, p) { return s + p.revenue; }, 0);
    expect(products[0].contribution).toBeCloseTo(products[0].revenue / total * 100, 1);
  });

  it("无数量字段时应默认 qty=1", () => {
    const simpleRows = [
      { name: "X", price: 10 },
      { name: "X", price: 20 },
    ];
    const products = computeProductMetrics(simpleRows, "name", "price");
    expect(products[0].sales).toBe(2);
    expect(products[0].revenue).toBeCloseTo(30, 2);
  });

  it("空数组应返回空数组", () => {
    expect(computeProductMetrics([], "name", "price")).toEqual([]);
  });
});

describe("computeStoreMetrics", () => {
  it("应正确计算 GMV 和 AOV", () => {
    const products = [
      { name: "A", revenue: 1000, sales: 10, avgPrice: 100, contribution: 50, stock: 20, turnover: 0.5 },
      { name: "B", revenue: 500, sales: 5, avgPrice: 100, contribution: 25, stock: 10, turnover: 0.5 },
      { name: "C", revenue: 500, sales: 5, avgPrice: 100, contribution: 25, stock: 0, turnover: undefined },
    ];
    const store = computeStoreMetrics(products, 20);
    expect(store.gmv).toBeCloseTo(2000, 2);
    expect(store.avgOrderValue).toBeCloseTo(100, 2);
  });

  it("应正确计算 Top3 SKU 占比", () => {
    const products = [
      { name: "A", revenue: 700, sales: 10, avgPrice: 70, contribution: 70 },
      { name: "B", revenue: 200, sales: 10, avgPrice: 20, contribution: 20 },
      { name: "C", revenue: 100, sales: 10, avgPrice: 10, contribution: 10 },
    ];
    const store = computeStoreMetrics(products, 30);
    expect(store.topSkuRatio).toBe(100); // Top3 = 100% of total
  });

  it("应正确计算长尾占比", () => {
    // longTail 定义：contribution < 2% 的商品
    const products = [
      { name: "A", revenue: 5000, sales: 100, avgPrice: 50, contribution: 50 },
      { name: "B", revenue: 2000, sales: 40, avgPrice: 50, contribution: 20 },
      { name: "C", revenue: 1500, sales: 30, avgPrice: 50, contribution: 15 },
      { name: "D", revenue: 800, sales: 16, avgPrice: 50, contribution: 1.5 },  // < 2%
      { name: "E", revenue: 700, sales: 14, avgPrice: 50, contribution: 1.0 },  // < 2%
    ];
    const store = computeStoreMetrics(products, 200);
    expect(store.longTailRatio).toBeCloseTo(40, 0); // 2/5 = 40%
  });

  it("库存健康度应按有库存商品占比计算", () => {
    const products = [
      { name: "A", revenue: 100, sales: 1, avgPrice: 100, contribution: 50, stock: 10, turnover: 0.1 },
      { name: "B", revenue: 100, sales: 1, avgPrice: 100, contribution: 50, stock: 0, turnover: undefined },
    ];
    const store = computeStoreMetrics(products, 2);
    expect(store.stockHealth).toBeCloseTo(50, 0);
  });

  it("空商品数组应返回零值", () => {
    const store = computeStoreMetrics([], 0);
    expect(store.gmv).toBe(0);
    expect(store.orderCount).toBe(0);
    expect(store.avgOrderValue).toBe(0);
    expect(store.topSkuRatio).toBe(0);
    expect(store.longTailRatio).toBe(0);
    expect(store.stockHealth).toBe(0);
  });
});
