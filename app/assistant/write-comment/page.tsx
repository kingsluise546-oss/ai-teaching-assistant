"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Copy, Check } from "lucide-react";

const keywords = [
  "学习认真", "思维活跃", "书写工整", "发言积极",
  "团结同学", "进步明显", "基础扎实", "善于思考",
  "态度端正", "兴趣浓厚",
];

export default function WriteCommentPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [tone, setTone] = useState<"kind" | "formal">("kind");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleKeyword = (kw: string) => {
    setSelectedKeywords((prev) =>
      prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw]
    );
  };

  const handleGenerate = async () => {
    if (!input.trim() || selectedKeywords.length === 0) return;
    setGenerating(true);

    await new Promise((r) => setTimeout(r, 2000));

    const mockResult = tone === "kind"
      ? `1. 你是一个学习认真的好孩子，课堂上总是积极发言，思维活跃。老师为你感到骄傲！希望你继续保持，争取更大进步。
2. 这学期你的书写工整了许多，作业质量明显提高。团结同学、乐于助人的品质也让大家都很喜欢你。
3. 你对学习有着浓厚的兴趣，善于思考问题。如果能更加细心一些，相信你会更出色！
4. 你态度端正，基础扎实，每一步都走得很稳。老师希望你能在课堂上更大胆地表达自己的想法。
5. 这学期你进步明显，从最初的羞涩到现在敢于在课堂上发言，老师看到了你的努力和成长！`
      : `1. 该生学习态度端正，课堂表现积极，思维活跃。作业完成质量良好，书写工整。希望继续保持。
2. 该生团结同学，乐于助人，在班级中起到了良好的榜样作用。学习上基础扎实，善于独立思考。
3. 该生本学期进步显著，学习兴趣浓厚，能够主动思考问题。建议在细节方面加以注意，争取更大提升。
4. 该生学习认真，态度端正，各科发展均衡。希望在课堂互动方面更加积极主动。
5. 该生表现良好，能够按时完成各项学习任务。建议在课后拓展阅读方面多下功夫，提升综合素养。`;

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
        <h1 className="text-xl font-semibold text-gray-900">评语助手</h1>
        <p className="text-gray-400 text-sm mt-1">
          导入学生名单并选择关键词，AI 生成个性化的期末评语
        </p>
      </div>

      <div className="card p-5 mb-6 space-y-5">
        {/* Name list */}
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

        {/* Keywords */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            选择特点（每人可勾选 1-3 个）
          </label>
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw) => (
              <button
                key={kw}
                onClick={() => toggleKeyword(kw)}
                disabled={generating}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  selectedKeywords.includes(kw)
                    ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {kw}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* Tone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            评语风格
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setTone("kind")}
              disabled={generating}
              className={`text-xs px-4 py-2 rounded-lg border transition-colors ${
                tone === "kind"
                  ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              亲切鼓励型
            </button>
            <button
              onClick={() => setTone("formal")}
              disabled={generating}
              className={`text-xs px-4 py-2 rounded-lg border transition-colors ${
                tone === "formal"
                  ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              正式严谨型
            </button>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-gray-100">
          <span className="text-xs text-gray-300">
            {input.split("\n").filter(Boolean).length} 名学生 · {selectedKeywords.length} 个特点
          </span>
          <button
            onClick={handleGenerate}
            disabled={generating || !input.trim() || selectedKeywords.length === 0}
            className={`btn-primary flex items-center gap-2 text-sm ${
              generating || !input.trim() || selectedKeywords.length === 0
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
