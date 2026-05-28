"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Copy, Check } from "lucide-react";

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

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setGenerating(true);

    await new Promise((r) => setTimeout(r, 1500));

    const mockResult = `各位家长好：

根据学校统一安排，现将近期有关事项通知如下：

1. 时间安排：请各位家长注意查收具体时间安排。
2. 注意事项：请提醒孩子按时完成相关准备。
3. 温馨提示：如有特殊情况，请及时与老师联系。

感谢各位家长的支持与配合！

${selectedScenario === "holiday" ? "祝大家假期愉快！" : ""}
张老师
${new Date().toLocaleDateString("zh-CN")}`;

    setResult(mockResult);
    setGenerating(false);
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
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
        <h1 className="text-xl font-semibold text-gray-900">通知模板生成</h1>
        <p className="text-gray-400 text-sm mt-1">
          选择场景并填写关键信息，AI 生成得体的通知文字，可直接复制发送
        </p>
      </div>

      <div className="card p-5 mb-6 space-y-5">
        {/* Scenario */}
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

        {/* Details */}
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
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {result}
          </div>
        </div>
      )}
    </div>
  );
}
