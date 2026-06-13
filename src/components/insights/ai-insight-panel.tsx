"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, Brain, AlertTriangle, Lightbulb, CheckCircle } from "lucide-react";

interface AIInsightPanelProps {
  analysis: any;
  loading: boolean;
  onRegenerate?: () => void;
}

function TypewriterText({ text, speed = 30 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const idx = useRef(0);

  useEffect(() => {
    setDisplayed(""); setDone(false); idx.current = 0;
    if (!text) { setDone(true); return; }
    const timer = setInterval(() => {
      if (idx.current < text.length) {
        setDisplayed(text.substring(0, idx.current + 1)); idx.current++;
      } else { setDone(true); clearInterval(timer); }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
        className="inline-block w-1.5 h-4 bg-indigo-400 ml-0.5 rounded-sm align-middle" />}
    </span>
  );
}

export function AIInsightPanel({ analysis, loading, onRegenerate }: AIInsightPanelProps) {
  const [thinkingStep, setThinkingStep] = useState(0);

  useEffect(() => {
    if (!loading) { setThinkingStep(0); return; }
    const steps = ["\u5206\u6790\u5e93\u5b58", "\u5206\u6790\u9500\u91cf", "\u8bc6\u522b\u98ce\u9669", "\u751f\u6210\u5efa\u8bae"];
    const timer = setInterval(() => {
      setThinkingStep(prev => {
        if (prev >= steps.length) { clearInterval(timer); return prev; }
        return prev + 1;
      });
    }, 800);
    return () => clearInterval(timer);
  }, [loading]);

  if (loading) {
    const steps = ["\u5206\u6790\u5e93\u5b58", "\u5206\u6790\u9500\u91cf", "\u8bc6\u522b\u98ce\u9669", "\u751f\u6210\u5efa\u8bae"];
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="relative overflow-hidden rounded-2xl p-8 border border-indigo-500/10"
        style={{ backdropFilter: "blur(20px)", background: "radial-gradient(circle at 50% 50%, rgba(124,92,255,0.08), transparent 60%), rgba(17,24,39,0.5)" }}>
        <div className="flex flex-col items-center gap-6">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-14 h-14 rounded-full border-2 border-indigo-400/20 border-t-indigo-400" />
          <p className="text-sm text-indigo-400/80 font-medium">[ AI Thinking... ]</p>
          <div className="space-y-2 w-full max-w-xs">
            {steps.map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={i < thinkingStep ? { opacity: 1, x: 0 } : { opacity: 0.2 }}
                transition={{ delay: i * 0.15 }} className="flex items-center gap-2 px-4 py-2 rounded-lg">
                <CheckCircle className={`w-4 h-4 ${i < thinkingStep ? "text-emerald-400" : "text-white/20"}`} />
                <span className={`text-sm ${i < thinkingStep ? "text-white/60" : "text-white/20"}`}>{step}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  if (!analysis) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-4">
      {analysis.summary && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="relative overflow-hidden rounded-2xl p-6 border border-indigo-500/10"
          style={{ backdropFilter: "blur(20px)", background: "radial-gradient(ellipse at 0% 0%, rgba(124,92,255,0.1), transparent 50%), rgba(17,24,39,0.5)" }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-indigo-400/60 uppercase tracking-wider mb-2">AI {"\u6838\u5fc3\u6d1e\u5bdf"}</p>
              <p className="text-sm text-white/70 leading-relaxed"><TypewriterText text={analysis.summary} speed={25} /></p>
            </div>
          </div>
        </motion.div>
      )}

      {analysis.insights && analysis.insights.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {analysis.insights.map((insight: string, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }} whileHover={{ scale: 1.02, borderColor: "#7C5CFF", transition: { duration: 0.15 } }}
              className="flex items-start gap-3 p-4 rounded-xl border border-white/[0.05]"
              style={{ backdropFilter: "blur(12px)", background: "rgba(17,24,39,0.4)" }}>
              <div className="w-6 h-6 rounded-md bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Lightbulb className="w-3 h-3 text-indigo-400" />
              </div>
              <p className="text-xs text-white/60 leading-relaxed">{insight}</p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {analysis.risks && analysis.risks.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-2">
          <p className="text-xs text-white/20 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> {"\u98ce\u9669\u63d0\u793a"}
          </p>
          {analysis.risks.map((risk: string, i: number) => (
            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.1 }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/10 bg-amber-500/[0.03]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 shrink-0" />
              <span className="text-xs text-amber-300/70">{risk}</span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
