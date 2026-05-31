"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { ArrowLeft, Sparkles, Copy, Check, Heart, Wand2 } from "lucide-react";
import { saveItem, toggleFavorite, generateId, getSavedItems } from "@/lib/storage";
import { callAI } from "@/lib/ai";
import { generateQuestionsPrompt, optimizePrompt } from "@/lib/prompts";
import { detectStage, getAvailableTypes, getModuleGroups, Stage, type ModuleGroup } from "@/lib/questionTypes";
import { getRegisteredTypes, isRuleRegistered } from "@/lib/questionRules";
import { parseOutputLite, type ParsedItemLite } from "@/lib/parser-browser";

/** 清除文本中的 TOKEN 标记 */
function stripTokens(text: string): string {
  const normalized = text.replace(/【/g, "[").replace(/】/g, "]");
  // 匹配 [[...]] 含中文、竖线等任意字符
  return normalized.replace(/\[\[[^\]]+\]\]/g, "");
}

/** 清除残余 markdown（保留 ## 标题 和 **答案与解析**） */
function stripMarkdown(text: string): string {
  return text
    .replace(/^## /gm, "§H2§")
    .replace(/\*\*答案与解析\*\*/g, "§A§")
    .replace(/\*\*全文翻译\*\*/g, "§T§")
    .replace(/\*{1,3}/g, "")
    .replace(/#/g, "")
    .replace(/`{1,3}/g, "")
    .replace(/§H2§/g, "## ")
    .replace(/§A§/g, "### 答案与解析")
    .replace(/§T§/g, "**全文翻译**");
}

/** 渲染答案区：统一格式 */
function renderResult(raw: string): string {
  const items = parseOutputLite(raw);

  // 无 TOKEN → 把整个答案区当纯文本，套上标题
  if (items.length === 0) {
    const ans = raw.split(/参考答案与解析|【参考答案|答案与解析/i)[1] || raw;
    const clean = stripMarkdown(stripTokens(ans)).trim();
    if (!clean) return "";
    // 尝试按空行切分，每题一段
    const blocks = clean.split(/\n{2,}/).filter(b => b.trim());
    const html = blocks.map((b, i) => {
      const lines = b.trim().split(/\n/);
      // 第一行当作考点，第二行答案，第三行解析（如果 AI 没按格式来至少有个兜底）
      const kp = lines[0] || "—";
      const ans = lines[1] || lines[0] || "—";
      const exp = lines.slice(2).join(" ") || "";
      return `<p style="margin-bottom:0.75rem;"><strong>考点：</strong>${kp}<br><strong>答案：</strong>${ans}${exp ? `<br><strong>解析：</strong>${exp}` : ""}</p>`;
    }).join("");
    return `<div class="mt-3"><strong>答案与解析</strong>${html}</div>`;
  }

  // 有 TOKEN → 精准渲染
  const html = items.map(item => {
    const kp = stripMarkdown(item.examPoint || "—");
    const ans = stripMarkdown(item.answer || "（未解析到答案）");
    const exp = stripMarkdown(item.analysis || "");
    return `<p style="margin-bottom:0.75rem;"><strong>考点：</strong>${kp}<br><strong>答案：</strong>${ans}${exp ? `<br><strong>解析：</strong>${exp}` : ""}</p>`;
  }).join("");
  return `<div class="mt-3"><strong>答案与解析</strong>${html}</div>`;
}

export default function GenerateQuestionsPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("语文");
  const [grade, setGrade] = useState("");
  const [topic, setTopic] = useState("");
  const [qtype, setQtype] = useState("");
  const [difficulty, setDifficulty] = useState("中等");
  const [count, setCount] = useState(1);
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
  const modules: ModuleGroup[] | null = stage ? getModuleGroups(stage, subject as any) : null;

  // 两级联动：模块 → 题型
  const [qmodule, setQmodule] = useState("");
  const currentModule = modules?.find(m => m.label === qmodule);
  const moduleTypes = currentModule?.types || [];
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
      const saved = saveItem({
        id,
        title: `${qtype || "练习题"}·${title}`,
        type: "试卷",
        typeColor: "bg-purple-50 text-purple-600",
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        favorited: false,
      });
      if (!saved.success) {
        setError((prev) => (prev ? prev + " " : "") + saved.error);
      }
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
    // markdown → 干净纯文本
    const clean = result
      .replace(/\[\[[^\]]+\]\]/g, "")
      .replace(/^### (.+)$/gm, "【$1】")
      .replace(/^## (.+)$/gm, "【$1】")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/^---$/gm, "————————————————")
      .replace(/`{1,3}/g, "");
    await navigator.clipboard.writeText(clean);
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
        const saved = saveItem({ ...existing, content: newResult, updatedAt: new Date().toISOString() });
        if (!saved.success) {
          setError(saved.error || "保存失败");
        }
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
            <input value={grade} onChange={(e) => { setGrade(e.target.value); setQmodule(""); setQtype(""); }} placeholder="如：七年级" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">科目</label>
            <select value={subject} onChange={(e) => { setSubject(e.target.value); setQmodule(""); setQtype(""); }} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400">
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
        {/* 第二行：模块 → 题型 两级联动 + 数量 */}
        <div className="grid grid-cols-3 gap-3">
          {/* 第一级：模块 */}
          {modules ? (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                模块 {stage && modules.length > 0 && <span className="text-gray-400">（{modules.length}个）</span>}
              </label>
              <select
                value={qmodule}
                onChange={(e) => { setQmodule(e.target.value); setQtype(""); }}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400"
                disabled={!stage}
              >
                <option value="">{stage ? "请选择模块" : "请先输入年级"}</option>
                {modules.map(m => (
                  <option key={m.label} value={m.label}>{m.label}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">题型</label>
              <select value={qtype} onChange={(e) => setQtype(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400" disabled={!stage}>
                <option value="">{stage ? "请选择题型" : "请先输入年级"}</option>
                {allTypes.map(t => {
                  const reg = registeredTypes.includes(t);
                  return (
                    <option key={t} value={t} disabled={!reg}>
                      {reg ? t : `${t}（暂未开放）`}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
          {/* 第二级：题型（仅模块模式显示） */}
          {modules && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                题型 {qmodule && <span className="text-gray-400">（{moduleTypes.length}种）</span>}
              </label>
              <select
                value={qtype}
                onChange={(e) => setQtype(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400"
                disabled={!qmodule}
              >
                <option value="">{qmodule ? "请选择题型" : "请先选择模块"}</option>
                {moduleTypes.map(t => {
                  const reg = registeredTypes.includes(t);
                  return (
                    <option key={t} value={t} disabled={!reg}>
                      {reg ? t : `${t}（暂未开放）`}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
          {/* 数量（始终显示） */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">题目数量（1-10道）</label>
            <input type="number" value={count} onChange={(e) => setCount(Math.min(10, Math.max(1, Number(e.target.value))))} min={1} max={10} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400" />
          </div>
        </div>
        {/* 未注册题型提示：仅当当前模块有未注册类型时显示 */}
        {modules && qmodule && moduleTypes.some(t => !registeredTypes.includes(t)) && (
          <p className="text-xs text-gray-400 mt-1">标注"暂未开放"的题型规则尚未完成</p>
        )}
        {/* 第三行：知识点（选填） */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">知识点 <span className="text-gray-300">（选填）</span></label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }} placeholder="如：搭配不当、分数加减法" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400" />
        </div>
        {qtype && !selectedTypeRegistered && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            ⚠️ 「{qtype}」规则尚未注册，将拒绝生成。请从下拉框中选择可用的题型。
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
            <ReactMarkdown
              remarkPlugins={[remarkBreaks]}
              components={{
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3">
                    <table className="min-w-full border-collapse border border-gray-200 text-sm">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
                th: ({ children }) => <th className="border border-gray-200 px-3 py-1.5 text-left font-medium text-gray-600">{children}</th>,
                td: ({ children }) => <td className="border border-gray-200 px-3 py-1.5">{children}</td>,
              }}
            >{stripMarkdown(stripTokens((result || "").replace(/={10,}/g, "---").replace(/【第[一二三四五六七八九十\d]+篇】/g, "")))}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
