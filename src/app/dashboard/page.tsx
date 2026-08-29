"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import {
  Upload, ArrowRight, Sparkles, BarChart3,
  ChevronRight,
} from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { TableSelector } from "@/components/ui/table-selector";
import { useAuth } from "@/lib/auth-context";
import { detectRelations } from "@/lib/semantic";
import type { DatasetRelation } from "@/lib/semantic";
import { GenericOverview } from "@/components/insights/generic-overview";
import CrossPlatformView from "@/components/insights/cross-platform";
import { ProfitBar } from "@/components/dashboard/profit-bar";
import { ProfitRanking } from "@/components/dashboard/profit-ranking";
import { CostStructure } from "@/components/dashboard/cost-structure";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { ActionCardView } from "@/components/insights/action-card-view";
import { EvidenceCardView } from "@/components/insights/evidence-card-view";
import LoopReviewBoard from "@/components/insights/loop-review-board";
import ScenarioPanel from "@/components/insights/scenario-panel";
import type { DecisionChainResponse, InsufficientDataResponse } from "@/lib/agent/api-types";
import type { PrioritizedAction } from "@/lib/pipeline/types";
import type { CrossPlatformComparison } from "@/lib/cross-platform";
import { getPlatformLabel } from "@/lib/platform/detect";
import { useObservability } from "@/hooks/use-observability";
import { RequireAuth } from "@/hooks/use-auth-guard";
import { DataProvider } from "@/contexts/data-context";
import { useActiveDataset, useAnalysisData, useLoopData } from "@/hooks/use-unified-data";
import { DashboardSkeleton } from "@/components/app/skeleton/dashboard-skeleton";

// ═══════════════════════════════════════════════
// Animation utilities
// ═══════════════════════════════════════════════

function Reveal({ children, delay = 0, y = 16, x = 0, scale = false, className = "" }: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  x?: number;
  scale?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y, x, scale: scale ? 0.97 : 1 }}
      animate={inView ? { opacity: 1, y: 0, x: 0, scale: 1 } : { opacity: 0, y, x, scale: scale ? 0.97 : 1 }}
      transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════
// Inner component (consumes DataContext)
// ═══════════════════════════════════════════════

