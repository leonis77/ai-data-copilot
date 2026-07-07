/**
 * 知识注入引擎 v3.0 — AI主体架构
 *
 * 核心架构反转（v2→v3）：
 *   ❌ v2: 静态知识库为主体 → DeepSeek作为fallback
 *   ✅ v3: DeepSeek V4 为主知识引擎 → 静态KB为可信缓存 → WebSearch为实时验证
 *
 * 三个知识来源的角色：
 *   1. DeepSeek V4 — 主知识引擎（始终启用，训练数据涵盖千行百业）
 *   2. 静态知识库 — 可信缓存（平台费率、方法论、验证过的基准）
 *   3. WebSearch — 实时验证层（平台最新规则、官方数据拉取）
 *
 * 关键指令（注入DeepSeek的System Prompt）：
 *   "你本身就是覆盖千行百业的电商分析引擎。不要在'行业不在知识库中'时降低分析质量。"
 */

import { searchKnowledge, KnowledgeEntry } from "./knowledge";
import { batchFreshnessCheck, FreshnessResult } from "./freshness";
import { detectIndustry, shouldWebSearch, assessKnowledgeCoverage } from "./industry-detector";
import { searchPlatformOfficial, formatSearchResultsForPrompt } from "@/lib/search/platform-search";
import { getAllPlatformFeeSummary } from "@/lib/profit/engine";

export interface InjectionResult {
  /** 注入到 System Prompt 的知识段落 */
  knowledgeBlock: string;
  /** 注入的知识条目列表 */
  injectedEntries: KnowledgeEntry[];
  /** 被拒绝的知识条目（过期/低置信度） */
  rejectedEntries: Array<{ entry: KnowledgeEntry; result: FreshnessResult }>;
  /** 带警告注入的知识条目 */
  warnedEntries: Array<{ entry: KnowledgeEntry; result: FreshnessResult }>;
  /** 注入统计 */
  stats: {
    totalFound: number;
    injected: number;
    rejected: number;
    warned: number;
    freshnessScore: number;
    /** 🆕 v3: 行业检测信息 */
    industry?: string;
    industryConfidence?: number;
    /** 🆕 v3: WebSearch触发状态 */
    webSearchTriggered?: boolean;
    webSearchResults?: number;
  };
}

/**
 * v3主函数：AI为主体的知识注入（async版本）
 *
 * @param input 用户输入的原始问题
 * @param dataContext 数据上下文（列名、统计摘要等）
 * @param options.columns 数据列名（用于行业检测）
 * @param options.sampleRows 样本数据行（用于行业检测）
 * @param options.platformHint 可选的平台提示
 * @returns 注入结果
 */
