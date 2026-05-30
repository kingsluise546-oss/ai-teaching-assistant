"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { ArrowLeft, Sparkles, Copy, Check, Heart, Wand2 } from "lucide-react";
import { saveItem, toggleFavorite, generateId, getSavedItems } from "@/lib/storage";
import { callAI } from "@/lib/ai";
import { generateQuestionsPrompt, optimizePrompt } from "@/lib/prompts";
import { detectStage, getAvailableTypes, Stage } from "@/lib/questionTypes";
import { getRegisteredTypes, isRuleRegistered } from "@/lib/questionRules";
import { parseOutputLite } from "@/lib/parser-browser";

/** 将 AI 输出解析为结构化 HTML */
function renderResult(raw: string): string {
  const items = parseOutputLite(raw);
  if (items.length === 0) {
    // 无 token → 整段作为原始文本渲染
    const ans = raw.split(/参考答案与解析|【参考答案/i)[1] || "";
    return ans ? `<pre style="white-space:pre-wrap;font-family:inherit;">${ans}</pre>` : "";
  }
  return items.map(item => {
    const ans = item.answer || "（未解析到答案）";
    const exp = item.analysis || "";
    return `<p><strong>${item.index}. 参考答案：</strong> ${ans}${exp ? `<br><strong>解析：</strong> ${exp}` : ""}</p>`;
  }).join("");
}

export default function GenerateQuestionsPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("语文");
  const [grade, setGrade] = useState("");
  const [topic, setTopic] = useState("");
  const [qtype, setQtype] = useState("");
  const [difficulty, setDifficulty] = useState("中等");
  const [count, setCount] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [showOptimize, setShowOptimize] = useState(false);

  // 路由系统：年级 → 学段 → 可选题型
  const stage: Stage | null = grade.trim() ? detectStage(grade.trim()) : null;
  const allTypes = stage ? getAvailableTypes(stage, subject as any) : [];
  const registeredTypes = stage ? getRegisteredTypes(stage, subject as any) : [];
  const availableTypes = qtype.trim()
    ? allTypes.filter(t => t.includes(qtype.trim()))
    : allTypes;
  const selectedTypeRegistered = qtype.trim() && stage ? isRuleRegistered(stage, subject as any, qtype.trim()) : true;
  const [optimizeInput, setOptimizeInput] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!grade.trim()) return;
    setGenerating(true);
    setError(null);

    try {
      const prompt = generateQuestionsPrompt({
        subject,
        grade: grade.trim(),
        topic: topic.trim(),
        type: qtype.trim(),
        difficulty,
        count,
      });
      const content = await callAI(prompt);
      setResult(content);
      setShowOptimize(false);
      setOptimizeInput("");

      const id = generateId();
      const title = topic.trim().slice(0, 20) || "练习题";
      saveItem({
        id,
        title: `${qtype || "练习题"}·${title}`,
        type: "试卷",
        typeColor: "bg-purple-50 text-purple-600",
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        favorited: false,
      });
      setLastId(id);
    } catch (e: any) {
      setError(e.message || "生成失败，请重试");
      setResult(null);
    }

    setGenerating(false);
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
    try {
      const prompt = optimizePrompt(result, optimizeInput.trim());
      const newResult = await callAI(prompt);
      setResult(newResult);
      const existing = getSavedItems().find((i) => i.id === lastId);
      if (existing) {
        saveItem({ ...existing, content: newResult, updatedAt: new Date().toISOString() });
      }
    } catch (e: any) {
      setError(e.message || "优化失败，请重试");
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

      <div className="card p-5 mb-6 space-y-4">
        {/* 第一行：年级 + 科目 + 难度 */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">年级</label>
            <input value={grade} onChange={(e) => { setGrade(e.target.value); setQtype(""); }} placeholder="如：七年级" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">科目</label>
            <select value={subject} onChange={(e) => { setSubject(e.target.value); setQtype(""); }} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400">
              <option>语文</option><option>数学</option><option>英语</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">难度</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400">
              <option>容易</option><option>中等</option><option>困难</option>
            </select>
          </div>
        </div>
        {/* 第二行：题型下拉 + 数量 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              题型 {stage && <span className="text-gray-400">（{allTypes.length}种）</span>}
            </label>
            <select value={qtype} onChange={(e) => setQtype(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400" disabled={!stage}>
              <option value="">{stage ? "请选择题型" : "请先输入年级"}</option>
              {allTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">生成数量（几套题？上限10套）</label>
            <input type="number" value={count} onChange={(e) => setCount(Math.min(10, Math.max(1, Number(e.target.value))))} min={1} max={10} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400" />
          </div>
        </div>
        {/* 第三行：知识点（选填） */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">知识点 <span className="text-gray-300">（选填）</span></label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="如：搭配不当、分数加减法" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400" />
        </div>
        {qtype && !selectedTypeRegistered && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            「{qtype}」规则暂未完成，生成质量可能不稳定。
          </div>
        )}
        <div className="pt-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={generating || !grade.trim()}
            className={`btn-primary flex items-center gap-2 text-sm ${generating || !grade.trim() ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Sparkles className="w-4 h-4" />
            {generating ? "生成中..." : "生成题目"}
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-4 mb-6 border-red-100 bg-red-50">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

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
            <ReactMarkdown remarkPlugins={[remarkBreaks]}>{(result || "").split(/参考答案与解析|【参考答案/i)[0].replace(/\n---\s*\*{0,2}\s*$/g, "").trim()}</ReactMarkdown>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100"
                 dangerouslySetInnerHTML={{ __html: renderResult(result || "") }} />
          </div>
        </div>
      )}
    </div>
  );
}
