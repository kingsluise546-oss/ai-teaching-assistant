"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Copy, Check, Heart, Shrink, MessageCircle } from "lucide-react";

import { saveItem, toggleFavorite, generateId, getSavedItems } from "@/lib/storage";
import { callAI } from "@/lib/ai";
import { generateNoticePrompt } from "@/lib/prompts";

const TYPES = ["家长会", "考试安排", "活动通知", "放假通知", "作业提醒", "自定义"];
const AUDIENCES = ["家长", "学生", "教师"];

export default function GenerateNoticePage() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [audience, setAudience] = useState("家长");
  const [points, setPoints] = useState("");
  const [ntype, setNtype] = useState("自定义");
  const [wordLimit, setWordLimit] = useState(80);
  const [action, setAction] = useState<"generate" | "condense" | "colloquial">("generate");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);

  const handleAction = async (act: "generate" | "condense" | "colloquial") => {
    if (!subject.trim() || !points.trim()) return;
    setAction(act);
    setGenerating(true);
    try {
      const prompt = generateNoticePrompt({ subject, audience, points, type: ntype, action: act, wordLimit: act === "condense" ? wordLimit : undefined });
      const content = await callAI(prompt);
      setResult(content);
      const id = generateId();
      saveItem({ id, title: `通知·${subject.slice(0, 20)}`, type: "通知", typeColor: "bg-orange-50 text-orange-600", content, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), favorited: false });
      setLastId(id);
    } catch {}
    setGenerating(false);
  };

  const handleFavorite = () => { if (!lastId) return; toggleFavorite(lastId); setFavorited(!favorited); };

  const handleCopy = async () => { if (!result) return; await navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); };

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
        <h1 className="text-xl font-semibold text-gray-900">通知助手</h1>
        <p className="text-gray-400 text-sm mt-1">填写信息，一键生成可复制发送的通知</p>
      </div>

      <div className="card p-5 mb-6 space-y-4">
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="通知主题（如：国庆放假安排）" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">通知对象</label>
            <select value={audience} onChange={(e) => setAudience(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {AUDIENCES.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">通知类型</label>
            <select value={ntype} onChange={(e) => setNtype(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <textarea value={points} onChange={(e) => setPoints(e.target.value)} placeholder="内容要点（时间、地点、事项、要求等）" className="w-full min-h-[80px] resize-none text-sm border border-gray-200 rounded-lg p-3 outline-none focus:border-indigo-400" />

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">字数限制：{wordLimit}字</span>
          <input type="range" min={20} max={150} value={wordLimit} onChange={(e) => setWordLimit(Number(e.target.value))} className="flex-1" />
        </div>

        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button onClick={() => handleAction("generate")} disabled={generating || !subject.trim()} className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2">
            <Sparkles className="w-4 h-4" />{generating && action === "generate" ? "生成中..." : "生成通知"}
          </button>
          <button onClick={() => handleAction("condense")} disabled={generating || !subject.trim()} className="btn-ghost flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-2">
            <Shrink className="w-4 h-4" />{generating && action === "condense" ? "压缩中..." : "压缩"}
          </button>
          <button onClick={() => handleAction("colloquial")} disabled={generating || !subject.trim()} className="btn-ghost flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-2">
            <MessageCircle className="w-4 h-4" />{generating && action === "colloquial" ? "转换中..." : "口语化"}
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
          <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{result}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
