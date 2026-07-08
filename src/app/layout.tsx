import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { PageTransition } from "@/components/layout/page-transition";

export const metadata: Metadata = {
  title: "ProcureWise - 跨平台电商利润优化引擎",
  description: "上传淘宝/京东/拼多多/抖音的销售数据+进货成本，AI自动计算真实利润并告诉你下一步该采购什么。2026年四大平台费率引擎，抖音达人分级ROI计算。",
};

// ⭐ 移动端视口配置 — 没有这个手机浏览器会按桌面宽度渲染后缩放，导致卡顿
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

import { AnimatePresence } from "@/components/layout/animate-presence";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <head>
        {/* PWA manifest (also served as /site.webmanifest for Firefox/Android) */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366F1" />
        {/* Favicon — standard + high-DPI */}
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        {/* Apple Touch Icon — iOS Safari, Home Screen */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon-120x120.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png" />
        {/* Google Fonts 预连接 — 消除移动端 FOIT 白屏 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* 禁用缓存 — 确保部署后手机加载最新资源 */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        {/* iOS 全屏优化 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* 触摸优化 */}
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="min-h-screen bg-background text-white touch-manipulation">
        <Navbar />
        <AnimatePresence mode="wait">
          <PageTransition>
            <main className="pt-16">{children}</main>
          </PageTransition>
        </AnimatePresence>
      </body>
    </html>
  );
}
