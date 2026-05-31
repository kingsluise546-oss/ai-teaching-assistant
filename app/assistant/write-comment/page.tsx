"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Sparkles, Copy, Check, Heart } from "lucide-react";
import { saveItem, toggleFavorite, generateId, getSavedItems } from "@/lib/storage";
import { callAI } from "@/lib/ai";
import { writeCommentPrompt } from "@/lib/prompts";

const PROFILES = ["优秀型", "进步型", "潜力型", "内向型", "活跃型", "待提升型"];
const GRADES = ["小学", "初中", "高中"];
const STYLES = ["鼓励型", "正式型", "温暖型", "班主任型"];

export default function WriteCommentPage() {
  const router = useRouter();
  const [grade, setGrade] = useState("初中");
  const [profiles, setProfiles] = useState<string[]>(["进步型"]);
  const [wordLimit, setWordLimit] = useState(100);
  const [style, setStyle] = useState("鼓励型");
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [previousComments, setPreviousComments] = useState<string[]>([]);
  const [remark, setRemark] = useState("");

  // 互斥画像对：不同时分配给同一人
  const INCOMPATIBLE: Record<string, string> = { "内向型": "活跃型", "活跃型": "内向型", "优秀型": "待提升型", "待提升型": "优秀型" };
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  // 从备注中检测「所有都加X型」指令
  const forceProfile = useMemo(() => {
    const m = remark.match(/所有\S*都?\s*[加添]?[上入]?\s*(.{2,3}型)/);
    return m ? m[1] : null;
  }, [remark]);

  const assignmentPreview = useMemo(() => {
    if (profiles.length === 0) return [];
    return Array.from({ length: count }, (_, i) => {
      const name = `小${letters[i % 26]}${i >= 26 ? Math.floor(i / 26) : ""}`;
      const n = 1 + Math.floor(Math.random() * Math.min(2, profiles.length));
      const shuffled = [...profiles].sort(() => Math.random() - 0.5);
      const assigned: string[] = [];
      // 备注强制型优先加入
      if (forceProfile && profiles.includes(forceProfile) && !assigned.some(a => INCOMPATIBLE[a] === forceProfile)) {
        assigned.push(forceProfile);
      }
      for (const p of shuffled) {
        if (assigned.length >= n + (forceProfile ? 1 : 0)) break;
        if (!assigned.some(a => INCOMPATIBLE[a] === p) && p !== forceProfile) assigned.push(p);
      }
      if (assigned.length === 0) assigned.push(shuffled[0]);
      return `${name}（${assigned.join("+")}）`;
    });
  }, [count, profiles, forceProfile]);

  const toggleProfile = (p: string) => {
    setProfiles((prev) => prev.includes(p) ? prev.filter((k) => k !== p) : [...prev, p]);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const prompt = writeCommentPrompt({ names: assignmentPreview.join("\n"), grade, profiles, length: `${wordLimit}字以内`, style, previous: previousComments, remark });
      const content = await callAI(prompt);
      setResult(content);
      setPreviousComments((prev) => [...prev, content]);
      const id = generateId();
      saveItem({ id, title: `评语·${count}人·${grade}`, type: "评语", typeColor: "bg-green-50 text-green-600", content, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), favorited: false });
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
    await navigator.clipboard.writeText((result || "").replace(/\*+/g, "").replace(/^#{1,6}\s?/gm, "").replace(/`/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          自动生成化名（小A、小B…），无需导入真实名单
        </p>
      </div>

      <div className="card p-5 mb-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">评语数量</label>
            <input type="number" value={count} onChange={(e) => setCount(Math.min(50, Math.max(1, Number(e.target.value) || 1)))} min={1} max={50} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">年级</label>
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">评语长度</label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">30</span>
              <input type="range" min={30} max={200} step={10} value={wordLimit} onChange={(e) => setWordLimit(Number(e.target.value))} className="flex-1" />
              <span className="text-xs text-gray-500">{wordLimit}字</span>
            </div>
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

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">备注 <span className="text-gray-300">（选填）</span></label>
          <input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="如：关注数学进步、这学期换了班主任..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400" />
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-gray-100">
          <span className="text-xs text-gray-300">
            {profiles.length > 0 ? assignmentPreview.slice(0, 3).join(" · ") + (count > 3 ? ` …等${count}人` : "") : `请先勾选画像`}
            {previousComments.length > 0 ? ` | 已生成${previousComments.length}批` : ""}
          </span>
          <button
            onClick={handleGenerate}
            disabled={generating || profiles.length === 0}
            className={`btn-primary flex items-center gap-2 text-sm ${
              generating || profiles.length === 0
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
          <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: (result || "").replace(/\*+/g, "").replace(/^#{1,6}\s?/gm, "").replace(/`/g, "").replace(/^(好的|以下是|为您|根据要求|按照您)[\s\S]*?\n---\n?/gm, "").replace(/\n/g, "<br/>") }} />
        </div>
      )}
    </div>
  );
}
