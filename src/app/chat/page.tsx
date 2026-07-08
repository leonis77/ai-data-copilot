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
import type { EvidenceCard, PrioritizedAction, CrossDatasetSummary, ApplicableRule, ReasoningStep, PipelineMeta } from "@/lib/pipeline/types";
import type { CrossPlatformComparison } from "@/lib/cross-platform";
import { EvidenceCardView } from "@/components/insights/evidence-card-view";
import { ActionCardView } from "@/components/insights/action-card-view";
import { CrossDatasetView } from "@/components/insights/cross-dataset-view";
import CrossPlatformView from "@/components/insights/cross-platform";

var AI: Record<string, any> = { query: Search, report: FileText, interpret: Lightbulb, general: Sparkles };
var AC: Record<string, string> = { query: "text-accent-cyan", report: "text-primary-light", interpret: "text-accent-purple", general: "text-white/50" };

interface Msg {
  role: string; content: string; agentType?: string;
  chart?: any; table?: any; suggestions?: string[];
  // DecisionChain structured output (populated when type === "decision_chain")
  evidenceCards?: EvidenceCard[];
  actions?: PrioritizedAction[];
  crossDataset?: CrossDatasetSummary[];
  crossPlatform?: CrossPlatformComparison[];
  reasoningChain?: ReasoningStep[];
  applicableRules?: ApplicableRule[];
  meta?: PipelineMeta;
  aiConfidence?: number;
}

