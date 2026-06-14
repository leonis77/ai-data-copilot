"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(function() {
    console.error("[App Error]", error.message, error.digest || "");
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B0F17" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md px-6"
      >
        <div className="w-20 h-20 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-red-400/70" />
        </div>
        <h2 className="text-2xl font-bold mb-3 text-white/80">{"\u51fa\u9519\u4e86"}</h2>
        <p className="text-white/30 mb-2 text-sm leading-relaxed">
          {"\u9875\u9762\u52a0\u8f7d\u65f6\u53d1\u751f\u4e86\u610f\u5916\u9519\u8bef"}
        </p>
        {error.digest && (
          <p className="text-white/10 text-xs mb-8 font-mono">ID: {error.digest}</p>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium text-sm shadow-lg shadow-indigo-500/25"
          >
            <RefreshCw className="w-4 h-4" />
            {"\u91cd\u8bd5"}
          </motion.button>
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white/70 font-medium text-sm transition-colors"
              style={{ backdropFilter: "blur(12px)", background: "rgba(17,24,39,0.5)" }}
            >
              <Home className="w-4 h-4" />
              {"\u8fd4\u56de\u9996\u9875"}
            </motion.button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
