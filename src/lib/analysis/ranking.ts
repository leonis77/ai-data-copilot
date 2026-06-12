export function rankByField(rows: any[], groupField: string, valueField: string, limit: number = 10): { name: string; value: number; count: number }[] {
  const map: Record<string, { value: number; count: number }> = {};
  for (const row of rows) {
    const key = String(row[groupField] || "未知");
    const val = Number(row[valueField]) || 0;
    if (!map[key]) map[key] = { value: 0, count: 0 };
    map[key].value += val;
    map[key].count += 1;
  }
  return Object.entries(map)
    .sort(function(a, b) { return b[1].value - a[1].value; })
    .slice(0, limit)
    .map(function(e) { return { name: e[0], value: Math.round(e[1].value), count: e[1].count }; });
}
