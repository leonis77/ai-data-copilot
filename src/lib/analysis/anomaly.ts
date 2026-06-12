export interface AnomalyResult { rowIndex: number; value: number; zScore: number; row: Record<string, unknown> }

export function detectOutliers(rows: any[], field: string, threshold: number = 2.5): AnomalyResult[] {
  const values = rows.map(function(r) { return Number(r[field]) || 0; });
  const n = values.length;
  if (n < 4) return [];
  const mean = values.reduce(function(a, b) { return a + b; }, 0) / n;
  const std = Math.sqrt(values.reduce(function(a, b) { return a + Math.pow(b - mean, 2); }, 0) / n);
  if (std === 0) return [];
  const results: AnomalyResult[] = [];
  for (let i = 0; i < n; i++) {
    const z = Math.abs((values[i] - mean) / std);
    if (z > threshold) {
      results.push({ rowIndex: i, value: values[i], zScore: Math.round(z * 100) / 100, row: rows[i] });
    }
  }
  return results;
}
