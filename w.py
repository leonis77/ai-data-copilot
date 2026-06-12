import os
base = r"C:\Users\22123\Documents\Codex\2026-06-11\ai-data-copilot-full-prompt-spec\ai-data-copilot"

# Fix upload route with inline double-decode
p = os.path.join(base, "src", "app", "api", "upload", "route.ts")
c = open(p, "r", encoding="utf-8").read()

old = "return NextResponse.json({ id, columns: parsed.columns, rows: parsed.rows, rowCount: parsed.rowCount, summary: parsed.summary });"

new = """var fr = parsed.rows.map(function(r) { var o = {}; for (var k in r) { var v = r[k]; o[k] = typeof v === "string" ? Buffer.from(Buffer.from(v, "latin1").toString("utf8"), "latin1").toString("utf8") : v; } return o; });
    return NextResponse.json({ id, columns: parsed.columns, rows: fr, rowCount: parsed.rowCount, summary: parsed.summary });"""

c = c.replace(old, new)
open(p, "w", encoding="utf-8").write(c)
print("upload route fixed", len(c))