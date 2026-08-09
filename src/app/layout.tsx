import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";

export const metadata: Metadata = {
  title: "ProcureWise - 跨平台电商利润优化引擎",
  description: "上传淘宝/京东/拼多多/抖音的销售数据+进货成本，AI自动计算真实利润并告诉你下一步该采购什么。2026年四大平台费率引擎，抖音达人分级ROI计算。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/lib/auth-context";
import { ErrorBoundary } from "@/components/error-boundary";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366F1" />
        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon-120x120.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png" />
        {/* Preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Cache control */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        {/* iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        {/* Global error reporting */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__ERROR_BOUNDARY__ = [];
              window.onerror = function(msg, url, line, col, err) {
                window.__ERROR_BOUNDARY__.push({
                  type: 'runtime',
                  message: msg,
                  url: url,
                  line: line,
                  col: col,
                  stack: err ? err.stack : null,
                  ts: Date.now()
                });
              };
              window.addEventListener('unhandledrejection', function(e) {
                window.__ERROR_BOUNDARY__.push({
                  type: 'unhandled_rejection',
                  message: e.reason ? (e.reason.message || String(e.reason)) : 'unknown',
                  stack: e.reason ? e.reason.stack : null,
                  ts: Date.now()
                });
              });
            `,
          }}
        />
      </head>
      <body className="min-h-screen text-primary antialiased touch-manipulation">
        <AuthProvider>
          <ErrorBoundary>
            <Navbar />
            <AppShell>{children}</AppShell>
          </ErrorBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
