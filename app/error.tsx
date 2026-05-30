"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[AI教学助手] 页面异常:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-6">
          <AlertTriangle className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">页面加载异常</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          很抱歉，当前页面发生了意外错误。这可能是网络波动或数据格式问题导致的，不会影响您的已保存内容。
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            重试
          </button>
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            返回首页
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 text-xs text-gray-400">错误 ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
