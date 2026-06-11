"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { MessageSquare, Upload, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { getApiBase } from "@/lib/api";
import { ChatPanel } from "@/components/ai/chat-panel";
import type { ChatMessage } from "@/types";


function buildChatContext(dataset: any): string {
  let ctx = `???: ${dataset.fileName || dataset.original_name || "??"}\n`;
  ctx += `? ${dataset.rowCount} ???, ${dataset.columns.length} ???\n`;
  ctx += `??: ${dataset.columns.join(", ")}\n\n`;
  if (dataset.summary) {
    ctx += `??: ${dataset.summary}\n`;
  }
  return ctx;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [checking, setChecking] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    checkData();
  }, []);

  const checkData = () => {
    try {
      const stored = localStorage.getItem("currentDataset");
      if (stored) {
        const data = JSON.parse(stored);
        if (data && data.columns) {
          setHasData(true);
          if (!loadedRef.current) {
            loadedRef.current = true;
            const dsName = data.fileName || "??";
            setMessages([{ role: "assistant", content: "????????? **" + dsName + "**?" + data.rowCount + " ? x " + data.columns.length + " ???\n\n??????????????" }]);
          }
        }
      }
    } catch {} finally { setChecking(false); }
  };
  const handleSend = async (content: string) => {
    const userMsg: ChatMessage = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const apiBase = getApiBase();
      const stored = localStorage.getItem("currentDataset");
      let dataContext = "";
      if (stored) {
        const dataset = JSON.parse(stored);
        dataContext = "???: " + (dataset.fileName || "??") + "\n? " + dataset.rowCount + " ?, " + dataset.columns.length + " ??\n??: " + dataset.columns.join(", ") + "\n";
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
  if (checking) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="h-8 w-48 skeleton rounded-lg mb-2" />
          <div className="h-[60vh] glass mt-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent-cyan/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-accent-cyan" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                <span className="gradient-text">AI 对话</span>
              </h1>
              <p className="text-sm text-white/40">基于数据集的自然语言交互</p>
            </div>
          </div>
        </motion.div>

        {!hasData ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto rounded-2xl bg-accent-cyan/10 flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 text-accent-cyan/50" />
            </div>
            <h2 className="text-2xl font-bold mb-3">暂无数据可对话</h2>
            <p className="text-white/40 mb-8">请先上传数据，AI 才能基于数据回答你的问题</p>
            <Link href="/upload">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent-purple text-white font-semibold text-lg shadow-lg shadow-primary/25"
              >
                <Upload className="w-5 h-5" />
                上传数据
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
          </motion.div>
        ) : (
          <GlassCard className="p-4">
            <ChatPanel messages={messages} onSend={handleSend} loading={loading} />
          </GlassCard>
        )}
      </div>
    </div>
  );
}
