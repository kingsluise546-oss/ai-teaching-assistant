"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Sparkles, Copy, Check, Heart, Wand2 } from "lucide-react";
import { saveItem, toggleFavorite, generateId, getSavedItems } from "@/lib/storage";
import { callAI } from "@/lib/ai";
import { generateNoticePrompt, optimizePrompt } from "@/lib/prompts";

const scenarios = [
  { id: "holiday", label: "放假通知", desc: "节假日放假安排通知" },
  { id: "meeting", label: "家长会通知", desc: "召开家长会的通知" },
  { id: "activity", label: "活动通知", desc: "学校活动或比赛通知" },
  { id: "homework", label: "作业提醒", desc: "布置或催交作业" },
  { id: "custom", label: "自定义", desc: "自由输入场景" },
];

export default function GenerateNoticePage() {
  const router = useRouter();
  const [selectedScenario, setSelectedScenario] = useState<string>("");
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
    try {
      const prompt = generateNoticePrompt({ scenario: selectedScenario, details: input });
      const content = await callAI(prompt);
      setResult(content);
      setShowOptimize(false);
      setOptimizeInput("");
      const id = generateId();
      const scenario = scenarios.find((s) => s.id === selectedScenario);
      saveItem({ id, title: `通知·${scenario?.label || ""}`, type: "通知", typeColor: "bg-orange-50 text-orange-600", content, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), favorited: false });
      setLastId(id);
    } catch {}
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
        <h1 className="text-xl font-semibold text-gray-900">通知模板生成</h1>
        <p className="text-gray-400 text-sm mt-1">
          选择场景并填写关键信息，AI 生成得体的通知文字，可直接复制发送
        </p>
      </div>

      <div className="card p-5 mb-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            通知场景
          </label>
          <div className="grid grid-cols-3 gap-3">
            {scenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedScenario(s.id)}
                disabled={generating}
                className={`text-left p-3 rounded-xl border transition-colors ${
                  selectedScenario === s.id
                    ? "bg-indigo-50 border-indigo-200"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className={`text-xs font-medium ${
                  selectedScenario === s.id ? "text-indigo-600" : "text-gray-700"
                }`}>
                  {s.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100" />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            通知关键信息
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={generating}
            placeholder="填写关键信息，如时间、地点、事项等&#10;&#10;例如：&#10;国庆节放假安排&#10;放假时间：10月1日-10月7日&#10;返校时间：10月8日"
            className="w-full min-h-[100px] resize-none text-sm text-gray-800 placeholder-gray-300 outline-none leading-relaxed"
            style={{ border: "none", background: "transparent" }}
          />
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-gray-100">
          <span className="text-xs text-gray-300">
            {selectedScenario
              ? `已选场景：${scenarios.find((s) => s.id === selectedScenario)?.label}`
              : "请选择场景"}
          </span>
          <button
            onClick={handleGenerate}
            disabled={generating || !input.trim() || !selectedScenario}
            className={`btn-primary flex items-center gap-2 text-sm ${
              generating || !input.trim() || !selectedScenario
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
            <span className="text-sm text-indigo-600">正在生成通知...</span>
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
                placeholder="例如：语气更正式一些，增加安全注意事项的详细描述"
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
