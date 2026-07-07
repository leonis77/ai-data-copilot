import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { PageTransition } from "@/components/layout/page-transition";

export const metadata: Metadata = {
  title: "ProcureWise - 跨平台电商利润优化引擎",
  description: "上传淘宝/京东/拼多多/抖音的销售数据+进货成本，AI自动计算真实利润并告诉你下一步该采购什么。2026年四大平台费率引擎，抖音达人分级ROI计算。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen bg-background text-white">
        <Navbar />
        <PageTransition>
          <main className="pt-16">{children}</main>
        </PageTransition>
      </body>
    </html>
  );
}
