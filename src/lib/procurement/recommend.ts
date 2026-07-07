import { getClient, withRetry } from "@/lib/agent/llm";
import { logger } from "@/lib/logger";
import type { TaggedProduct } from "./signals";

export interface PurchaseRecommendation {
  topPicks: { name: string; price: number; reason: string; suggestedRetail: number }[];
  watchList: { name: string; price: number; concern: string }[];
  skipList: { name: string; price: number; reason: string }[];
  summary: string;
}

function estimateRetail(supplyPrice: number, category: string): number {
  const hasFresh = /\u6c34\u679c|\u852c\u83dc|\u751f\u9c9c|fresh/i.test(category);
  const rate = hasFresh ? 0.6 : 0.45;
  return Math.round(supplyPrice * (1 + rate));
}

function buildPrompt(products: TaggedProduct[], categoryName: string): string {
  const hot = products.filter(p => p.signals.includes("hot")).slice(0, 8);
  const value = products.filter(p => p.signals.includes("value")).slice(0, 5);
  const tails = products.filter(p => p.signals.includes("caution") || p.signals.includes("tail")).slice(0, 5);

  let prompt = "You are a supply chain analyst. Based on the following supplier price list, recommend which products to stock.\n\n";
  prompt += "Category: " + categoryName + "\n\n";
  prompt += "=== Recommended Products ===\n";
  hot.forEach(p => { prompt += "- " + p.name + " (supply: \u00A5" + p.price + ", tag: " + p.reason + ")\n"; });
  prompt += "\n=== Value Products ===\n";
  value.forEach(p => { prompt += "- " + p.name + " (supply: \u00A5" + p.price + ")\n"; });
  if (tails.length > 0) {
    prompt += "\n=== Caution Products ===\n";
    tails.forEach(p => { prompt += "- " + p.name + " (supply: \u00A5" + p.price + ", issue: " + p.reason + ")\n"; });
  }
  prompt += "\nOutput JSON: {\"topPicks\":[{\"name\":\"\",\"reason\":\"\"}],\"watchList\":[{\"name\":\"\",\"concern\":\"\"}],\"skipList\":[{\"name\":\"\",\"reason\":\"\"}],\"summary\":\"one sentence\"}";
  return prompt;
}

export async function generatePurchaseList(
  products: TaggedProduct[],
  categoryName: string,
  avgPrice: number
): Promise<PurchaseRecommendation> {
  const fallback: PurchaseRecommendation = {
    topPicks: products.filter(p => p.signals.includes("hot")).slice(0, 3).map(p => ({
      name: p.name, price: p.price, reason: p.reason, suggestedRetail: estimateRetail(p.price, p.category)
    })),
    watchList: products.filter(p => p.signals.includes("caution")).slice(0, 2).map(p => ({
      name: p.name, price: p.price, concern: p.reason
    })),
    skipList: products.filter(p => p.signals.includes("tail") && !p.signals.includes("hot")).slice(0, 2).map(p => ({
      name: p.name, price: p.price, reason: p.reason
    })),
    summary: categoryName + " " + products.length + " items analyzed, avg price \u00A5" + avgPrice.toFixed(0),
  };

  if (products.length < 3 || !process.env.DEEPSEEK_API_KEY) return fallback;

  try {
    const client = getClient();
    const res = await withRetry(function() {
      return client.chat.completions.create({
        model: "deepseek-v4-flash",
        messages: [
          { role: "system", content: "You are a supply chain analyst. Output only JSON." },
          { role: "user", content: buildPrompt(products, categoryName) },
        ],
        temperature: 0.1, max_tokens: 800,
      });
    }, 2, "recommend");

    const text = res.choices[0]?.message?.content || "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const aiResult = JSON.parse(cleaned);

    return {
      topPicks: (aiResult.topPicks || fallback.topPicks).map((p: any) => ({
        ...p, suggestedRetail: estimateRetail(p.price || 0, categoryName)
      })),
      watchList: aiResult.watchList || fallback.watchList,
      skipList: aiResult.skipList || fallback.skipList,
      summary: aiResult.summary || fallback.summary,
    };
  } catch (e) {
    logger.warn("AI recommendation failed, using rule fallback", { message: e instanceof Error ? e.message : String(e) });
    return fallback;
  }
}
