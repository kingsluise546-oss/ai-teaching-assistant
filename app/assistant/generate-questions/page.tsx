"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Sparkles, Copy, Check, Heart, Wand2 } from "lucide-react";
import { saveItem, toggleFavorite, generateId, getSavedItems } from "@/lib/storage";

export default function GenerateQuestionsPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [showOptimize, setShowOptimize] = useState(false);
  const [optimizeInput, setOptimizeInput] = useState("");
  const [optimizing, setOptimizing] = useState(false);

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setGenerating(true);

    await new Promise((r) => setTimeout(r, 1500));

    const mockResult = `## 基础巩固
1. 下列词语中加点字的读音全部正确的一项是（  ）
   A. 示例（A）
   B. 示例（B）
   C. 示例（C）
   D. 示例（D）

2. 填空：本文的作者是_____，文章主要描写了_____的景色。

## 能力提升
1. 阅读下面的段落，回答问题：
   （段落内容略）
   （1）这段话运用了什么修辞手法？
   （2）这样写有什么表达效果？

2. 简答：结合课文内容，说说作者是如何表达情感的？

## 拓展挑战
1. 仿照课文的写法，选择你熟悉的一处风景，写一段150字左右的文字。
2. 课外查阅相关资料，谈谈你对课文主题的理解。`;

    setResult(mockResult);
    setShowOptimize(false);
    setOptimizeInput("");
    setGenerating(false);

    const id = generateId();
    const title = input.trim().slice(0, 30) || "练习题";
    saveItem({
      id,
      title: `练习题·${title}`,
      type: "试卷",
      typeColor: "bg-purple-50 text-purple-600",
      content: mockResult,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      favorited: false,
    });
    setLastId(id);
  };

  const handleFavorite = () => {
    if (!lastId) return;
    toggleFavorite(lastId);
    setFavorited(!favorited);
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOptimize = async () => {
    if (!result || !optimizeInput.trim() || !lastId) return;
    setOptimizing(true);
    await new Promise((r) => setTimeout(r, 1500));
    const newResult = result + `\n\n（已根据要求优化：${optimizeInput}）\n优化后的内容将在接入 AI API 后生成。`;
    setResult(newResult);
    const existing = getSavedItems().find((i) => i.id === lastId);
    if (existing) {
      saveItem({ ...existing, content: newResult, updatedAt: new Date().toISOString() });
    }
    setShowOptimize(false);
    setOptimizeInput("");
    setOptimizing(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-8 py-8">
      <button
        onClick={() => router.push("/assistant")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        返回核心技能
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">出题助手</h1>
        <p className="text-gray-400 text-sm mt-1">
          选择知识点范围，AI 生成基础、提升、拓展三层练习题
        </p>
      </div>

      <div className="card p-5 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          知识点范围与要求
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={generating}
          placeholder="例如：六年级语文第一单元，重点考查字词和阅读理解"
          className="w-full min-h-[100px] resize-none text-sm text-gray-800 placeholder-gray-300 outline-none leading-relaxed"
          style={{ border: "none", background: "transparent" }}
        />
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-300">
            {input.length > 0 ? `${input.length} 字` : "支持中英文输入"}
          </span>
          <button
            onClick={handleGenerate}
            disabled={generating || !input.trim()}
            className={`btn-primary flex items-center gap-2 text-sm ${
              generating || !input.trim()
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {generating ? "生成中..." : "开始生成"}
          </button>
        </div>
      </div>

      {generating && (
        <div className="card p-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="dot-pulse flex gap-1.5">
              <span />
              <span />
              <span />
            </div>
            <span className="text-sm text-indigo-600">正在生成题目...</span>
          </div>
        </div>
      )}

      {result && !generating && (
        <div className="card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">生成结果</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowOptimize(!showOptimize)}
                className={`btn-ghost flex items-center gap-1.5 text-xs ${showOptimize ? "text-indigo-500" : ""}`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                继续优化
              </button>
              <button
                onClick={handleFavorite}
                className={`btn-ghost flex items-center gap-1.5 text-xs ${favorited ? "text-red-400" : ""}`}
              >
                <Heart className={`w-3.5 h-3.5 ${favorited ? "fill-current" : ""}`} />
                {favorited ? "已收藏" : "收藏"}
              </button>
              <button
                onClick={handleCopy}
                className="btn-ghost flex items-center gap-1.5 text-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-green-500">已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    一键复制
                  </>
                )}
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
                placeholder="例如：增加两道应用题，降低选择题难度"
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
          <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
            {result}
          </div>
        </div>
      )}
    </div>
  );
}
