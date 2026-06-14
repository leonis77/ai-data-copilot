export interface PriceAnalysis {
  skuCount: number;
  min: number; max: number;
  mean: number; median: number;
  p25: number; p75: number;
  mainRange: string;
}

export function analyzePrice(rows: Record<string, unknown>[], priceCol: string): PriceAnalysis | null {
  const values: number[] = [];
  for (const row of rows) {
    const v = Number(row[priceCol]);
    if (!isNaN(v) && v > 0) values.push(v);
  }
  if (values.length < 3) return null;
  values.sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const len = values.length;
  return {
    skuCount: len,
    min: values[0],
    max: values[len - 1],
    mean: Math.round(sum / len * 100) / 100,
    median: values[Math.floor(len * 0.5)],
    p25: values[Math.floor(len * 0.25)],
    p75: values[Math.floor(len * 0.75)],
    mainRange: "\u00A5" + values[Math.floor(len * 0.25)] + " - \u00A5" + values[Math.floor(len * 0.75)],
  };
}
