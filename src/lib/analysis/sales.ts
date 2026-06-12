export function aggregateByDate(rows: any[], dateField: string, amountField: string): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  for (const row of rows) {
    const date = String(row[dateField] || "").substring(0, 10);
    const amt = Number(row[amountField]) || 0;
    map[date] = (map[date] || 0) + amt;
  }
  return Object.entries(map).sort(function(a, b) { return a[0].localeCompare(b[0]); }).map(function(e) {
    return { name: e[0], value: Math.round(e[1]) };
  });
}

export function aggregateByWeek(rows: any[], dateField: string, amountField: string): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  for (const row of rows) {
    const d = new Date(row[dateField]);
    if (isNaN(d.getTime())) continue;
    const week = "W" + Math.ceil(d.getDate() / 7);
    const key = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + week;
    map[key] = (map[key] || 0) + (Number(row[amountField]) || 0);
  }
  return Object.entries(map).sort(function(a, b) { return a[0].localeCompare(b[0]); }).map(function(e) {
    return { name: e[0], value: Math.round(e[1]) };
  });
}

export function computeSalesSummary(rows: any[], amountField: string) {
  const amts = rows.map(function(r) { return Number(r[amountField]) || 0; });
  const total = amts.reduce(function(a, b) { return a + b; }, 0);
  const avg = rows.length > 0 ? total / rows.length : 0;
  const max = amts.length > 0 ? Math.max.apply(null, amts) : 0;
  const min = amts.length > 0 ? Math.min.apply(null, amts) : 0;
  return { total, avg, max, min, count: rows.length };
}
