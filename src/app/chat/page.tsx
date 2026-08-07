"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { MessageSquare, Upload, ArrowRight, Sparkles, Search, FileText, Lightbulb } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { TableSelector } from "@/components/ui/table-selector";
import { getStore, getDatasetRows, buildInlineDataset, getAnalysisCache, setAnalysisCache } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { logger } from "@/lib/logger";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { EvidenceCard, PrioritizedAction, CrossDatasetSummary, ApplicableRule, ReasoningStep, PipelineMeta } from "@/lib/pipeline/types";
import type { CrossPlatformComparison } from "@/lib/cross-platform";
import { EvidenceCardView } from "@/components/insights/evidence-card-view";
import { ActionCardView } from "@/components/insights/action-card-view";
import { CrossDatasetView } from "@/components/insights/cross-dataset-view";
import CrossPlatformView from "@/components/insights/cross-platform";
import ExecutionTracker from "@/components/insights/execution-tracker";
import type { AgentApiResponse, DecisionChainResponse } from "@/lib/agent/api-types";
import type { Execution, Outcome } from "@/lib/loop/types";
import { fetchLoopHistory } from "@/lib/loop/client";
import { parseApiError } from "@/lib/errors";
import { useObservability } from "@/hooks/use-observability";
import { authFetch } from "@/lib/auth-fetch";
import { RequireAuth } from "@/hooks/use-auth-guard";

var AI: Record<string, any> = { query: Search, report: FileText, interpret: Lightbulb, general: Sparkles };
var AC: Record<string, string> = { query: "text-brand", report: "text-primary", interpret: "text-brand", general: "text-tertiary" };

interface Msg {
  role: string; content: string; agentType?: string;
  chart?: any; table?: any; suggestions?: string[];
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
  const obs = useObservability();
  const { user } = useAuth();
  var [msgs, setMsgs] = useState<Msg[]>([]);
  var [inp, setInp] = useState("");
  var [loading, setLoading] = useState(false);
  var [hasData, setHasData] = useState(false);
  var [checking, setChecking] = useState(true);
  var [loopExecutions, setLoopExecutions] = useState<Record<string, Execution[]>>({});
  var [loopOutcomes, setLoopOutcomes] = useState<Record<string, Outcome[]>>({});
  var [chatDsId, setChatDsId] = useState("");
  var sr = useRef<HTMLDivElement>(null);

  useEffect(function() { if (hasData) obs.trackPageView("chat", { datasetId: chatDsId || "none" }); }, [hasData, chatDsId]);

  var autoSent = useRef(false);
  useEffect(function() { checkData(); }, [user?.id]);
  useEffect(function() { if (sr.current) sr.current.scrollTop = sr.current.scrollHeight; }, [msgs]);

  useEffect(function() {
    if (autoSent.current) return;
    if (typeof window === "undefined") return;
    var params = new URLSearchParams(window.location.search);
    if (params.get("auto") === "compare" && hasData && !loading) {
      autoSent.current = true;
      var url = new URL(window.location.href);
      url.searchParams.delete("auto");
      window.history.replaceState({}, "", url.toString());
      var saved = getStore(user?.id || "");
      if (saved.datasets.length >= 2) {
        send("帮我对比分析所有已上传数据的跨平台利润情况，找出同一商品在不同平台的定价和利润差异");
      }
    }
  }, [hasData, loading]);

  function checkData() {
    try {
      var saved = getStore(user?.id || "");
      if (saved.activeId && saved.datasets.length > 0) {
        setHasData(true);
        setMsgs([{
          role: "assistant",
          content: "你好！我是 AI 电商数据分析助手，可以帮你：\n\n- **问数据** — 查询任何指标，如「哪个商品卖得最好？」\n- **出报告** — 自动生成经营分析报告\n- **深解读** — 发现数据背后的商业故事\n- **找爆款** — 识别潜力商品和增长机会\n\n请直接问我问题，我会基于你的数据给出专业分析。",
          agentType: "general",
          suggestions: ["哪些商品销售额最高？", "生成一份经营分析报告", "帮我解读这份数据的趋势", "数据中有哪些异常？"]
        }]);
      }
    } catch(e) {} finally { setChecking(false); }
  }

