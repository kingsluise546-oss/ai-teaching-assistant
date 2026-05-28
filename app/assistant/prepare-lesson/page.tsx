"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Copy, Check, Heart, Wand2 } from "lucide-react";
import { saveItem, toggleFavorite, generateId, getSavedItems } from "@/lib/storage";

export default function PrepareLessonPage() {
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

    const mockResult = `## 教学目标
- 学生能够理解课文中比喻、拟人等修辞手法的运用，并能在写作中模仿使用。
- 能有感情地朗读全文，感受作者笔下的意境之美。
- 培养学生热爱祖国语言文字的情感。

## 教学流程
1. **导入新课（5分钟）**：展示相关图片，引导学生谈谈对课题的第一印象，激发学习兴趣。
2. **初读课文（10分钟）**：学生自由朗读，圈画生字词，初步感知课文内容与情感基调。
3. **精读分析（15分钟）**：重点赏析关键词句，分析修辞手法的表达效果，体会语言之美。
4. **课堂练习（10分钟）**：仿照课文写一段描写，运用本课学到的修辞手法。
5. **小结作业（5分钟）**：总结本课重点，布置课后作业。

## 课堂提问
- 【基础】课文主要描写了哪些内容？请用自己的话说一说。
- 【理解】作者运用了哪些修辞手法？这样写有什么好处？
- 【应用】如果你是作者，你会用什么词语来描述你的感受？`;

    setResult(mockResult);
    setShowOptimize(false);
    setOptimizeInput("");
    setGenerating(false);

    const id = generateId();
    const title = input.trim().slice(0, 30) || "备课教案";
    saveItem({
      id,
      title: `备课教案·${title}`,
      type: "教案",
      typeColor: "bg-blue-50 text-blue-600",
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
        <h1 className="text-xl font-semibold text-gray-900">备课助手</h1>
        <p className="text-gray-400 text-sm mt-1">
          输入课题名称，AI 帮你生成教案初稿和课堂提问链
        </p>
      </div>

      <div className="card p-5 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          课题名称
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={generating}
          placeholder="例如：六年级语文《草原》第二课时"
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
            <span className="text-sm text-indigo-600">正在生成教案...</span>
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
                placeholder="例如：增加两个课堂互动环节，多加入一些生活实例"
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
          <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
            {result}
          </div>
        </div>
      )}
    </div>
  );
}
