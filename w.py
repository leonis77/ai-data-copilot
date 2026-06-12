import os
p = r"C:\Users\22123\Documents\Codex\2026-06-11\ai-data-copilot-full-prompt-spec\ai-data-copilot\src\lib\parser.ts"
c = open(p, "r", encoding="utf-8").read()

old_start = c.find("function fixEncoding")
old_end = c.find("export function computeStats")
old = c[old_start:old_end]

new = """function fixEncoding(val: unknown): unknown {
  if (typeof val !== "string") return val;
  if (!val) return val;
  // If already contains valid CJK, return as-is
  if (/[\u4e00-\u9fff]/.test(val)) return val;
  // Multi-pass Latin1 -> UTF8 decode until we get CJK or no change
  try {
    var fixed: string = val;
    for (var i = 0; i < 4; i++) {
      var bytes = Buffer.from(fixed, "latin1");
      var decoded = bytes.toString("utf8");
      if (/[\u4e00-\u9fff]/.test(decoded)) return decoded;
      if (decoded === fixed) break;
      fixed = decoded;
    }
  } catch (e) {}
  return val;
}

"""

c = c.replace(old, new)
open(p, "w", encoding="utf-8").write(c)
print("fixEncoding rewritten, has CJK regex:", "/[\u4e00-\u9fff]/" in c)