function DashboardInner() {
  const { user } = useAuth();
  const userId = user?.id || "";
  const dataset = useActiveDataset();
  const analysis = useAnalysisData(userId);
  const loop = useLoopData(userId, dataset.activeDatasetId);

  const activeDatasetId = dataset.activeDatasetId;
  const activeDataset = dataset.activeDataset;
  const datasets = dataset.datasets;
  const activeRows = dataset.activeRows;
  const setActiveDataset = dataset.setActiveDataset;
  const rawData = analysis.rawData;
  const decisionChain = analysis.decisionChain;
  const insufficientData = analysis.insufficientData;
  const agentLoading = analysis.agentLoading;
  const pipelineError = analysis.pipelineError;
  const degradedResponse = analysis.degradedResponse;
  const fetchAnalysis = analysis.fetchAnalysis;
  const loopRows = loop.rows;
  const loopLoading = loop.loopLoading;
  const loopError = loop.loopError;
  const refreshLoopData = loop.refreshLoopData;
  const totalDecisions = loop.totalDecisions;
  const totalActionTasks = loop.totalActionTasks;
  const executedTasks = loop.executedTasks;
  const completedTasks = loop.completedTasks;
  const failedTasks = loop.failedTasks;
  const totalOutcomes = loop.totalOutcomes;
  const verifiedProfit = loop.verifiedProfit;
  const expectedProfit = loop.expectedProfit;
  const positiveOutcomes = loop.positiveOutcomes;
  const completionRate = loop.completionRate;
  const positiveRate = loop.positiveRate;


  // Dataset metadata
  const datasetData = useMemo(() => {
    if (!rawData) return null;
    return {
      columns: rawData.columns,
      rows: rawData.rows,
      original_name: rawData.original_name || "",
    };
  }, [rawData]);

  const dataProfile = activeDataset?.profile || "unknown";
  const currentPlatform = activeDataset?.platform || "";

  // Relations
  const relations: DatasetRelation[] = useMemo(() => {
    try {
      return detectRelations(
        datasets.map((d: any) => ({
          id: d.id,
          originalName: d.originalName,
          semanticRoles: d.semanticRoles ?? null,
        }))
      );
    } catch {
      return [];
    }
  }, [datasets]);

  const allPlatforms = useMemo(
    () => datasets.map((d: any) => d.platform || "").filter((p: string) => p !== ""),
    [datasets]
  );
  const hasMultiPlatform = new Set(allPlatforms).size >= 2;

  // Pipeline data
  const evidenceCards = decisionChain?.evidenceCards || [];
  const diagnoses = decisionChain?.diagnoses || [];
  const actions = decisionChain?.actions || [];
  const aiSummary = decisionChain?.content || "";
  const scenarios = decisionChain?.scenarios;
  const hasScenarios = scenarios && scenarios.scenarios && scenarios.scenarios.length > 0;
  const crossPlatform: CrossPlatformComparison[] = decisionChain?.crossPlatform || [];

  // Diagnosis counts
  const criticalDiagnoses = diagnoses.filter((d: any) => d.level === "critical");
  const warningDiagnoses = diagnoses.filter((d: any) => d.level === "warning");
  const opportunityDiagnoses = diagnoses.filter((d: any) => d.level === "opportunity");

  // Handlers
  const handleSelect = useCallback(
    (newId: string) => {
      setActiveDataset(newId);
    },
    [setActiveDataset]
  );

  // Decision status changes are handled internally by LoopReviewBoard via DataContext

  // ═══════════════════════════════════════════════
  // Loading / Error / Empty States
  // ═══════════════════════════════════════════════

  if (!rawData) {
    return (
      <RequireAuth>
        <div className="min-h-screen pt-20 flex items-center justify-center" style={{ background: "var(--color-bg-root)" }}>
          <Reveal>
            <div className="text-center max-w-sm px-8">
              <motion.div animate={{ y: [0, -14, 0], rotate: [0, 4, -4, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-8 relative">
                <div className="absolute inset-0 rounded-3xl" style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.06) 0%, rgba(14,165,233,0.04) 100%)" }} />
                <BarChart3 className="w-10 h-10 text-brand relative z-10" />
              </motion.div>
              <h2 className="text-2xl font-bold text-primary mb-3 tracking-tight">数据不足，无法生成诊断</h2>
              <p className="text-body mb-10">请先上传销售数据，AI 才能为你生成经营诊断报告</p>
              <Link href="/upload">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="px-10 py-4 rounded-2xl text-white font-bold text-base flex items-center gap-2.5 mx-auto transition-all" style={{ background: "linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)", boxShadow: "0 4px 16px rgba(79, 70, 229, 0.25)" }}>
                  <Upload className="w-5 h-5" />上传数据 <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
            </div>
          </Reveal>
        </div>
      </RequireAuth>
    );
  }

  // ═══════════════════════════════════════════════
  // Main Render
  // ═══════════════════════════════════════════════

  return (
    <RequireAuth>
      <ErrorBoundary>
        <div className="min-h-screen pt-20" style={{ background: "var(--color-bg-root)" }}>
          <div className="max-w-6xl mx-auto px-6 py-10 md:py-14">

            {/* ═══ Header ═══ */}
            <Reveal>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-2">
                <div className="min-w-0">
                  <h1 className="text-3xl md:text-4xl font-extrabold text-primary tracking-tight">经营诊断</h1>
                  {activeDataset?.originalName && (
                    <p className="text-sm text-tertiary mt-2 font-medium truncate">{activeDataset.originalName}</p>
                  )}
                </div>
                <TableSelector onSelect={handleSelect} userId={userId} className="sm:ml-auto shrink-0" />
              </div>
            </Reveal>

            {/* Data relation banner */}
            {relations.length > 0 && (
              <Reveal delay={0.15}>
                <div className="mt-5 mb-8 p-4 rounded-2xl border flex flex-wrap items-center gap-3" style={{ background: "linear-gradient(135deg, var(--color-semantic-info) 0%, var(--color-bg-surface) 100%)", borderColor: "var(--color-border-default)" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.08) 0%, rgba(14,165,233,0.05) 100%)" }}>
                    <Sparkles className="w-4 h-4 text-brand" />
                  </div>
                  <span className="text-sm text-secondary leading-relaxed">
                    检测到 <strong className="text-primary">{relations.length}</strong> 组数据关联关系：{relations[0].description}
                  </span>
                  <Link href="/chat?auto=compare" className="ml-auto text-xs font-bold text-brand hover:text-brand-dark transition-colors shrink-0 flex items-center gap-1">
                    AI 跨平台分析 <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </Reveal>
            )}

            {/* ═══ Row 1: Profit KPI Bar ═══ */}
            {evidenceCards.length > 0 && (
              <Reveal delay={0.1}>
                <div className="mb-6 md:mb-8">
                  <ProfitBar evidenceCards={evidenceCards} />
                </div>
              </Reveal>
            )}

            {/* ═══ Row 2: Profit Ranking + Cost Structure ═══ */}
            {evidenceCards.length > 0 && (
              <Reveal delay={0.15}>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 mb-6 md:mb-8">
                  <div className="lg:col-span-3">
                    <ProfitRanking evidenceCards={evidenceCards} />
                  </div>
                  <div className="lg:col-span-2">
                    <CostStructure evidenceCards={evidenceCards} />
                  </div>
                </div>
              </Reveal>
            )}

            {/* ═══ Row 3: Diagnoses Feed ═══ */}
            {diagnoses.length > 0 && (
              <Reveal delay={0.2}>
                <div className="mb-6 md:mb-8">
                  <div className="flex flex-wrap items-center gap-3 mb-5">
                    <h2 className="text-xl font-bold text-primary tracking-tight">经营诊断</h2>
                    <div className="flex items-center gap-3 text-xs font-medium">
                      {criticalDiagnoses.length > 0 && <span className="flex items-center gap-1.5" style={{ color: "var(--color-semantic-danger-text)" }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-semantic-danger-text)" }} />{criticalDiagnoses.length} 紧急</span>}
                      {warningDiagnoses.length > 0 && <span className="flex items-center gap-1.5" style={{ color: "var(--color-semantic-warning-text)" }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-semantic-warning-text)" }} />{warningDiagnoses.length} 警告</span>}
                      {opportunityDiagnoses.length > 0 && <span className="flex items-center gap-1.5" style={{ color: "var(--color-semantic-success-text)" }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-semantic-success-text)" }} />{opportunityDiagnoses.length} 机会</span>}
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {criticalDiagnoses.map((d: any, i: number) => (
                      <motion.div key={"crit-" + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="rounded-2xl p-5 border transition-all duration-200 hover:shadow-sm"
                        style={{ background: "linear-gradient(135deg, var(--color-semantic-danger) 0%, var(--color-bg-surface) 60%)", borderColor: "rgba(220,38,38,0.08)" }}>
                        <div className="flex items-start gap-3.5">
                          <span className="text-sm mt-0.5 shrink-0">❌</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold" style={{ color: "var(--color-semantic-danger-text)" }}>{d.title}</h4>
                            <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{d.detail}</p>
                            {d.action && <p className="text-sm font-bold mt-3" style={{ color: "var(--color-semantic-info-text)" }}>→ {d.action}</p>}
                            {d.impact && <p className="text-xs mt-2" style={{ color: "var(--color-semantic-success-text)", opacity: 0.7 }}>预期: {d.impact}</p>}
                            {d.reference && <p className="text-xs mt-2 font-mono" style={{ color: "var(--color-text-faint)" }}>{d.reference}</p>}
                            {d.products && d.products.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                                {d.products.map((p: string, pi: number) => {
                                  const cardIdx = evidenceCards.findIndex((c: any) => c.productName === p);
                                  return (
                                    <span key={pi} className="text-xs px-2.5 py-1 rounded-lg font-mono font-medium" style={{ background: "var(--color-bg-subtle)", color: "var(--color-text-tertiary)" }}>
                                      {p}{cardIdx >= 0 ? " · #" + cardIdx : ""}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {warningDiagnoses.map((d: any, i: number) => (
                      <motion.div key={"warn-" + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 + 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="rounded-2xl p-5 border transition-all duration-200 hover:shadow-sm"
                        style={{ background: "linear-gradient(135deg, var(--color-semantic-warning) 0%, var(--color-bg-surface) 60%)", borderColor: "rgba(180,83,9,0.06)" }}>
                        <div className="flex items-start gap-3.5">
                          <span className="text-sm mt-0.5 shrink-0">⚠️</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold" style={{ color: "var(--color-semantic-warning-text)" }}>{d.title}</h4>
                            <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{d.detail}</p>
                            {d.action && <p className="text-sm font-bold mt-3" style={{ color: "var(--color-semantic-info-text)" }}>→ {d.action}</p>}
                            {d.reference && <p className="text-xs mt-2 font-mono" style={{ color: "var(--color-text-faint)" }}>{d.reference}</p>}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {opportunityDiagnoses.map((d: any, i: number) => (
                      <motion.div key={"opp-" + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 + 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="rounded-2xl p-5 border transition-all duration-200 hover:shadow-sm"
                        style={{ background: "linear-gradient(135deg, var(--color-semantic-success) 0%, var(--color-bg-surface) 60%)", borderColor: "rgba(5,150,105,0.06)" }}>
                        <div className="flex items-start gap-3.5">
                          <span className="text-sm mt-0.5 shrink-0">💡</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold" style={{ color: "var(--color-semantic-success-text)" }}>{d.title}</h4>
                            <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{d.detail}</p>
                            {d.action && <p className="text-sm font-bold mt-3" style={{ color: "var(--color-semantic-info-text)" }}>→ {d.action}</p>}
                            {d.impact && <p className="text-xs mt-2" style={{ color: "var(--color-semantic-success-text)", opacity: 0.7 }}>预期: {d.impact}</p>}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </Reveal>
            )}

            {/* Empty diagnosis state */}
            {diagnoses.length === 0 && evidenceCards.length === 0 && (
              <Reveal delay={0.3}>
                <div className="mb-6 md:mb-8 p-8 rounded-2xl border border-dashed text-center" style={{ borderColor: "var(--color-border-default)", background: "var(--color-bg-surface)" }}>
                  <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.06) 0%, rgba(14,165,233,0.04) 100%)" }}>
                    <Sparkles className="w-5 h-5 text-brand" />
                  </div>
                  <p className="text-sm text-secondary font-medium">AI 正在分析您的经营数据...</p>
                  <p className="text-xs text-tertiary mt-2">若持续未显示，请确认数据中包含价格和商品名称字段</p>
                </div>
              </Reveal>
            )}

            {/* ═══ Row 4: Actions + Cross-platform ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
              {actions.length > 0 && (
                <Reveal delay={0.25}>
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <h2 className="text-xl font-bold text-primary tracking-tight">行动建议</h2>
                      <span className="text-xs text-tertiary font-medium">{actions.length} 条</span>
                    </div>
                    <div className="space-y-2.5 max-h-[28rem] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                      {actions.map((act: any, ai: number) => (
                        <div key={ai} className="space-y-2.5">
                          <ActionCardView action={act} index={ai} />
                        </div>
                      ))}
                    </div>
                  </div>
                </Reveal>
              )}

              {hasMultiPlatform && (
                <Reveal delay={0.3}>
                  <CrossPlatformView
                    comparisons={crossPlatform}
                    coveredPlatforms={
                      crossPlatform.length > 0
                        ? Array.from(new Set(
                            crossPlatform.flatMap((c) => c.platformResults.map((p) => p.platform))
                          ))
                        : Array.from(new Set(allPlatforms))
                    }
                  />
                </Reveal>
              )}

              {!hasMultiPlatform && currentPlatform && (
                <Reveal delay={0.3}>
                  <div className="rounded-2xl p-5 border flex items-center gap-4" style={{ background: "linear-gradient(135deg, var(--color-semantic-info) 0%, var(--color-bg-surface) 100%)", borderColor: "var(--color-border-default)" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.08) 0%, rgba(14,165,233,0.05) 100%)" }}>
                      <Sparkles className="w-5 h-5 text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-secondary font-medium">当前仅{getPlatformLabel(currentPlatform)}平台数据</p>
                      <p className="text-xs text-tertiary mt-1">上传其他平台数据后将自动展示跨平台利润对比</p>
                    </div>
                    <Link href="/upload" className="text-xs font-bold text-brand hover:text-brand-dark transition-colors shrink-0 flex items-center gap-1">
                      上传更多 <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </Reveal>
              )}
            </div>

            {/* ═══ Row 4.5: Scenario Simulation ═══ */}
            {hasScenarios && (
              <Reveal delay={0.22}>
                <div className="mb-6 md:mb-8">
                  <ScenarioPanel scenarios={scenarios!} profitResults={(decisionChain as any)?.metrics?.profit || []} />
                </div>
              </Reveal>
            )}

            {/* Degraded mode banner */}
            {degradedResponse && decisionChain && (
              <Reveal delay={0.1}>
                <div className="mb-6 md:mb-8 rounded-xl p-4 border flex items-center gap-3" style={{ borderColor: "rgba(217,119,6,0.20)", background: "rgba(251,191,36,0.06)" }}>
                  <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(217,119,6,0.10)" }}>
                    <span className="text-sm">⚠️</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "#B45309" }}>
                    深度分析引擎暂不可用，以下为简化分析结果。部分高级功能（证据卡、利润测算、跨平台对比）可能受限。
                  </p>
                </div>
              </Reveal>
            )}

            {/* ═══ Row 4.6: Evidence Cards ═══ */}
            {evidenceCards.length > 0 && (
              <Reveal delay={0.2}>
                <div className="mb-6 md:mb-8">
                  <div className="flex items-center gap-3 mb-5">
                    <h2 className="text-xl font-bold text-primary tracking-tight">证据卡</h2>
                    <span className="text-xs text-tertiary font-medium">{evidenceCards.length} 张</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                    {evidenceCards.slice(0, 3).map((card: any, ci: number) => (
                      <EvidenceCardView key={ci} card={card} defaultExpanded={ci === 0} />
                    ))}
                  </div>
                  {evidenceCards.length > 3 && (
                    <p className="text-xs text-tertiary text-center mt-5 font-medium">
                      +{evidenceCards.length - 3} 张更多证据卡 · 切换到 Chat 查看全部
                    </p>
                  )}
                </div>
              </Reveal>
            )}

            {/* ═══ Row 5: AI Analysis ═══ */}
            {aiSummary && (
              <Reveal delay={0.35}>
                <div className="mb-6 md:mb-8 rounded-2xl p-6 md:p-8 border transition-all duration-200 hover:shadow-sm" style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-border-default)" }}>
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.08) 0%, rgba(14,165,233,0.05) 100%)" }}>
                      <Sparkles className="w-4 h-4 text-brand" />
                    </div>
                    <h2 className="text-xl font-bold text-primary tracking-tight">AI 综合分析</h2>
                    {(decisionChain as any)?.aiExplanation?.confidence !== undefined && (
                      <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{
                        background: (decisionChain as any).aiExplanation.confidence >= 0.8 ? "var(--color-semantic-success)" :
                          (decisionChain as any).aiExplanation.confidence >= 0.5 ? "var(--color-semantic-warning)" :
                          "var(--color-semantic-danger)",
                        color: (decisionChain as any).aiExplanation.confidence >= 0.8 ? "var(--color-semantic-success-text)" :
                          (decisionChain as any).aiExplanation.confidence >= 0.5 ? "var(--color-semantic-warning-text)" :
                          "var(--color-semantic-danger-text)",
                      }}>
                        置信度 {Math.round((decisionChain as any).aiExplanation.confidence * 100)}%
                      </span>
                    )}
                    <span className="text-xs text-tertiary ml-auto hidden sm:inline">
                      基于 {evidenceCards.length} 张证据卡 · {diagnoses.length} 条诊断 · {actions.length} 条建议
                    </span>
                  </div>
                  <div className="markdown-prose text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                      {aiSummary}
                    </ReactMarkdown>
                  </div>
                  {/* Execution verification bridge */}
                  {actions.length > 0 && (
                    <div className="mt-6 pt-5 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(15,15,18,0.38)" }}>
                        执行验证
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-tertiary)" }}>
                        以上为 AI 预测分析。实际执行效果请在下方「执行复盘」中追踪验证，或在上方「行动建议」中开始执行。
                      </p>
                    </div>
                  )}
                  {(decisionChain as any)?.meta && (
                    <div className="mt-6 pt-5 border-t flex flex-wrap items-center gap-5 text-xs font-medium" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-tertiary)" }}>
                      <span className="font-mono">行业: {(decisionChain as any).meta.industry?.name || "—"}</span>
                      {(decisionChain as any).meta.pipelineLatency !== undefined && (
                        <span className="font-mono">分析耗时: {((decisionChain as any).meta.pipelineLatency / 1000).toFixed(1)}s</span>
                      )}
                      {(decisionChain as any).meta.freshnessScore !== undefined && (
                        <span className="font-mono">知识时效: {Math.round((decisionChain as any).meta.freshnessScore)}%</span>
                      )}
                    </div>
                  )}
                </div>
              </Reveal>
            )}

            {/* Data limitation state */}
            {insufficientData && !decisionChain && (
              <Reveal delay={0.4}>
                <div className="mb-6 md:mb-8 rounded-2xl p-6 border" style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-border-default)" }}>
                  <p className="text-sm font-bold" style={{ color: "var(--color-semantic-warning-text)" }}>当前数据不足以生成完整经营决策</p>
                  <p className="text-sm mt-3 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{insufficientData.content}</p>
                  {insufficientData.limitations.length > 0 && (
                    <ul className="mt-5 space-y-2.5 list-disc pl-5">
                      {insufficientData.limitations.map((item: string) => (
                        <li key={item} className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </Reveal>
            )}

            {/* Pipeline error state */}
            {pipelineError && !decisionChain && (
              <Reveal delay={0.4}>
                <div className="mb-6 md:mb-8 rounded-2xl p-6 border" style={{ background: "var(--color-bg-surface)", borderColor: "rgba(220,38,38,0.08)" }}>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, rgba(220,38,38,0.06) 0%, rgba(254,202,202,0.4) 100%)" }}>
                      <span className="text-lg">⚠️</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: "var(--color-semantic-danger-text)" }}>AI 分析暂时不可用</p>
                      <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{pipelineError}</p>
                    </div>
                    <button
                      onClick={() => { /* TODO: retry */ }}
                      className="px-5 py-2 rounded-xl text-xs font-bold border transition-all hover:border-gray-300 hover:bg-white/60" style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-primary)" }}>
                      重试
                    </button>
                  </div>
                </div>
              </Reveal>
            )}

            {/* Pipeline loading state */}
            {agentLoading && !decisionChain && !insufficientData && !pipelineError && (
              <Reveal delay={0.4}>
                <div className="mb-6 md:mb-8 rounded-2xl p-6 border border-dashed flex items-center gap-4" style={{ borderColor: "var(--color-border-default)", background: "var(--color-bg-surface)" }}>
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-brand loading-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-brand loading-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-brand loading-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-sm text-secondary font-medium">AI 正在分析经营数据并生成诊断...</span>
                </div>
              </Reveal>
            )}

            {/* ═══ Row 6: Execution/Outcome Review Board ═══ */}
            {activeDatasetId && (
              <Reveal delay={0.1}>
                <div className="mb-10">
                  <LoopReviewBoard />
                </div>
              </Reveal>
            )}
          </div>
        </div>
      </ErrorBoundary>
    </RequireAuth>
  );
}

// ═══════════════════════════════════════════════
// Export with DataProvider wrapper
// ═══════════════════════════════════════════════

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <DataProvider userId={user?.id || ""}>
      <DashboardInner />
    </DataProvider>
  );
}
