"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Copy,
  Check,
  Heart,
  Wand2,
} from "lucide-react";
import { getSavedItems, deleteItem, toggleFavorite, saveItem, type SavedItem } from "@/lib/storage";

function ContentRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [item, setItem] = useState<SavedItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [showOptimize, setShowOptimize] = useState(false);
  const [optimizeInput, setOptimizeInput] = useState("");
  const [optimizing, setOptimizing] = useState(false);

  const reloadItem = () => {
    const id = searchParams.get("id");
    if (!id) return;
    const items = getSavedItems();
    const found = items.find((i) => i.id === id);
    if (found) setItem(found);
  };

  useEffect(() => {
    reloadItem();
  }, [searchParams]);

  const handleFavorite = () => {
    if (!item) return;
    toggleFavorite(item.id);
    reloadItem();
  };

  const handleOptimize = async () => {
    if (!item || !optimizeInput.trim()) return;
    setOptimizing(true);
    await new Promise((r) => setTimeout(r, 1500));
    const newContent = item.content + `\n\n（已根据要求优化：${optimizeInput}）\n优化后的内容将在接入 AI API 后生成。`;
    saveItem({ ...item, content: newContent, updatedAt: new Date().toISOString() });
    reloadItem();
    setShowOptimize(false);
    setOptimizeInput("");
    setOptimizing(false);
  };

  const handleCopy = async () => {
    if (!item) return;
    await navigator.clipboard.writeText(item.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    if (!item) return;
    deleteItem(item.id);
    router.push("/workspace");
  };

  if (!item) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <div className="card p-10 text-center">
          <p className="text-sm text-gray-300">未找到该内容</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>

        <div className="text-center">
          <h1 className="text-lg font-semibold text-gray-900">{item.title}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{item.type}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOptimize(!showOptimize)}
            className={`btn-ghost text-sm flex items-center gap-1.5 py-2 px-3 ${showOptimize ? "text-indigo-500" : ""}`}
          >
            <Wand2 className="w-4 h-4" />
            继续优化
          </button>
          <button
            onClick={handleFavorite}
            className={`btn-ghost text-sm flex items-center gap-1.5 py-2 px-3 ${item.favorited ? "text-red-400" : ""}`}
          >
            <Heart className={`w-4 h-4 ${item.favorited ? "fill-current" : ""}`} />
            {item.favorited ? "已收藏" : "收藏"}
          </button>
          <button
            onClick={handleCopy}
            className="btn-outline text-sm flex items-center gap-1.5 py-2 px-4"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                已复制
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                复制
              </>
            )}
          </button>
          <button
            onClick={handleDelete}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors py-2 px-3"
          >
            删除
          </button>
        </div>
      </div>

      {showOptimize && (
        <div className="mb-4 p-4 bg-indigo-50 rounded-lg">
          <label className="block text-xs font-medium text-indigo-700 mb-2">
            输入优化要求
          </label>
          <textarea
            value={optimizeInput}
            onChange={(e) => setOptimizeInput(e.target.value)}
            placeholder="例如：增加内容，调整风格"
            className="w-full min-h-[80px] resize-none text-sm text-gray-800 placeholder-gray-400 outline-none bg-white rounded-lg p-3 border border-indigo-200 focus:border-indigo-400"
          />
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              onClick={() => { setShowOptimize(false); setOptimizeInput(""); }}
              className="btn-ghost text-xs"
            >
              取消
            </button>
            <button
              onClick={handleOptimize}
              disabled={optimizing || !optimizeInput.trim()}
              className={`btn-primary text-xs flex items-center gap-1.5 py-1.5 px-4 ${optimizing || !optimizeInput.trim() ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Wand2 className="w-3 h-3" />
              {optimizing ? "优化中..." : "提交优化"}
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="card p-6">
        <ContentRenderer content={item.content} />
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="max-w-3xl mx-auto px-8 py-8">
        <div className="card p-10 text-center">
          <p className="text-sm text-gray-300">加载中...</p>
        </div>
      </div>
    }>
      <ResultContent />
    </Suspense>
  );
}
