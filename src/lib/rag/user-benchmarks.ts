/**
 * 用户历史基准 — 从分析结果提取指标 + 检索历史对比
 *
 * 设计原则：
 * - 只存聚合指标（GMV/客单价/毛利率/退货率...），不存原始数据
 * - 每次分析完成后自动计算并存储
 * - 检索时提供环比/同比对比
 */

import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export interface Benchmark {
  metric: string;
  label: string;
  value: number;
  unit: string;
}

export interface BenchmarkComparison {
  metric: string;
  label: string;
  current: number;
  previous?: number;
  change?: number;
  changePercent?: number;
  unit: string;
}

/**
 * 从分析结果中提取核心指标
 */
export function computeUserBenchmarks(
  userId: string,
  stats: any,
  rowCount: number,
  columnCount: number,
  tableClass?: string,
  totalRevenue?: number,
  totalCost?: number,
  refundRate?: number
): Benchmark[] {
  var benchmarks: Benchmark[] = [];

  benchmarks.push({ metric: "row_count", label: "数据行数", value: rowCount, unit: "行" });
  benchmarks.push({ metric: "column_count", label: "字段数", value: columnCount, unit: "个" });

  if (totalRevenue !== undefined && totalRevenue > 0) {
    benchmarks.push({ metric: "total_revenue", label: "总收入", value: Math.round(totalRevenue * 100) / 100, unit: "¥" });
  }

  if (totalCost !== undefined && totalCost > 0 && totalRevenue !== undefined && totalRevenue > 0) {
    var margin = Math.round((totalRevenue - totalCost) / totalRevenue * 10000) / 100;
    benchmarks.push({ metric: "profit_margin", label: "毛利率", value: margin, unit: "%" });
  }

  if (refundRate !== undefined) {
    benchmarks.push({ metric: "refund_rate", label: "退款率", value: Math.round(refundRate * 10000) / 100, unit: "%" });
  }

  // 从 stats 提取更多指标
  if (stats && stats.stats) {
    var entries = Object.entries(stats.stats);
    for (var i = 0; i < Math.min(entries.length, 3); i++) {
      var entry = entries[i] as [string, any];
      if (entry[1].avg && entry[1].avg > 0) {
        benchmarks.push({
          metric: "avg_" + entry[0].substring(0, 20),
          label: entry[0] + "均值",
          value: Math.round(entry[1].avg * 100) / 100,
          unit: "¥",
        });
      }
    }
  }

  return benchmarks;
}

/**
 * 存储用户基准到 Supabase（非阻塞，失败不影响主流程）
 */
export async function saveUserBenchmarks(userId: string, benchmarks: Benchmark[]): Promise<void> {
  try {
    var supabaseUrl = process.env.SUPABASE_URL;
    var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      logger.info("Supabase unavailable, skipping benchmark save");
      return;
    }

    var client = createClient(supabaseUrl, supabaseKey);
    var rows = benchmarks.map(function (b) {
      return {
        user_id: userId,
        metric: b.metric,
        value: b.value,
        context: JSON.stringify({ label: b.label, unit: b.unit, computed_at: new Date().toISOString() }),
      };
    });

    var { error } = await client.from("user_benchmarks").insert(rows);
    if (error) {
      logger.warn("Failed to save user benchmarks", { message: error.message });
    }
  } catch (e) {
    logger.warn("saveUserBenchmarks failed", { message: String(e) });
  }
}

/**
 * 获取用户历史基准（用于环比对比）
 */
export async function getUserHistory(userId: string, metric?: string): Promise<BenchmarkComparison[]> {
  try {
    var supabaseUrl = process.env.SUPABASE_URL;
    var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) return [];

    var client = createClient(supabaseUrl, supabaseKey);
    var query = client.from("user_benchmarks").select("*").eq("user_id", userId).order("computed_at", { ascending: false }).limit(20);

    if (metric) query = query.eq("metric", metric);

    var { data, error } = await query;

    if (error || !data || data.length === 0) return [];

    // 确保 data 是数组
    var rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) return [];

    // 按指标分组，取最近两次做对比
    var groups: Record<string, any[]> = {};
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (!groups[row.metric]) groups[row.metric] = [];
      groups[row.metric].push(row);
    }

    var comparisons: BenchmarkComparison[] = [];
    for (var key in groups) {
      if (!groups.hasOwnProperty(key)) continue;
      var group = groups[key];
      if (group.length < 2) continue; // 至少需要两次数据才能对比

      var current = group[0];
      var previous = group[1];
      var change = Number(current.value) - Number(previous.value);
      var changePercent = Number(previous.value) > 0
        ? Math.round(change / Number(previous.value) * 10000) / 100
        : 0;

      var context: any = {};
      try { context = JSON.parse(current.context || "{}"); } catch (e) {}

      comparisons.push({
        metric: current.metric,
        label: context.label || current.metric,
        current: Math.round(Number(current.value) * 100) / 100,
        previous: Math.round(Number(previous.value) * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: changePercent,
        unit: context.unit || "",
      });
    }

    return comparisons;
  } catch (e) {
    logger.warn("getUserHistory failed", { message: String(e) });
    return [];
  }
}

/**
 * 将历史对比格式化为 AI prompt 可用的文本
 */
export function formatHistoryForPrompt(comparisons: BenchmarkComparison[]): string {
  if (comparisons.length === 0) return "";

  var lines: string[] = ["[YOUR HISTORY] 你的历史数据对比："];
  for (var i = 0; i < comparisons.length; i++) {
    var c = comparisons[i];
    var cp = c.changePercent || 0;
    var direction = cp > 0 ? "↑" : cp < 0 ? "↓" : "→";
    lines.push("  " + c.label + ": 本次 " + c.current + c.unit + "，上次 " + c.previous + c.unit + "（" + direction + Math.abs(cp) + "%）");
  }
  return lines.join("\n");
}
