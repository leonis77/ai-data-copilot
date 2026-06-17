/**
 * RAG 分词匹配引擎 — 替代旧版纯子串匹配
 *
 * 中文：bigram 分词 + Jaccard 相似度
 * 英文：按空格/标点分词
 */

/**
 * 对查询文本进行分词
 */
export function tokenize(text: string): string[] {
  var tokens: string[] = [];
  var cleaned = text.toLowerCase().trim();

  // 英文/数字分词（按空格和标点分割）
  var parts = cleaned.split(/[\s,，、。/；;：:()（）\[\]【】\-—?!！？]+/);

  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    if (!part) continue;

    // 英文词直接保留
    if (/^[a-z0-9]+$/.test(part)) {
      if (part.length >= 2) tokens.push(part);
      continue;
    }

    // 中文 bigram
    for (var j = 0; j < part.length - 1; j++) {
      tokens.push(part.substring(j, j + 2));
    }

    // 也保留完整的中文词（如果 > 2 字）
    if (part.length >= 2) tokens.push(part);
  }

  return tokens;
}

/**
 * 计算 Jaccard 相似度
 */
export function jaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  var setA = new Set(tokensA);
  var setB = new Set(tokensB);

  var intersection = 0;
  setA.forEach(function (t) { if (setB.has(t)) intersection++; });

  var union = new Set([...setA, ...setB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * 从知识条目数组中检索匹配项
 *
 * @param query - 用户查询
 * @param entries - 知识条目数组（每项有 keywords 和 content）
 * @param maxResults - 最大返回数
 * @param threshold - 相似度阈值
 */
export function searchByTokens(
  query: string,
  entries: { keywords: string[]; content: string; category?: string; topic?: string; source?: string; confidence?: number }[],
  maxResults?: number,
  threshold?: number
): { content: string; score: number; source?: string }[] {
  var maxR = maxResults !== undefined ? maxResults : 3;
  var thresh = threshold !== undefined ? threshold : 0.1;
  var queryTokens = tokenize(query);

  if (queryTokens.length === 0) return [];

  var scored = entries.map(function (entry) {
    var entryTokens: string[] = [];
    for (var i = 0; i < entry.keywords.length; i++) {
      var kwTokens = tokenize(entry.keywords[i]);
      for (var j = 0; j < kwTokens.length; j++) {
        entryTokens.push(kwTokens[j]);
      }
    }

    // Boost: 如果 topic 也匹配
    if (entry.topic) {
      var topicTokens = tokenize(entry.topic);
      for (var k = 0; k < topicTokens.length; k++) {
        entryTokens.push(topicTokens[k]);
      }
    }

    var score = jaccardSimilarity(queryTokens, entryTokens);

    // 关键词直接子串命中加分
    for (var ki = 0; ki < entry.keywords.length; ki++) {
      if (query.toLowerCase().indexOf(entry.keywords[ki].toLowerCase()) !== -1) {
        score += 0.15;
      }
    }

    return { entry: entry, score: Math.min(score, 1.0) };
  });

  return scored
    .filter(function (s) { return s.score >= thresh; })
    .sort(function (a, b) { return b.score - a.score; })
    .slice(0, maxR)
    .map(function (s) {
      return {
        content: s.entry.content,
        score: Math.round(s.score * 100) / 100,
        source: s.entry.source,
      };
    });
}
