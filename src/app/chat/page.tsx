"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { MessageSquare, Upload, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { ChatPanel } from "@/components/ai/chat-panel";
import type { ChatMessage } from "@/types";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [checking, setChecking] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    checkData();
  }, []);

  const checkData = async () => {
    try {
      const res = await fetch("/api/upload?latest=true");
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          setHasData(true);
          if (!loadedRef.current) {
            loadedRef.current = true;
            setMessages([
              {
                role: "assistant",
                content: `你好！我已加载了数据集 **${data.original_name || data.name}**（${data.row_count} 行 x ${Array.isArray(data.columns) ? data.columns.length : 0} 列）。\n\n你可以直接问我关于这些数据的问题，例如：\n- 哪些商品销量最好？\n- 数据中有什么异常？\n- 帮我分析一下趋势`,
              },
            ]);
          }
        }
      }
    } catch {
      // empty
    } finally {
      setChecking(false);
    }
  };

  const handleSend = async (content: string) => {
    const userMsg: ChatMessage = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      if (!res.ok) throw new Error("请求失败");

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "抱歉，AI 服务暂时不可用，请稍后重试。" },
      ]);
    } finally {
      setLoading(false);
    }
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