export default function ChatPage() {
  var [msgs, setMsgs] = useState<Msg[]>([]);
  var [inp, setInp] = useState("");
  var [loading, setLoading] = useState(false);
  var [hasData, setHasData] = useState(false);
  var [checking, setChecking] = useState(true);
  var sr = useRef<HTMLDivElement>(null);

  var autoSent = useRef(false);
  useEffect(function() { checkData(); }, []);
  useEffect(function() { if (sr.current) sr.current.scrollTop = sr.current.scrollHeight; }, [msgs]);
  // ⭐ 跨数据集关联入口：Dashboard banner 点"AI 跨平台分析" → 自动触发对比
  useEffect(function() {
    if (autoSent.current) return;
    if (typeof window === "undefined") return;
    var params = new URLSearchParams(window.location.search);
    if (params.get("auto") === "compare" && hasData && !loading) {
      autoSent.current = true;
      // 检查是否确实有多个数据集
      var saved = getStore();
      if (saved.datasets.length >= 2) {
        // 清理 URL（不刷新页面）
        var url = new URL(window.location.href);
        url.searchParams.delete("auto");
        window.history.replaceState({}, "", url.toString());
        // 自动发送跨平台分析请求
        send("帮我对比分析所有已上传数据的跨平台利润情况，找出同一商品在不同平台的定价和利润差异");
      }
    }
  }, [hasData, loading]);

  function checkData() {
    try {
      var saved = getStore();
      if (saved.activeId && saved.datasets.length > 0) {
        setHasData(true);
        setMsgs([{
          role: "assistant",
          content: "\u4f60\u597d\uff01\u6211\u662f AI \u7535\u5546\u6570\u636e\u5206\u6790\u52a9\u624b\uff0c\u53ef\u4ee5\u5e2e\u4f60\uff1a\n\n- **\u95ee\u6570\u636e** \u2014 \u67e5\u8be2\u4efb\u4f55\u6307\u6807\uff0c\u5982\u300c\u54ea\u4e2a\u5546\u54c1\u5356\u5f97\u6700\u597d\uff1f\u300d\n- **\u51fa\u62a5\u544a** \u2014 \u81ea\u52a8\u751f\u6210\u7ecf\u8425\u5206\u6790\u62a5\u544a\n- **\u6df1\u89e3\u8bfb** \u2014 \u53d1\u73b0\u6570\u636e\u80cc\u540e\u7684\u5546\u4e1a\u6545\u4e8b\n- **\u627e\u7206\u6b3e** \u2014 \u8bc6\u522b\u6f5c\u529b\u5546\u54c1\u548c\u589e\u957f\u673a\u4f1a\n\n\u8bf7\u76f4\u63a5\u95ee\u6211\u95ee\u9898\uff0c\u6211\u4f1a\u57fa\u4e8e\u4f60\u7684\u6570\u636e\u7ed9\u51fa\u4e13\u4e1a\u5206\u6790\u3002",
          agentType: "general",
          suggestions: ["\u54ea\u4e9b\u5546\u54c1\u9500\u552e\u989d\u6700\u9ad8\uff1f", "\u751f\u6210\u4e00\u4efd\u7ecf\u8425\u5206\u6790\u62a5\u544a", "\u5e2e\u6211\u89e3\u8bfb\u8fd9\u4efd\u6570\u636e\u7684\u8d8b\u52bf", "\u6570\u636e\u4e2d\u6709\u54ea\u4e9b\u5f02\u5e38\uff1f"]
        }]);
      }
    } catch(e) {} finally { setChecking(false); }
  }

  async function send(msg: string) {
    if (!msg.trim() || loading) return; setInp("");
    setMsgs(function(p: Msg[]) { return [...p, { role: "user", content: msg }]; }); setLoading(true);
    try {
      var saved = getStore(); var dsId = saved.activeId || "";
      // ⭐ 从浏览器 store 获取所有关联数据集ID，传给后端做跨数据集/跨平台分析
      var relatedIds: string[] = [];
      if (saved.datasets.length > 1) {
        for (var rdi = 0; rdi < saved.datasets.length; rdi++) {
          if (saved.datasets[rdi].id !== dsId) {
            relatedIds.push(saved.datasets[rdi].id);
          }
        }
      }
      var res = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: msg, datasetId: dsId, relatedDatasetIds: relatedIds }) });
      if (!res.ok) throw new Error("fail");
      var data = await res.json();
      var isDecisionChain = data.type === "decision_chain";
      setMsgs(function(p: Msg[]) { return [...p, {
        role: "assistant",
        content: data.content || "",
        agentType: data.type,
        chart: data.chart,
        table: data.table,
        suggestions: data.followUp,
        // DecisionChain structured output
        evidenceCards: isDecisionChain ? data.evidenceCards : undefined,
        actions: isDecisionChain ? data.actions : undefined,
        crossDataset: isDecisionChain ? data.crossDataset : undefined,
        crossPlatform: isDecisionChain ? data.crossPlatform : undefined,
        reasoningChain: isDecisionChain ? data.reasoningChain : undefined,
        applicableRules: isDecisionChain ? data.applicableRules : undefined,
        meta: isDecisionChain ? data.meta : undefined,
        aiConfidence: isDecisionChain ? data.aiExplanation?.confidence : undefined,
      }]; });
    } catch(e) {
      setMsgs(function(p: Msg[]) { return [...p, { role: "assistant", content: "\u62b1\u6b49\uff0cAI \u670d\u52a1\u6682\u65f6\u4e0d\u53ef\u7528\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002" }]; });
    } finally { setLoading(false); }
  }

  if (checking) return <div className="min-h-screen py-12 pt-20"><div className="max-w-4xl mx-auto px-6"><div className="h-8 w-48 skeleton rounded-lg mb-2" /><div className="h-[60vh] glass mt-6" /></div></div>;

  return (
    <div className="min-h-screen py-12 pt-20"><div className="max-w-4xl mx-auto px-6">
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.6}} className="mb-6">
        <div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>
          <div><h1 className="text-3xl font-bold"><span className="gradient-text">AI {"\u5206\u6790\u52a9\u624b"}</span></h1><p className="text-sm text-white/40">{"\u95ee\u6570\u636e \u00b7 \u51fa\u62a5\u544a \u00b7 \u6df1\u89e3\u8bfb \u00b7 \u627e\u7206\u6b3e"}</p></div>
          {hasData && <TableSelector className="ml-auto" />}
        </div>
      </motion.div>
      {!hasData ? (<motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.6}} className="text-center py-20">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6"><Sparkles className="w-10 h-10 text-indigo-400/50" /></div>
        <h2 className="text-2xl font-bold mb-3">{"\u8bf7\u5148\u4e0a\u4f20\u6570\u636e"}</h2><p className="text-white/40 mb-8">AI {"\u52a9\u624b\u9700\u8981\u7ecf\u8425\u6570\u636e\u624d\u80fd\u4e3a\u4f60\u63d0\u4f9b\u5206\u6790"}</p>
        <Link href="/upload"><motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg shadow-lg shadow-indigo-500/25"><Upload className="w-5 h-5" />{"\u4e0a\u4f20\u6570\u636e"}<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></motion.button></Link>
      </motion.div>) : (<div className="flex flex-col h-[calc(100dvh-12rem)] glass rounded-2xl overflow-hidden">
        <div ref={sr} className="flex-1 overflow-y-auto space-y-4 p-4">
          {msgs.map(function(m,i) {
            var isUser = m.role === "user";
            var Icon = AI[m.agentType||"general"] || Sparkles;
            return <motion.div key={i} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className={"flex gap-3 " + (isUser ? "justify-end" : "justify-start")}>
              {!isUser && <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5"><Icon className={"w-4 h-4 " + (AC[m.agentType||"general"]||"text-indigo-400")} /></div>}
              <div className="max-w-[85%] space-y-2">
                <div className={"rounded-2xl px-4 py-3 text-sm leading-relaxed " + (isUser ? "bg-indigo-500/20 text-white/90 rounded-br-md" : "glass text-white/80 rounded-bl-md")}>
                  <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:text-white [&_table]:w-full [&_th]:text-left [&_th]:p-1 [&_td]:p-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                </div>
                {m.chart && <div className="glass p-3 rounded-xl text-xs text-white/60">{"\u56fe\u8868\u5efa\u8bae"}: {m.chart.title} ({m.chart.type})</div>}
                {/* \u2550\u2550\u2550 DecisionChain \u7ed3\u6784\u5316\u5361\u7247 \u2550\u2550\u2550 */}
                {m.evidenceCards && m.evidenceCards.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] text-white/25 uppercase tracking-wider px-1">\u8bc1\u636e\u5361 ({m.evidenceCards.length})</div>
                    {m.evidenceCards.slice(0, 3).map(function(card, ci) {
                      return <EvidenceCardView key={ci} card={card} defaultExpanded={ci === 0} />;
                    })}
                    {m.evidenceCards.length > 3 && (
                      <div className="text-[10px] text-white/20 text-center py-1">
                        +{m.evidenceCards.length - 3} \u5f20\u66f4\u591a\u8bc1\u636e\u5361
                      </div>
                    )}
                  </div>
                )}
                {m.crossDataset && m.crossDataset.length > 0 && (
                  <CrossDatasetView data={m.crossDataset} />
                )}
                {m.crossPlatform && m.crossPlatform.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] text-white/25 uppercase tracking-wider px-1">\u8de8\u5e73\u53f0\u5229\u6da6\u5bf9\u6bd4</div>
                    <CrossPlatformView
                      comparisons={m.crossPlatform}
                      coveredPlatforms={m.crossPlatform.reduce(function(acc: string[], c) {
                        c.platformResults.forEach(function(p) { if (acc.indexOf(p.platform) === -1) acc.push(p.platform); });
                        return acc;
                      }, [])}
                    />
                  </div>
                )}
                {m.actions && m.actions.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-white/25 uppercase tracking-wider px-1">\u884c\u52a8\u5efa\u8bae ({m.actions.length})</div>
                    {m.actions.map(function(act, ai) {
                      return <ActionCardView key={ai} action={act} index={ai} />;
                    })}
                  </div>
                )}
                {m.aiConfidence !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className={"text-[10px] px-2 py-0.5 rounded-full " + (
                      m.aiConfidence >= 0.8 ? "bg-green-500/10 text-green-400/70" :
                      m.aiConfidence >= 0.5 ? "bg-amber-500/10 text-amber-400/70" :
                      "bg-red-500/10 text-red-400/70"
                    )}>
                      AI 置信度 {Math.round(m.aiConfidence * 100)}%
                    </span>
                  </div>
                )}
                {m.suggestions && m.suggestions.length > 0 && <div className="flex flex-wrap gap-2">{m.suggestions.map(function(s: string,j: number) { return <button key={j} onClick={function() { send(s); }} className="px-3 py-1.5 rounded-xl glass text-xs text-white/50 hover:text-white/80 hover:bg-white/10 transition-all">{s}</button>; })}</div>}
              </div>
              {isUser && <div className="w-8 h-8 rounded-lg bg-accent-cyan/20 flex items-center justify-center shrink-0 mt-0.5"><MessageSquare className="w-4 h-4 text-accent-cyan" /></div>}
            </motion.div>;
          })}
          {loading && <div className="flex gap-3"><div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0"><Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" /></div><div className="glass rounded-2xl rounded-bl-md px-4 py-3"><div className="flex gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-400/40 animate-bounce" style={{animationDelay:"0ms"}} /><span className="w-2 h-2 rounded-full bg-indigo-400/40 animate-bounce" style={{animationDelay:"150ms"}} /><span className="w-2 h-2 rounded-full bg-indigo-400/40 animate-bounce" style={{animationDelay:"300ms"}} /></div></div></div>}
        </div>
        <div className="p-4 border-t border-white/5 flex gap-3">
          <input value={inp} onChange={function(e: any) { setInp(e.target.value); }} onKeyDown={function(e: any) { if (e.key === "Enter") send(inp); }} placeholder={"\u544a\u8bc9 AI \u52a9\u624b\u4f60\u60f3\u4e86\u89e3\u4ec0\u4e48..."} className="flex-1 glass px-4 py-3 rounded-xl text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-indigo-400/50 transition-all" />
          <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={function() { send(inp); }} disabled={!inp.trim()||loading} className="w-12 h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center disabled:opacity-30 transition-opacity"><ArrowRight className="w-5 h-5 text-white" /></motion.button>
        </div>
      </div>)}
    </div></div>
  );
}
