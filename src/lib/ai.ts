import OpenAI from "openai";

const API_KEY = process.env.DEEPSEEK_API_KEY || "";
const BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: API_KEY,
      baseURL: BASE_URL + "/v1",
    });
  }
  return client;
}

export interface AnalysisResult {
  summary: string;
  insights: string[];
  risks: string[];
  suggestions: string[];
}

export async function analyzeData(
  dataSummary: string,
  userQuestion?: string
): Promise<AnalysisResult> {
  const prompt = `你是一个专业的数据分析师。请根据以下数据摘要进行分析。

数据摘要：
${dataSummary}

${userQuestion ? `用户问题：${userQuestion}` : "请提供全面的数据分析。"}

请用中文回答，按以下JSON格式输出（确保是有效的JSON）：
{
  "summary": "数据整体概述（一段话）",
  "insights": ["洞察1", "洞察2", "洞察3"],
  "risks": ["风险1", "风险2"],
  "suggestions": ["建议1", "建议2", "建议3"]
}`;

  try {
    const openai = getClient();
    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "你是一个专业的数据分析师，擅长从数据中发现洞察和问题。请始终用中文回答，输出有效的JSON格式。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const text = response.choices[0]?.message?.content || "";
    return parseAIResponse(text);
  } catch (error) {
    console.error("AI analysis error:", error);
    throw new Error("AI分析服务暂时不可用，请稍后重试");
  }
}

export async function chatWithData(
  dataContext: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const systemPrompt = `你是一个AI数据分析助手。你可以访问以下数据集信息来回答用户问题：

${dataContext}

请基于数据回答问题。如果问题超出数据范围，请如实说明。用中文回答，支持Markdown格式。`;

  try {
    const openai = getClient();
    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return response.choices[0]?.message?.content || "抱歉，无法生成回复。";
  } catch (error) {
    console.error("AI chat error:", error);
    throw new Error("AI服务暂时不可用，请稍后重试");
  }
}

function parseAIResponse(text: string): AnalysisResult {
  try {
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      summary: parsed.summary || "分析完成",
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch {
    const lines = text.split("\n").filter(Boolean);
    return {
      summary: lines[0] || "分析完成",
      insights: lines.slice(1, 4),
      risks: lines.slice(4, 6),
      suggestions: lines.slice(6, 9),
    };
  }
}
