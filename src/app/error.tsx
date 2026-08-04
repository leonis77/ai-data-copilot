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
    <div className="min-h-screen flex items-center justify-center bg-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center max-w-md px-6"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-20 h-20 mx-auto rounded-2xl bg-red-50 flex items-center justify-center mb-6 border border-red-100"
        >
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </motion.div>
        <h2 className="text-title mb-3 text-primary">{"出错了"}</h2>
        <p className="text-body mb-2">
          {"页面加载时发生了意外错误"}
        </p>
        {error.digest && (
          <p className="text-caption mb-8 font-mono">ID: {error.digest}</p>
        )}
        {!error.digest && <div className="mb-8" />}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            onClick={reset}
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl"
          >
            <RefreshCw className="w-4 h-4" />
            {"重试"}
          </motion.button>
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-secondary hover:text-primary hover:border-brand/30 hover:bg-blue-50 font-medium text-sm transition-all duration-200"
            >
              <Home className="w-4 h-4" />
              {"返回首页"}
            </motion.button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

