import { searchKnowledge } from "./knowledge";

export function injectKnowledge(input: string, dataContext: string): string {
  const results = searchKnowledge(input, 3);
  if (results.length === 0) {
    return "你是电商数据分析专家。基于以下数据回答，给出具体可行的建议。\n\n数据:\n" + dataContext;
  }
  return "你是电商数据分析专家。\n\n参考行业知识:\n" + results.join("\n") + "\n\n基于以下数据进行回答，结合行业知识给出具体建议:\n" + dataContext;
}