export async function injectKnowledgeV3(
  input: string,
  dataContext: string,
  options: {
    columns?: string[];
    sampleRows?: any[];
    platformHint?: string;
  } = {},
): Promise<InjectionResult> {
  const { columns = [], sampleRows = [], platformHint } = options;

  // ═══ Step 1: 行业检测 ═══
  const industry = detectIndustry(columns, sampleRows);

  // ═══ Step 2: 三路并行获取知识 ═══
  const [kbCandidates, webResults] = await Promise.all([
    // 路①：静态知识库 — 查平台规则+方法论（可信缓存）
    Promise.resolve(searchKnowledge(input, 8)),
    // 路②：WebSearch — 智能触发，查平台最新官方数据（实时验证）
    shouldWebSearch(industry, 0)
      ? searchPlatformOfficial(industry, platformHint)
      : Promise.resolve(null),
  ]);

  // 如果指定了平台，追加平台特定知识
  if (platformHint) {
    const platformEntries = searchKnowledge(platformHint, 3).filter(
      (e) => !kbCandidates.find((c) => c.id === e.id),
    );
    kbCandidates.push(...platformEntries.slice(0, 2));
  }

  // ═══ Step 3: 批量新鲜度检查 ═══
  const { injectable, withWarning, rejected } = batchFreshnessCheck(kbCandidates);

  // ═══ Step 4: 知识覆盖度评估 ═══
  const coverage = assessKnowledgeCoverage(industry, injectable.length + withWarning.length);

  // ═══ Step 5: 构建 AI主体的 System Prompt ═══
  // 核心变化：不是在prompt里"注入知识"，而是告诉DeepSeek：
  //   "你是电商利润分析专家。以下是参考卡片，你综合自己的知识+参考卡片+用户数据给出分析。"

  let knowledgeBlock = "";

  // 5a. DeepSeek角色指令（核心——告诉AI它才是主体）
  knowledgeBlock += `## 🤖 你的角色：电商利润分析主引擎

你（DeepSeek V4）本身就是覆盖千行百业的电商利润分析专家。你的训练数据涵盖了工业品、消费品、
农产品、医疗器械、汽车配件等数千个行业。不要在"知识库没有某个行业"时降低分析质量——
你本身就懂这个行业，而且很可能比一个50条条目的静态知识库懂得更多。

下面的"参考卡片"和"实时平台数据"只是辅助信息——它们提供需要精确数字的最新平台费率、
刚生效的官方规则等你可能不清楚时效性细节的数据。对于行业通用知识（利润结构、定价逻辑、
供应链规则），依靠你自己的训练数据。

${coverage.message}

`;

  // 5b. 平台费率引擎（自动注入，始终启用）
  knowledgeBlock += `## 📋 2026年四大平台费率参考（实时引擎）

以下费率数据来自各平台2026年官方公告。在计算利润时，使用这些精确数字：

${getAllPlatformFeeSummary()}

`;

  // 5c. 静态知识库 — 作为"参考卡片"（而非"知识主体"）
  if (injectable.length > 0) {
    knowledgeBlock += "## 📚 参考卡片：已验证的平台规则与方法论\n\n";
    knowledgeBlock += "> 以下是经过新鲜度检查的知识条目。将其作为参考，结合你的训练知识使用。\n\n";
    for (const { entry, result } of injectable) {
      knowledgeBlock += formatKnowledgeEntry(entry, result.injectionLabel || "");
    }
  }

  if (withWarning.length > 0) {
    knowledgeBlock += "\n## ⚠️ 参考卡片：待验证时效性\n\n";
    knowledgeBlock += "> 以下知识可能已临近过期，使用前请注意标注不确定性。\n\n";
    for (const { entry, result } of withWarning) {
      knowledgeBlock += formatKnowledgeEntry(entry, result.injectionLabel || result.status);
    }
  }

  // 5d. WebSearch实时结果
  if (webResults && webResults.rawResults.length > 0) {
    knowledgeBlock += formatSearchResultsForPrompt(webResults);
  }

  // 5e. 数据上下文 + AI指令
  knowledgeBlock += `

## 📊 用户数据上下文

${dataContext}

## 🎯 分析指令

基于以上所有信息（你的训练知识 + 参考卡片 + 实时平台数据 + 用户真实数据），给出专业的电商利润分析：

1. **不要因为"知识库中没有该行业"而降低分析质量**——你的训练数据很可能已经覆盖了该行业
2. 对于平台费率/规则等精确数字，使用参考卡片中的最新数据
3. 对于行业通用知识（利润结构、定价逻辑、供应链规则），依靠你自己的训练数据
4. 每个数值结论须注明来源（数据列名/行范围/AI训练知识/平台官方数据）
5. 不确定的结论标注置信度
6. 数据不足时输出 UNCERTAIN，不要猜测`;

  // ═══ Step 6: 计算统计 ═══
  const totalFound = kbCandidates.length;
  const freshnessScore = totalFound > 0
    ? Math.round((injectable.length * 100 + withWarning.length * 50) / totalFound)
    : 100;

  return {
    knowledgeBlock,
    injectedEntries: injectable.map((i) => i.entry).concat(withWarning.map((w) => w.entry)),
    rejectedEntries: rejected,
    warnedEntries: withWarning,
    stats: {
      totalFound,
      injected: injectable.length,
      rejected: rejected.length,
      warned: withWarning.length,
      freshnessScore,
      industry: industry.name,
      industryConfidence: industry.confidence,
      webSearchTriggered: webResults !== null && webResults.rawResults.length > 0,
      webSearchResults: webResults?.rawResults.length || 0,
    },
  };
}

