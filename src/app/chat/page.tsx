"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { MessageSquare, Upload, ArrowRight, Sparkles, Search, FileText, Lightbulb } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { TableSelector } from "@/components/ui/table-selector";
import { getStore } from "@/lib/store";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const AI: Record<string, any> = { query: Search, report: FileText, interpret: Lightbulb, general: Sparkles };
const AC: Record<string, string> = { query: "text-accent-cyan", report: "text-primary-light", interpret: "text-accent-purple", general: "text-white/50" };

interface Msg { role: string; content: string; agentType?: string; chart?: any; table?: any; suggestions?: string[] }

export default function ChatPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [inp, setInp] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [checking, setChecking] = useState(true);
  const sr = useRef<HTMLDivElement>(null);

  useEffect(() => { checkData(); }, []);
  useEffect(() => { if (sr.current) sr.current.scrollTop = sr.current.scrollHeight; }, [msgs]);

  function checkData() {
    try {
      const saved = getStore();
      if (saved.activeId && saved.datasets.length > 0) {
        setHasData(true);
        setMsgs([{
          role: "assistant",
          content: "嗨！我是 AI 电商数据分析助手。我可以帮你：\n\n- **问数据** - 查询任何数据指标，如「哪个商品卖得最好？」\n- **出报告** - 自动生成经营分析报告\n- **深解读** - 发现数据背后的商业故事\n- **找爆款** - 识别潜力商品和增长机会\n\n请直接问我问题，我会基于你的数据给出专业分析。",
          agentType: "general",
          suggestions: ["哪些商品销售额最高？", "生成一份经营分析报告", "帮我解读这份数据的趋势", "数据中有哪些异常？"]
        }]);
      }
    } catch {} finally { setChecking(false); }
  }

  async function send(msg: string) {
    if (!msg.trim() || loading) return;
    setInp("");
    setMsgs(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const saved = getStore();
      const dsId = saved.activeId || "";
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: msg, datasetId: dsId })
      });
      if (!res.ok) throw new Error("fail");
      const data = await res.json();
      setMsgs(prev => [...prev, {
        role: "assistant",
        content: data.content || "",
        agentType: data.type,
        chart: data.chart,
        table: data.table,
        suggestions: data.followUp
      }]);
    } catch {
      setMsgs(prev => [...prev, {
        role: "assistant",
        content: "抱歉，AI 服务暂时不可用，请稍后重试。"
      }]);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="h-8 w-48 skeleton rounded-lg mb-2" />
          <div className="h-[60vh] glass mt-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                <span className="gradient-text">AI 分析助手</span>
              </h1>
              <p className="text-sm text-white/40">问数据 · 出报告 · 深解读 · 找爆款</p>
            </div>
            {hasData && <TableSelector className="ml-auto" />}
          </div>
        </motion.div>

        {!hasData ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-primary-light/50" />
            </div>
            <h2 className="text-2xl font-bold mb-3">请先上传数据</h2>
            <p className="text-white/40 mb-8">AI 助手需要经营数据才能为你提供分析</p>
            <Link href="/upload">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold text-lg shadow-lg shadow-primary/25">
                <Upload className="w-5 h-5" />上传数据
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
          </motion.div>
        ) : (
          <GlassCard className="flex flex-col h-[calc(100vh-12rem)]">
            <div ref={sr} className="flex-1 overflow-y-auto space-y-4 p-4">
              {msgs.map((m, i) => {
                const isUser = m.role === "user";
                const Icon = AI[m.agentType || "general"] || Sparkles;
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={"flex gap-3 " + (isUser ? "justify-end" : "justify-start")}>
                    {!isUser && (
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className={"w-4 h-4 " + (AC[m.agentType || "general"] || "text-primary-light")} />
                      </div>
                    )}
                    <div className="max-w-[85%] space-y-2">
                      <div className={"rounded-2xl px-4 py-3 text-sm leading-relaxed " +
                        (isUser ? "bg-primary/20 text-white/90 rounded-br-md" : "glass text-white/80 rounded-bl-md")}>
                        <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:text-white [&_table]:w-full [&_th]:text-left [&_th]:p-1 [&_td]:p-1">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                        </div>
                      </div>
                      {m.chart && (
                        <div className="glass p-3 rounded-xl text-xs text-white/60">
                          图表建议: {m.chart.title} ({m.chart.type})
                        </div>
                      )}
                      {m.suggestions && m.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {m.suggestions.map((s: string, j: number) => (
                            <button key={j} onClick={() => send(s)}
                              className="px-3 py-1.5 rounded-xl glass text-xs text-white/50 hover:text-white/80 hover:bg-white/10 transition-all">
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {isUser && (
                      <div className="w-8 h-8 rounded-lg bg-accent-cyan/20 flex items-center justify-center shrink-0 mt-0.5">
                        <MessageSquare className="w-4 h-4 text-accent-cyan" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-primary-light animate-pulse" />
                  </div>
                  <div className="glass rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/5 flex gap-3">
              <input value={inp} onChange={(e) => setInp(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(inp); }}
                placeholder="告诉 AI 助手你想了解什么..."
                className="flex-1 glass px-4 py-3 rounded-xl text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-primary/50 transition-all" />
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => send(inp)} disabled={!inp.trim() || loading}
                className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary to-accent-purple flex items-center justify-center disabled:opacity-30 transition-opacity">
                <ArrowRight className="w-5 h-5 text-white" />
              </motion.button>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
