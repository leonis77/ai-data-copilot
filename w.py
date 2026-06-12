import os
base = r"C:\Users\22123\Documents\Codex\2026-06-11\ai-data-copilot-full-prompt-spec\ai-data-copilot"
p = os.path.join(base, "src", "app", "api", "upload", "route.ts")
c = open(p, "r", encoding="utf-8").read()

old = """var fr = parsed.rows.map(function(r) { var o = {}; for (var k in r) { var v = r[k]; o[k] = typeof v === "string" ? Buffer.from(Buffer.from(v, "latin1").toString("utf8"), "latin1").toString("utf8") : v; } return o; });
    return NextResponse.json({ id, columns: parsed.columns, rows: fr, rowCount: parsed.rowCount, summary: parsed.summary });"""

new = """var fr = parsed.rows.map(function(row: Record<string, unknown>): Record<string, unknown> {
      var o: Record<string, unknown> = {};
      for (var k in row) { var v: unknown = row[k]; o[k] = v; }
      return o;
    });
    return NextResponse.json({ id, columns: parsed.columns, rows: fr, rowCount: parsed.rowCount, summary: parsed.summary });"""

c = c.replace(old, new)
open(p, "w", encoding="utf-8").write(c)
print("simplified upload route")