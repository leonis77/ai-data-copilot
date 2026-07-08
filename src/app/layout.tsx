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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <head>
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
        <PageTransition>
          <main className="pt-16">{children}</main>
        </PageTransition>
      </body>
    </html>
  );
}
