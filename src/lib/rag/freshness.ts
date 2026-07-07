/**
 * 知识新鲜度检查引擎 v1.0
 *
 * 四层联防中的 Layer 2-3：
 *   - 元数据驱动过期检测 (Layer 2)
 *   - LLM 交叉验证 (Layer 3)
 *   - 过期降级策略 (Layer 1)
 *
 * 每条知识注入前必须经过此引擎检查。
 */

import { KnowledgeEntry } from "./knowledge";

export type FreshnessStatus = "fresh" | "near_expiry" | "expired" | "unverified" | "evergreen";

export interface FreshnessResult {
  status: FreshnessStatus;
  injectable: boolean;
  injectionLabel: string;
  daysUntilExpiry: number;
  rejectReason?: string;
}

/**
 * 检查单条知识的新鲜度
 */
export function freshnessCheck(entry: KnowledgeEntry, now?: Date): FreshnessResult {
  const today = now || new Date();
  const todayStr = today.toISOString().split("T")[0];

  if (entry.volatility === "evergreen") {
    return {
      status: "evergreen",
      injectable: true,
      injectionLabel: "方法论 · 长期有效",
      daysUntilExpiry: 99999,
    };
  }

  const validUntil = new Date(entry.validUntil);
  const lastVerified = new Date(entry.lastVerified);
  const daysUntilExpiry = Math.ceil((validUntil.getTime() - today.getTime()) / 86400000);
  const daysSinceVerified = Math.ceil((today.getTime() - lastVerified.getTime()) / 86400000);

  if (daysUntilExpiry < 0) {
    return {
      status: "expired",
      injectable: false,
      injectionLabel: "",
      daysUntilExpiry,
      rejectReason: "知识已过期 " + Math.abs(daysUntilExpiry) + " 天（有效期至 " + entry.validUntil + "）",
    };
  }

  if (entry.confidence < 0.50) {
    return {
      status: "unverified",
      injectable: false,
      injectionLabel: "",
      daysUntilExpiry,
      rejectReason: "置信度过低（" + Math.round(entry.confidence * 100) + "% < 50%）",
    };
  }

  if (daysUntilExpiry <= 30) {
    return {
      status: "near_expiry",
      injectable: true,
      injectionLabel: "⚠️ 临近过期 · 有效期至 " + entry.validUntil,
      daysUntilExpiry,
    };
  }

  const maxUnverifiedDays = entry.volatility === "quarterly" ? 90 : 180;
  if (daysSinceVerified > maxUnverifiedDays) {
    return {
      status: "near_expiry",
      injectable: true,
      injectionLabel: "待更新 · 上次验证 " + entry.lastVerified + "（" + daysSinceVerified + "天前）",
      daysUntilExpiry,
    };
  }

  if (entry.confidence < 0.70) {
    return {
      status: "near_expiry",
      injectable: true,
      injectionLabel: "⚠️ 低置信度(" + Math.round(entry.confidence * 100) + "%) · 仅供参考",
      daysUntilExpiry,
    };
  }

  return {
    status: "fresh",
    injectable: true,
    injectionLabel: "已验证 " + todayStr.slice(0, 7),
    daysUntilExpiry,
  };
}

/**
 * 批量新鲜度检查
 */
export function batchFreshnessCheck(
  entries: KnowledgeEntry[],
  now?: Date
): {
  injectable: Array<{ entry: KnowledgeEntry; result: FreshnessResult }>;
  withWarning: Array<{ entry: KnowledgeEntry; result: FreshnessResult }>;
  rejected: Array<{ entry: KnowledgeEntry; result: FreshnessResult }>;
} {
  const injectable: Array<{ entry: KnowledgeEntry; result: FreshnessResult }> = [];
  const withWarning: Array<{ entry: KnowledgeEntry; result: FreshnessResult }> = [];
  const rejected: Array<{ entry: KnowledgeEntry; result: FreshnessResult }> = [];

  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    var result = freshnessCheck(entry, now);

    if (!result.injectable) {
      rejected.push({ entry: entry, result: result });
    } else if (result.status === "fresh" || result.status === "evergreen") {
      injectable.push({ entry: entry, result: result });
    } else {
      withWarning.push({ entry: entry, result: result });
    }
  }

  return { injectable: injectable, withWarning: withWarning, rejected: rejected };
}

/**
 * 判断知识是否已过期
 */
export function isExpired(entry: KnowledgeEntry, now?: Date): boolean {
  if (entry.volatility === "evergreen") return false;
  const today = now || new Date();
  return entry.validUntil < today.toISOString().split("T")[0];
}

/**
 * 判断知识是否需要人工审核
 */
export function needsReview(entry: KnowledgeEntry, now?: Date): boolean {
  if (entry.volatility === "evergreen") return false;
  const today = now || new Date();
  const lastVerified = new Date(entry.lastVerified);
  const daysSinceVerified = Math.ceil((today.getTime() - lastVerified.getTime()) / 86400000);

  switch (entry.volatility) {
    case "quarterly": return daysSinceVerified > 90;
    case "annual": return daysSinceVerified > 180;
    case "event_driven": return daysSinceVerified > 60;
    default: return daysSinceVerified > 365;
  }
}

/**
 * 获取知识过期警告文案
 */
export function getStalenessWarning(entry: KnowledgeEntry): string | null {
  if (entry.volatility === "evergreen") return null;

  const daysSinceVerified = Math.ceil(
    (new Date().getTime() - new Date(entry.lastVerified).getTime()) / 86400000
  );

  if (isExpired(entry)) {
    return "⚠️ 已过期 · 上次验证：" + entry.lastVerified;
  }

  if (daysSinceVerified > 180) {
    return "⚠️ 超过半年未验证 · 上次验证：" + entry.lastVerified;
  }

  if (daysSinceVerified > 90) {
    return "⚠️ 超过3个月未验证 · 上次验证：" + entry.lastVerified;
  }

  const daysUntilExpiry = Math.ceil(
    (new Date(entry.validUntil).getTime() - new Date().getTime()) / 86400000
  );

  if (daysUntilExpiry <= 30) {
    return "⏰ " + daysUntilExpiry + "天后过期";
  }

  return null;
}

/**
 * 构建 LLM 交叉验证的 prompt
 */
export function buildLLMCrossCheckPrompt(entry: KnowledgeEntry): string {
  const today = new Date().toISOString().split("T")[0];

  return "你是一个知识库维护助手。当前日期是 " + today + "。\n\n" +
    "请检查以下知识条目的时效性：\n\n" +
    "知识标题：" + entry.title + "\n" +
    "知识内容：" + entry.content + "\n" +
    "记录来源：" + entry.source + "\n" +
    "生效日期：" + entry.validFrom + "\n" +
    "预计过期：" + entry.validUntil + "\n" +
    "最后验证：" + entry.lastVerified + "\n" +
    "置信度：" + Math.round(entry.confidence * 100) + "%\n\n" +
    "请回答：\n" +
    "1. 这条知识在今天是否仍然准确？\n" +
    "2. 如果已有变化，最新数据是什么？\n" +
    "3. 你的判断置信度（0-100%）\n" +
    "4. 建议的新的有效截止日期\n\n" +
    "如果你不确定，请诚实地说\"不确定\"。\n\n" +
    "请用JSON格式回复：\n" +
    '{"isStillValid": true/false, "updatedContent": "如果有变化提供最新内容", "confidence": 0-100, "suggestedValidUntil": "YYYY-MM-DD"}';
}
