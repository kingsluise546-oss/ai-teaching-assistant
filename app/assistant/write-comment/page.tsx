"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Sparkles, Copy, Check, Heart, Wand2 } from "lucide-react";
import { saveItem, toggleFavorite, generateId, getSavedItems } from "@/lib/storage";
import { callAI } from "@/lib/ai";
import { writeCommentPrompt, optimizePrompt } from "@/lib/prompts";

const PROFILES = ["优秀型", "进步型", "潜力型", "内向型", "活跃型", "待提升型"];
const GRADES = ["小学", "初中", "高中"];
const LENGTHS = ["简短版（50字）", "标准版（100字）", "详细版（150字）"];
const STYLES = ["鼓励型", "正式型", "温暖型", "班主任型"];

export default function WriteCommentPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [grade, setGrade] = useState("初中");
  const [profiles, setProfiles] = useState<string[]>(["进步型"]);
  const [length, setLength] = useState("标准版（100字）");
  const [style, setStyle] = useState("鼓励型");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [showOptimize, setShowOptimize] = useState(false);
  const [optimizeInput, setOptimizeInput] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [previousComments, setPreviousComments] = useState<string[]>([]);

  const toggleProfile = (p: string) => {
    setProfiles((prev) => prev.includes(p) ? prev.filter((k) => k !== p) : [...prev, p]);
  };

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setGenerating(true);
    try {
      const prompt = writeCommentPrompt({ names: input, grade, profiles, length, style, previous: previousComments });
      const content = await callAI(prompt);
      setResult(content);
      setPreviousComments((prev) => [...prev, content]);
      setShowOptimize(false);
      setOptimizeInput("");
      const id = generateId();
      const names = input.trim().split("\n").filter(Boolean);
      saveItem({ id, title: `评语·${names.length}人`, type: "评语", typeColor: "bg-green-50 text-green-600", content, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), favorited: false });
      setLastId(id);
    } catch (e: any) { setResult(null); }
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
      if (existing) saveItem({ ...existing, content: newResult, updatedAt: new Date().toISOString() });
    } catch {}
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
        <h1 className="text-xl font-semibold text-gray-900">评语助手</h1>
        <p className="text-gray-400 text-sm mt-1">
          导入学生名单并选择关键词，AI 生成个性化的期末评语
        </p>
      </div>

      <div className="card p-5 mb-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            学生名单
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={generating}
            placeholder="输入学生姓名，每行一个&#10;&#10;例如：&#10;张三&#10;李四&#10;王五"
            className="w-full min-h-[100px] resize-none text-sm text-gray-800 placeholder-gray-300 outline-none leading-relaxed"
            style={{ border: "none", background: "transparent" }}
          />
        </div>

        <div className="border-t border-gray-100" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">年级</label>
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">评语长度</label>
            <select value={length} onChange={(e) => setLength(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {LENGTHS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">学生画像</label>
          <div className="flex flex-wrap gap-2">
            {PROFILES.map(p => (
              <button key={p} onClick={() => toggleProfile(p)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${profiles.includes(p) ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "border-gray-200 text-gray-500"}`}>{p}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">评语风格</label>
          <div className="flex flex-wrap gap-2">
            {STYLES.map(s => (
              <button key={s} onClick={() => setStyle(s)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${style === s ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "border-gray-200 text-gray-500"}`}>{s}</button>
            ))}
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-gray-100">
          <span className="text-xs text-gray-300">
            {input.split("\n").filter(Boolean).length} 名学生 · {profiles.length} 个画像
            {previousComments.length > 0 ? ` · 已生成${previousComments.length}批` : ""}
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
            <span className="text-sm text-indigo-600">正在生成评语...</span>
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
                placeholder="例如：语气更亲切一些，多关注学生的品德发展"
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