/**
 * v2兼容版本：同步注入（向后兼容现有调用方）
 *
 * 用于不需要行业检测和WebSearch的简单场景
 */
export function injectKnowledge(
  input: string,
  dataContext: string,
  platformHint?: string,
): InjectionResult {
  const candidates = searchKnowledge(input, 8);

  if (platformHint) {
    const platformEntries = searchKnowledge(platformHint, 3).filter(
      (e) => !candidates.find((c) => c.id === e.id),
    );
    candidates.push(...platformEntries.slice(0, 2));
  }

  const { injectable, withWarning, rejected } = batchFreshnessCheck(candidates);

  let knowledgeBlock = "";

  // v2格式：仍然使用"参考知识"标签
  if (injectable.length > 0) {
    knowledgeBlock += "## 📚 电商领域参考知识（已验证）\n\n";
    for (const { entry, result } of injectable) {
      knowledgeBlock += formatKnowledgeEntry(entry, result.injectionLabel || "");
    }
  }

  if (withWarning.length > 0) {
    knowledgeBlock += "\n## ⚠️ 参考知识（待验证时效性）\n\n";
    knowledgeBlock += "> 以下知识可能已临近过期或需要重新验证，请在使用时标注不确定性。\n\n";
    for (const { entry, result } of withWarning) {
      knowledgeBlock += formatKnowledgeEntry(entry, result.injectionLabel || result.status);
    }
  }

  if (injectable.length === 0 && withWarning.length === 0) {
    knowledgeBlock = "（当前知识库中未找到与该问题直接相关的领域知识。分析将完全基于用户提供的数据。）\n\n";
  }

  const fullContext = `${knowledgeBlock}

## 📊 数据上下文

${dataContext}

请基于以上数据和知识进行分析。核心原则：
1. 每个数值结论须注明数据来源（列名+行范围）
2. 引用了知识库内容时，标注是"已验证知识"还是"待验证知识"
3. 不确定的结论标注置信度（0-100%）
4. 数据不足时输出 UNCERTAIN，不要猜测`;

  const totalFound = candidates.length;
  const freshnessScore = totalFound > 0
    ? Math.round((injectable.length * 100 + withWarning.length * 50) / totalFound)
    : 100;

  return {
    knowledgeBlock: fullContext,
    injectedEntries: injectable.map((i) => i.entry).concat(withWarning.map((w) => w.entry)),
    rejectedEntries: rejected,
    warnedEntries: withWarning,
    stats: {
      totalFound,
      injected: injectable.length,
      rejected: rejected.length,
      warned: withWarning.length,
      freshnessScore,
    },
  };
}

/**
 * 轻量版：仅返回知识条目，不做新鲜度检查（向后兼容）
 */
export function injectKnowledgeSimple(input: string, dataContext: string): string {
  const result = injectKnowledge(input, dataContext);
  return result.knowledgeBlock;
}

/**
 * 格式化单条知识为注入段落
 */
function formatKnowledgeEntry(entry: KnowledgeEntry, label: string): string {
  const parts: string[] = [];

  const labelStr = label ? `[${label}] ` : "";
  parts.push(`### ${labelStr}${entry.title}`);
  parts.push("");
  parts.push(entry.content);
  parts.push("");

  const sourceParts: string[] = [];
  sourceParts.push(`来源：${entry.source}`);
  if (entry.sourceUrl) {
    sourceParts.push(`参考链接：${entry.sourceUrl}`);
  }
  sourceParts.push(`置信度：${Math.round(entry.confidence * 100)}% · 有效期至：${entry.validUntil}`);
  parts.push(`> ${sourceParts.join(" · ")}`);

  if (entry.aiUsageHint) {
    parts.push(`> 💡 ${entry.aiUsageHint}`);
  }

  parts.push("");
  return parts.join("\n");
}
