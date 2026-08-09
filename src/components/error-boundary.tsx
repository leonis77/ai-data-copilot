"use client";

import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: { componentStack: string }) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  info: { componentStack: string } | null;
}

/**
 * Error Boundary — 捕获子组件树的渲染错误，防止整页崩溃。
 *
 * 在开发/生产环境均生效：
 * - 记录 error + componentStack 到控制台
 * - 可选回调 onError 用于上报到日志服务
 * - 降级渲染 fallback UI（默认显示错误提示 + 刷新按钮）
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary] Caught rendering error:", error, info);
    this.setState({ info });
    if (this.props.onError) {
      this.props.onError(error, info);
    }
  }

  handleReset = function (this: ErrorBoundary) {
    this.setState({ hasError: false, error: null, info: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 flex items-center justify-center mb-6">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">页面出现错误</h2>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              {this.state.error?.message || "未知错误"}
            </p>
            {this.state.info?.componentStack && (
              <details className="text-left text-xs text-gray-400 bg-gray-50 rounded-lg p-3 mb-6 max-h-40 overflow-auto">
                <summary className="cursor-pointer font-medium text-gray-600 mb-2">组件堆栈</summary>
                <pre className="whitespace-pre-wrap break-all">{this.state.info.componentStack}</pre>
              </details>
            )}
            <button
              onClick={this.handleReset}
              className="btn-primary px-6 py-2.5 rounded-xl text-sm"
            >
              重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