  async function send(msg: string) {
    if (!msg.trim() || loading) return; setInp("");
    setMsgs(function(p: Msg[]) { return [...p, { role: "user", content: msg }]; }); setLoading(true);
    try {
      var saved = getStore(user?.id || ""); var dsId = saved.activeId || "";
      var relatedIds: string[] = [];
      if (saved.datasets.length > 1) {
        for (var rdi = 0; rdi < saved.datasets.length; rdi++) {
          if (saved.datasets[rdi].id !== dsId) {
            relatedIds.push(saved.datasets[rdi].id);
          }
        }
      }
      var inlineDatasets: Record<string, any> = {};
      var activeRows = getDatasetRows(dsId);
      if (activeRows && activeRows.rows.length > 0) {
        var activeMeta = saved.datasets.find(function(d) { return d.id === dsId; });
        if (activeMeta) inlineDatasets[dsId] = buildInlineDataset(activeMeta, activeRows.rows, 500);
      }
      for (var rri = 0; rri < relatedIds.length; rri++) {
        var relRows = getDatasetRows(relatedIds[rri]);
        if (relRows && relRows.rows.length > 0) {
          var relMeta = saved.datasets.find(function(d) { return d.id === relatedIds[rri]; });
          if (relMeta) inlineDatasets[relatedIds[rri]] = buildInlineDataset(relMeta, relRows.rows, 200);
        }
      }
      var res = await authFetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: msg, datasetId: dsId, relatedDatasetIds: relatedIds, inlineDatasets: inlineDatasets }) });
      var agentStart = Date.now();
      var data = await res.json().catch(function() { return null; }) as AgentApiResponse | null;
      obs.trackApiCall("/api/agent", Date.now() - agentStart, res.ok, { type: data?.type || "none" });
      if (!res.ok || !data) {
        var apiErr = data ? parseApiError(data) : null;
        var errorMessage = apiErr ? apiErr.message : "AI 服务暂时不可用，请稍后重试。";
        throw new Error(errorMessage);
      }
      // 缓存分析结果，避免刷新页面后重新分析
      if (dsId) {
        setAnalysisCache(user?.id || "", dsId, data);
      }
      var responseData: AgentApiResponse = data;
      var isDecisionChain = responseData.type === "decision_chain";
      var decisionData: DecisionChainResponse | null = isDecisionChain ? responseData as DecisionChainResponse : null;
      var legacyData = responseData.type === "query" || responseData.type === "report" || responseData.type === "interpret" || responseData.type === "general" ? responseData : null;
      var content = responseData.content;
      if (responseData.type === "insufficient_data" && responseData.limitations.length > 0) {
        content += "\n\n**需要补充：**\n" + responseData.limitations.map(function(item) { return "- " + item; }).join("\n");
      }

      var newExecutions: Record<string, Execution[]> = {};
      var newOutcomes: Record<string, Outcome[]> = {};
      if (isDecisionChain && decisionData?.actions?.length) {
        try {
          setChatDsId(dsId);
          var loopData = await fetchLoopHistory(dsId);
          for (const dd of loopData.decisions) {
            for (const t of (dd.actionTasks || [])) {
              if (dd.executions && dd.executions[t.id]) newExecutions[t.id] = dd.executions[t.id];
              if (dd.outcomes && dd.outcomes[t.id]) newOutcomes[t.id] = dd.outcomes[t.id];
            }
          }
          setLoopExecutions(function(p) { return Object.assign({}, p, newExecutions); });
          setLoopOutcomes(function(p) { return Object.assign({}, p, newOutcomes); });
        } catch (e) {
          logger.warn("Chat loop history fetch failed", { message: e instanceof Error ? e.message : String(e) });
        }
      }

      setMsgs(function(p: Msg[]) { return [...p, {
        role: "assistant",
        content: content || "",
        agentType: responseData.type,
        chart: legacyData?.chart,
        table: legacyData?.table,
        suggestions: legacyData?.followUp,
        evidenceCards: decisionData?.evidenceCards,
        actions: decisionData?.actions,
        crossDataset: decisionData?.crossDataset,
        crossPlatform: decisionData?.crossPlatform,
        reasoningChain: decisionData?.aiExplanation.reasoningChain,
        applicableRules: decisionData?.applicableRules,
        meta: decisionData?.meta,
        aiConfidence: decisionData?.aiExplanation.confidence,
      }]; });
    } catch(e) {
      setMsgs(function(p: Msg[]) { return [...p, { role: "assistant", content: e instanceof Error ? e.message : "抱歉，AI 服务暂时不可用，请稍后重试。" }]; });
    } finally { setLoading(false); }
  }

  if (checking) return (
    <div className="min-h-screen py-12 pt-20">
      <div className="section-container">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="icon-box bg-blue-50 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-brand animate-pulse" />
          </div>
          <div>
            <div className="h-6 w-32 skeleton rounded-lg mb-1.5" />
            <div className="h-4 w-48 skeleton rounded-lg" />
          </div>
        </div>
        <div className="h-[60vh] glass rounded-2xl shimmer" />
      </div>
    </div>
  );

  return (
    <RequireAuth>
      <div className="min-h-screen py-12 pt-20">
        <div className="section-container">
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.7, ease: "easeOut"}} className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="icon-box bg-gradient-to-br from-blue-500 to-cyan-600 shadow-sm"><Sparkles className="w-5 h-5 text-white" /></div>
            <div>
              <h1 className="text-title"><span className="gradient-text">AI 分析助手</span></h1>
              <p className="text-caption">{"问数据 · 出报告 · 深解读 · 找爆款"}</p>
            </div>
            {hasData && <TableSelector userId={user?.id} className="ml-auto" />}
          </div>
        </motion.div>
        {!hasData ? (
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.7, ease: "easeOut"}} className="text-center py-20">
            <motion.div
              animate={{ y: [0, -12, 0], rotate: [0, 3, -3, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 rounded-2xl bg-blue-500/5" />
              <Sparkles className="w-10 h-10 text-brand relative z-10" />
            </motion.div>
            <h2 className="text-title mb-3 text-primary">请先上传数据</h2>
            <p className="text-body mb-8 leading-relaxed">AI 助手需要经营数据才能为你提供分析</p>
            <Link href="/upload">
              <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} transition={{ type: "spring", stiffness: 400, damping: 15 }} className="btn-primary text-lg px-8 py-4 rounded-2xl flex items-center gap-2">
                <Upload className="w-5 h-5" />{"上传数据"}
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </motion.div>
        ) : (
          <div className="flex flex-col h-[calc(100dvh-12rem)] rounded-2xl overflow-hidden border border-gray-200 shadow-sm card">
            <div ref={sr} className="flex-1 overflow-y-auto space-y-4 p-4">
              {msgs.map(function(m,i) {
                var isUser = m.role === "user";
                var Icon = AI[m.agentType||"general"] || Sparkles;
                return (
                  <motion.div key={i} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.4, ease: "easeOut"}} className={"flex gap-3 " + (isUser ? "justify-end" : "justify-start")}>
                    {!isUser && <div className="icon-box-sm bg-blue-50 flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-blue-100"><Icon className={"w-4 h-4 text-brand"} /></div>}
                    <div className="max-w-[85%] space-y-2">
                      <div className={"rounded-2xl px-4 py-3 text-sm leading-relaxed " + (isUser
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md shadow-sm"
                        : "bg-white border border-gray-200 text-secondary rounded-bl-md shadow-sm")}>
                        <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:text-primary [&_table]:w-full [&_th]:text-left [&_th]:p-1 [&_td]:p-1">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                        </div>
                      </div>
                      {m.chart && <div className="glass p-3 rounded-xl text-xs text-secondary">{"图表建议"}: {m.chart.title} ({m.chart.type})</div>}
                      {m.evidenceCards && m.evidenceCards.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-caption uppercase tracking-wider px-1 text-faint">证据卡 ({m.evidenceCards.length})</div>
                          {m.evidenceCards.slice(0, 3).map(function(card, ci) {
                            return <EvidenceCardView key={ci} card={card} defaultExpanded={ci === 0} />;
                          })}
                          {m.evidenceCards.length > 3 && (
                            <div className="text-caption text-center py-1 text-tertiary">
                              +{m.evidenceCards.length - 3} 张更多证据卡
                            </div>
                          )}
                        </div>
                      )}
                      {m.crossDataset && m.crossDataset.length > 0 && (
                        <CrossDatasetView data={m.crossDataset} />
                      )}
                      {m.crossPlatform && m.crossPlatform.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-caption uppercase tracking-wider px-1 text-faint">跨平台利润对比</div>
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
                        <div className="space-y-3">
                          <div className="text-caption uppercase tracking-wider px-1 text-faint">行动建议 ({m.actions.length})</div>
                          {m.actions.map(function(act, ai) {
                            return (
                              <div key={ai} className="space-y-2">
                                <ActionCardView action={act} index={ai} />
                                {act.actionTaskId && (
                                  <ExecutionTracker
                                    actionTaskId={act.actionTaskId}
                                    title={act.title || act.action}
                                    description={act.description || act.reason}
                                    priority={act.priority}
                                    riskLevel={act.riskLevel}
                                    expectedProfitImpact={act.expectedProfitImpact}
                                    executions={loopExecutions[act.actionTaskId] || []}
                                    outcomes={loopOutcomes[act.actionTaskId] || []}
                                    onRefresh={function() {
                                      if (!chatDsId) return;
                                      fetchLoopHistory(chatDsId).then(function(data) {
                                        var execMap: Record<string, Execution[]> = {};
                                        var outcomeMap: Record<string, Outcome[]> = {};
                                        for (const dd of data.decisions) {
                                          for (const t of (dd.actionTasks || [])) {
                                            if (dd.executions && dd.executions[t.id]) execMap[t.id] = dd.executions[t.id];
                                            if (dd.outcomes && dd.outcomes[t.id]) outcomeMap[t.id] = dd.outcomes[t.id];
                                          }
                                        }
                                        setLoopExecutions(function(p) { return Object.assign({}, p, execMap); });
                                        setLoopOutcomes(function(p) { return Object.assign({}, p, outcomeMap); });
                                      }).catch(function() {});
                                    }}
                                    compact
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {m.aiConfidence !== undefined && (
                        <div className="flex items-center gap-2">
                          <span className={"text-caption px-2.5 py-1 rounded-full " + (
                            m.aiConfidence >= 0.8 ? "badge-success" :
                            m.aiConfidence >= 0.5 ? "badge-warning" :
                            "badge-danger"
                          )}>
                            AI 置信度 {Math.round(m.aiConfidence * 100)}%
                          </span>
                        </div>
                      )}
                      {m.suggestions && m.suggestions.length > 0 && <div className="flex flex-wrap gap-2">{m.suggestions.map(function(s: string,j: number) { return <button key={j} onClick={function() { send(s); }} className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs text-secondary hover:text-primary hover:border-brand/30 hover:bg-blue-50 transition-all duration-200">{s}</button>; })}</div>}
                    </div>
                    {isUser && <div className="icon-box-sm bg-blue-100 flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-blue-200"><MessageSquare className="w-4 h-4 text-brand" /></div>}
                  </motion.div>
                );
              })}
              {loading && (
                <div className="flex gap-3">
                  <div className="icon-box-sm bg-blue-50 flex items-center justify-center shrink-0 ring-1 ring-blue-100">
                    <Sparkles className="w-4 h-4 text-brand animate-pulse" />
                  </div>
                  <div className="glass rounded-2xl rounded-bl-md px-4 py-3.5 border border-gray-200">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-brand/40 animate-bounce" style={{animationDelay:"0ms"}} />
                      <span className="w-2 h-2 rounded-full bg-brand/40 animate-bounce" style={{animationDelay:"150ms"}} />
                      <span className="w-2 h-2 rounded-full bg-brand/40 animate-bounce" style={{animationDelay:"300ms"}} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-3">
                <input value={inp} onChange={function(e: any) { setInp(e.target.value); }} onKeyDown={function(e: any) { if (e.key === "Enter") send(inp); }} placeholder={"告诉 AI 助手你想了解什么..."} className="input-base flex-1" />
                <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} transition={{ type: "spring", stiffness: 400, damping: 15 }} onClick={function() { send(inp); }} disabled={!inp.trim()||loading} className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center disabled:opacity-30 transition-opacity shadow-glow hover:shadow-glow-strong">
                  <ArrowRight className="w-5 h-5 text-white" />
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </RequireAuth>
  );
}
