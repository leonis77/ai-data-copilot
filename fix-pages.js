const fs = require("fs");
const b = "src/app";

// Helper: replace function by name in a TSX file
function replaceFunc(content, funcName, newBody) {
  // Match from "const funcName = async () => {" or "const funcName = () => {" 
  // through to the matching closing brace followed by optional semicolon and newlines
  const pattern = new RegExp(
    "(const " + funcName + "\\s*=\\s*(?:async\\s+)?\\([^)]*\\)\\s*=>\\s*\\{)[\\s\\S]*?\\n(  \\};?\\s*\\n)",
    "g"
  );
  const match = pattern.exec(content);
  if (!match) {
    console.log("  WARNING: function", funcName, "not found!");
    return content;
  }
  return content.replace(match[0], newBody);
}

// ===== DASHBOARD =====
let d = fs.readFileSync(b + "/dashboard/page.tsx", "utf8");

// Add imports (only if not present)
if (!d.includes('import { getApiBase }')) {
  d = d.replace(
    'import { CardSkeleton, ChartSkeleton, AnalysisSkeleton } from "@/components/ui/skeleton";',
    'import { getApiBase } from "@/lib/api";\nimport { CardSkeleton, ChartSkeleton, AnalysisSkeleton } from "@/components/ui/skeleton";'
  );
}
if (!d.includes('buildSummary')) {
  d = d.replace('import { computeStats } from', 'import { computeStats, buildSummary } from');
}

// Replace loadData
d = replaceFunc(d, "loadData",
`const loadData = () => {
    try {
      const stored = localStorage.getItem("currentDataset");
      if (!stored) { setLoading(false); return; }
      const data = JSON.parse(stored);
      if (!data || !data.columns) { setLoading(false); return; }
      const parsed = computeStats(data.rows || [], data.columns);
      setDatasetData(data);
      setStats(parsed);
      setHasData(true);
      setDatasetName(data.fileName || "");
      setLoading(false);
    } catch { setLoading(false); }
  };
`);

// Replace runAnalysis
d = replaceFunc(d, "runAnalysis",
`const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const apiBase = getApiBase();
      const stored = localStorage.getItem("currentDataset");
      if (!stored) { setAnalyzing(false); return; }
      const dataset = JSON.parse(stored);
      const summary = buildSummary(dataset.columns, dataset.rows || []);
      const res = await fetch(apiBase + "/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSummary: summary, question: "" }),
      });
      if (res.ok) { const ad = await res.json(); setAnalysis(ad); }
    } catch {} finally { setAnalyzing(false); }
  };
`);

fs.writeFileSync(b + "/dashboard/page.tsx", d);
console.log("dashboard:", d.length, "bytes");

// ===== CHAT =====
let c = fs.readFileSync(b + "/chat/page.tsx", "utf8");

if (!c.includes('import { getApiBase }')) {
  c = c.replace(
    'import { ChatPanel } from "@/components/ai/chat-panel";',
    'import { getApiBase } from "@/lib/api";\nimport { ChatPanel } from "@/components/ai/chat-panel";'
  );
}

c = replaceFunc(c, "checkData",
`const checkData = () => {
    try {
      const stored = localStorage.getItem("currentDataset");
      if (stored) {
        const data = JSON.parse(stored);
        if (data && data.columns) {
          setHasData(true);
          if (!loadedRef.current) {
            loadedRef.current = true;
            const dsName = data.fileName || "??";
            setMessages([{ role: "assistant", content: "????????? **" + dsName + "**?" + data.rowCount + " ? x " + data.columns.length + " ???\\n\\n??????????????" }]);
          }
        }
      }
    } catch {} finally { setChecking(false); }
  };
`);

c = replaceFunc(c, "handleSend",
`const handleSend = async (content: string) => {
    const userMsg: ChatMessage = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const apiBase = getApiBase();
      const stored = localStorage.getItem("currentDataset");
      let dataContext = "";
      if (stored) {
        const dataset = JSON.parse(stored);
        dataContext = "???: " + (dataset.fileName || "??") + "\\n? " + dataset.rowCount + " ?, " + dataset.columns.length + " ??\\n??: " + dataset.columns.join(", ") + "\\n";
        if (dataset.summary) dataContext += "??: " + dataset.summary;
      }
      const res = await fetch(apiBase + "/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataContext, messages: [...messages, userMsg] }),
      });
      if (!res.ok) throw new Error("");
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "???AI ????????" }]);
    } finally { setLoading(false); }
  };
`);

fs.writeFileSync(b + "/chat/page.tsx", c);
console.log("chat:", c.length, "bytes");

// ===== REPORT =====
let r = fs.readFileSync(b + "/report/page.tsx", "utf8");

if (!r.includes('import { getApiBase }')) {
  r = r.replace(
    'import { GlassCard } from "@/components/ui/glass-card";',
    'import { getApiBase } from "@/lib/api";\nimport { GlassCard } from "@/components/ui/glass-card";'
  );
}

r = replaceFunc(r, "checkData",
`const checkData = () => {
    try {
      const stored = localStorage.getItem("currentDataset");
      if (stored) {
        const data = JSON.parse(stored);
        if (data && data.columns) {
          setHasData(true);
          setDatasetName(data.fileName || data.original_name || "???");
        }
      }
    } catch {} finally { setChecking(false); }
  };
`);

r = replaceFunc(r, "generateReport",
`const generateReport = async () => {
    setGenerating(true);
    try {
      const apiBase = getApiBase();
      const stored = localStorage.getItem("currentDataset");
      if (!stored) { setGenerating(false); return; }
      const dataset = JSON.parse(stored);
      const res = await fetch(apiBase + "/api/report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns: dataset.columns || [], rows: dataset.rows || [], datasetName: dataset.fileName || "???" }),
      });
      if (!res.ok) throw new Error("");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "AI_Data_Copilot_Report_" + new Date().toISOString().slice(0, 10) + ".pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setGenerated(true);
    } catch {} finally { setGenerating(false); }
  };
`);

fs.writeFileSync(b + "/report/page.tsx", r);
console.log("report:", r.length, "bytes");
console.log("Done!");
