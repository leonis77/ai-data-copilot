"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Brain, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";

interface AIInsightPanelProps {
  analysis: any;
  loading: boolean;
  onRegenerate?: () => void;
}

function TypewriterText({ text, speed = 30 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    indexRef.current = 0;

    if (!text) { setDone(true); return; }

    const timer = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayed(text.substring(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        setDone(true);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }} className="inline-block w-1.5 h-4 bg-indigo-400 ml-0.5 rounded-sm align-middle" />}
    </span>
  );
}

export function AIInsightPanel({ analysis, loading, onRegenerate }: AIInsightPanelProps) {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden rounded-2xl p-8 border border-white/[0.06]"
        style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", background: "rgba(17,24,39,0.5)" }}
      >
        <div className="absolute inset-0 opacity-30"
          style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.15) 0%, transparent 70%)" }}
        />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-2 border-indigo-400/20 border-t-indigo-400"
          />
          <p className="text-sm text-white/40">AI ????????...</p>
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                transition={{ delay: i * 0.2, duration: 1.2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-indigo-400"
              />
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  if (!analysis) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* AI Summary with typewriter */}
      {analysis.summary && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative overflow-hidden rounded-2xl p-6 border border-indigo-500/10"
          style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", background: "rgba(17,24,39,0.5)" }}
        >
          <div className="absolute inset-0 opacity-20"
            style={{ background: "radial-gradient(ellipse at 0% 0%, rgba(99,102,241,0.2) 0%, transparent 50%)" }}
          />
          <div className="relative z-10 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-indigo-400/60 uppercase tracking-wider mb-2">AI ????</p>
              <p className="text-sm text-white/70 leading-relaxed">
                <TypewriterText text={analysis.summary} speed={25} />
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Key Findings */}
      {analysis.insights && analysis.insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          {analysis.insights.map((insight: string, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              className="flex items-start gap-3 p-4 rounded-xl border border-white/[0.05]"
              style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", background: "rgba(17,24,39,0.4)" }}
            >
              <div className="w-6 h-6 rounded-md bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Lightbulb className="w-3 h-3 text-indigo-400" />
              </div>
              <p className="text-xs text-white/60 leading-relaxed">{insight}</p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Risks */}
      {analysis.risks && analysis.risks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-2"
        >
          <p className="text-xs text-white/20 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> ????
          </p>
          {analysis.risks.map((risk: string, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/10 bg-amber-500/[0.03]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 shrink-0" />
              <span className="text-xs text-amber-300/70">{risk}</span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
