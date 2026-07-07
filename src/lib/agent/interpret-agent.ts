/**
 * ProcureWise Interpret Agent v2.0
 *
 * 角色：电商数据深度解读专家
 * 核心能力：趋势发现 + 异常检测 + 机会识别 + 跨维度关联
 */

import { AgentContext, AgentResponse } from "./types";
import { logger } from "@/lib/logger";
import { getClient, withRetry } from "./llm";

const SYSTEM_PROMPT = `你是ProcureWise的电商数据深度解读专家。

## 核心能力
发现业务模式、异常和机会——不是描述数据，是用数据讲故事。

## 分析框架（五步法）
1. 趋势分析：判断核心指标的走势方向（上升/下降/平稳），标注转折点
2. 结构分析：贡献度拆解（哪个平台/品类/SKU贡献了最多的变化？）
3. 异常检测：区分统计异常（Z-score）和业务异常（趋势断裂/关联背离/结构突变）
4. 关联发现：发现跨维度的关联关系（如"抖音退货率上升"与"达人D级占比增加"的关联）
5. 机会识别：从数据中提炼可操作的商业机会

## ⚠️ 准确性约束

### 数值锚定
每个数字必须标注来源。找不到来源 → 不要写。

### 异常判断标准
· Z-score > 3 或 IQR之外的值为统计异常——可能为真实大单或数据错误，标注而非删除
· 趋势方向突然改变为业务异常——需定位事件（促销/差评/断货/竞品变动）
· 两个通常同向指标背离为关联异常——如"销量↑但利润↓"说明可能在降价促销
· 某维度占比突变>10个百分点为结构异常

### 不确定协议
· 数据<30天 → "趋势判断需要更多数据，当前仅能给出初步观察"
· 异常原因不确定 → "可能原因：A/B/C，需进一步确认"
· 缺少对比基线 → "建议上传历史数据以进行同环比分析"

## 输出格式
请按JSON格式输出：
{
  "story": "用数据讲一个30-50字的商业故事",
  "highlights": [{"metric": "指标名", "value": "数值", "insight": "洞察"}],
  "anomalies": [{"severity": "high|medium|low", "finding": "异常发现"}],
  "opportunities": ["商业机会1", "商业机会2"],
  "followUp": ["追问1", "追问2"]
}

请始终用中文回答。`;

export async function interpretAgent(input: string, ctx: AgentContext): Promise<AgentResponse> {
  var client = getClient();
  var sp = SYSTEM_PROMPT + "\n\n## 当前数据上下文\n" + ctx.dataSummary;
  var res = await withRetry(function() { return client.chat.completions.create({
    model: "deepseek-v4-pro",
    messages: [{ role: "system", content: sp }, { role: "user", content: "深度解读以下数据：" + input }],
    temperature: 0.4, max_tokens: 4000,
  }); }, 2, "interpret-agent");
  var text = res.choices[0]?.message?.content || "";
  try {
    var cleaned = text.replace(/```json|```/g, "").trim();
    var p = JSON.parse(cleaned);
    var hl = (p.highlights || []).map(function(h: any) { return "- **" + h.metric + "**: " + h.value + " — " + h.insight; }).join("\n");
    var an = (p.anomalies || []).map(function(a: any) { return "- [" + (a.severity === "high" ? "🔴" : a.severity === "medium" ? "🟡" : "🟢") + " " + a.severity + "] " + a.finding; }).join("\n");
    var op = (p.opportunities || []).map(function(o: any) { return "- 💡 " + o; }).join("\n");
    return { type: "interpret", content: "> " + (p.story || "数据分析完成") + "\n\n**关键发现**\n" + hl + "\n\n**异常预警**\n" + an + "\n\n**商业机会**\n" + op, followUp: p.followUp || [] };
  } catch(e) { logger.warn("interpret-agent parse failed, using raw text", { message: e instanceof Error ? e.message : String(e) });
    return { type: "interpret", content: text, followUp: ["哪个指标最关键？", "有哪些经营风险？", "如何改善利润？"] };
  }
}
